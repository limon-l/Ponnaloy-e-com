const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { listProducts } = require("../db");

const router = Router();

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreProduct(product, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;
  const haystack = normalizeText(
    `${product.name} ${product.category} ${product.badge} ${product.description}`,
  );
  const tokens = normalizedQuery.split(" ");
  let score = 0;
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (haystack.includes(token)) score += 2;
  }
  if (haystack.includes(normalizedQuery)) score += 6;
  return score;
}

function findTopProducts(products, query, limit = 3) {
  return [...products]
    .map((p) => ({ product: p, score: scoreProduct(p, query) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating)
    .slice(0, limit)
    .map((e) => e.product);
}

function findProductMention(message, products) {
  const normalizedMessage = normalizeText(message);
  let bestMatch = null;
  let bestScore = 0;
  for (const product of products) {
    const normalizedName = normalizeText(product.name);
    if (!normalizedName) continue;
    if (normalizedMessage.includes(normalizedName) && normalizedName.length > bestScore) {
      bestMatch = product;
      bestScore = normalizedName.length;
    }
  }
  return bestMatch;
}

function compareProducts(left, right) {
  const winner = left.rating > right.rating
    ? left : right.rating > left.rating
    ? right : left.price < right.price ? left : right;
  const fmt = (v) => v.toLocaleString("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  });
  return {
    summary: `${left.name} has a ${left.rating.toFixed(1)} rating at ${fmt(left.price)}. ${right.name} has a ${right.rating.toFixed(1)} rating at ${fmt(right.price)}. Based on these metrics, ${winner.name} is the stronger option.`,
    points: [
      `${left.name} — ${left.category}, ${left.rating.toFixed(1)} stars, ${left.stock} in stock, ${fmt(left.price)}`,
      `${right.name} — ${right.category}, ${right.rating.toFixed(1)} stars, ${right.stock} in stock, ${fmt(right.price)}`,
      `Recommended: ${winner.name}`,
    ],
  };
}

function buildStoreFacts(products) {
  const categories = [...new Set(products.map((p) => p.category))];
  const topRated = [...products].sort((a, b) => b.rating - a.rating || a.price - b.price).slice(0, 4);
  const bestValue = [...products].sort((a, b) => a.price - b.price || b.rating - a.rating).slice(0, 4);
  return { productCount: products.length, categoryCount: categories.length, categories, topRated, bestValue };
}

function buildAssistantReply(message, matches, products) {
  const compareMode = /\b(compare|versus|vs|difference|better|which is better)\b/.test(message);
  const helpMode = /\b(help|about|store|site|catalog|checkout|shipping|delivery|return|policy|how do i)\b/.test(message);
  const greetingMode = /\b(hi|hello|hey|thanks|thank you)\b/.test(message);
  const recommendationMode = /\b(recommend|suggest|pick|best|top|good for|for work|for travel|for home)\b/.test(message);
  const explicitMention = findProductMention(message, products);
  const primaryQuery = message.split(/\bcompare\b|\bversus\b|\bvs\b/i)[0].trim();
  const primaryMatches = primaryQuery
    ? findTopProducts(products.filter((p) => p.id !== explicitMention?.id), primaryQuery, 3)
    : matches;

  if (compareMode) {
    const left = primaryMatches[0] || explicitMention || matches[0] || products[0];
    const right = primaryMatches.find((p) => p.id !== left?.id)
      || matches.find((p) => p.id !== left?.id)
      || products.find((p) => p.id !== left?.id);
    if (left && right) {
      const comparison = compareProducts(left, right);
      return {
        reply: comparison.summary, tone: "comparison", focusCategory: left.category,
        followUp: 'You can compare another pair or ask for a recommendation by use case.',
        comparison,
      };
    }
  }

  if (recommendationMode && matches.length > 0) {
    const hero = explicitMention || matches[0];
    const secondary = matches.find((p) => p.id !== hero.id) || matches[1];
    const fmt = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    return {
      reply: `${hero.name} is the strongest match for this request. It has a ${hero.rating.toFixed(1)} rating, ${hero.stock} units in stock, and is priced at ${fmt(hero.price)}.`,
      tone: "recommendation", focusCategory: hero.category,
      followUp: secondary
        ? `An alternative is ${secondary.name} (${secondary.rating.toFixed(1)} stars, ${fmt(secondary.price)}).`
        : "Specify your budget or use case for a more targeted recommendation.",
      comparison: null,
    };
  }

  if (matches.length > 0) {
    const [topMatch] = matches;
    const fmt = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    return {
      reply: `${topMatch.name} is available in ${topMatch.category.toLowerCase()} at ${fmt(topMatch.price)}. It has a ${topMatch.rating.toFixed(1)} rating with ${topMatch.stock} units in stock.`,
      tone: "product", focusCategory: topMatch.category,
      followUp: "Ask for a comparison or a similar product at a different price point.",
      comparison: null,
    };
  }

  if (greetingMode || helpMode) {
    return {
      reply: `Ponnaloy carries ${products.length} products across multiple categories with search, cart checkout, and product comparison tools.`,
      tone: "platform", focusCategory: "Store overview",
      followUp: 'You can ask about products, compare items, or request recommendations.',
      comparison: null,
    };
  }

  return {
    reply: 'No products matched your query. Try a specific product name, category, or use "compare" to see differences between two products.',
    tone: "fallback", focusCategory: "Catalog",
    followUp: "You can also ask for recommendations by use case — work, travel, home, or audio.",
    comparison: null,
  };
}

router.post("/", asyncHandler(async (req, res) => {
  const rawMessage = (req.body?.message || "").trim();
  if (!rawMessage) return res.status(400).json({ message: "A message is required." });

  const products = await listProducts();
  const normalizedMessage = normalizeText(rawMessage);
  const matches = findTopProducts(products, normalizedMessage, 6);
  const storeFacts = buildStoreFacts(products);
  const mention = findProductMention(rawMessage, products);

  const env = require("../config/env");

  if (!env.openaiApiKey) {
    const assistant = buildAssistantReply(normalizedMessage, matches, products);
    return res.json({
      reply: assistant.reply, tone: assistant.tone, focusCategory: assistant.focusCategory,
      followUp: assistant.followUp,
      storeFacts: {
        productCount: storeFacts.productCount, categoryCount: storeFacts.categoryCount,
        categories: storeFacts.categories,
      },
      highlights: storeFacts.topRated.slice(0, 3),
      valuePicks: storeFacts.bestValue.slice(0, 3),
      matches: matches.length > 0 ? matches : storeFacts.topRated.slice(0, 4),
      comparison: assistant.comparison,
    });
  }

  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: env.openaiApiKey });

  if (!req.session.chatHistory) req.session.chatHistory = [];
  req.session.chatHistory.push({ role: "user", content: rawMessage });
  if (req.session.chatHistory.length > 20) req.session.chatHistory = req.session.chatHistory.slice(-20);

  const topProducts = matches.length >= 3
    ? matches
    : [...matches, ...storeFacts.topRated.filter((p) => !matches.find((m) => m.id === p.id))].slice(0, 6);

  const productCatalog = topProducts.map((p) =>
    `- ${p.name} (id:${p.id}) | category: ${p.category} | price: $${p.price} | rating: ${p.rating}/5 | stock: ${p.stock} | badge: ${p.badge || "none"} | features: ${p.shortDescription}`
  ).join("\n");

  const categoriesList = storeFacts.categories.join(", ");

  const systemPrompt = `You are Marvin, a friendly and knowledgeable shopping assistant for Ponnaloy, an e-commerce store.

Store overview:
- ${storeFacts.productCount} products across categories: ${categoriesList}
- Current user message: "${rawMessage}"

Relevant products in the catalog:
${productCatalog}

Guidelines:
- Be conversational, warm, and helpful. Use natural language.
- If the user greets you, greet them back warmly as Marvin.
- When recommending products, mention specific product names and key details (price, rating).
- If the user asks about a product, category, or use case, suggest the most relevant products from the list above.
- If asked to compare, explain the differences between products clearly.
- Keep replies concise (2-4 sentences usually), but thorough enough to be helpful.
- Never mention that you are an AI or language model. You are Marvin, the store's shopping assistant.
- If you cannot find a matching product, suggest browsing by category or ask what they're looking for.
- Always end with a brief follow-up question to keep the conversation going.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...req.session.chatHistory],
      max_tokens: 400,
      temperature: 0.7,
    });
    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";
    req.session.chatHistory.push({ role: "assistant", content: reply });
    if (req.session.chatHistory.length > 20) req.session.chatHistory = req.session.chatHistory.slice(-20);
    const tone = mention
      ? "product"
      : /\b(compare|versus|vs|difference)\b/i.test(rawMessage)
        ? "comparison"
        : /\b(recommend|suggest|best|top|good for)\b/i.test(rawMessage)
          ? "recommendation"
          : /\b(hi|hello|hey|thanks)\b/i.test(rawMessage)
            ? "greeting"
            : "product";
    return res.json({
      reply, tone, focusCategory: mention?.category || (matches[0]?.category ?? "General"),
      followUp: "Is there anything else you'd like to know?",
      storeFacts: {
        productCount: storeFacts.productCount, categoryCount: storeFacts.categoryCount,
        categories: storeFacts.categories,
      },
      highlights: storeFacts.topRated.slice(0, 3),
      valuePicks: storeFacts.bestValue.slice(0, 3),
      matches: matches.length > 0 ? matches : storeFacts.topRated.slice(0, 4),
      comparison: null,
    });
  } catch (error) {
    console.error("OpenAI chat error:", error);
    return res.status(500).json({ message: "The assistant is unavailable right now. Please try again." });
  }
}));

module.exports = router;
