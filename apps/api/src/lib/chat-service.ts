import { randomUUID } from "crypto";
import { openai, chatTools, executeTool, buildSystemPrompt, type ChatProduct } from "./openai";
import prisma from "./prisma";

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface ChatStreamEvent {
  type: "text" | "products" | "comparison" | "suggestions" | "done" | "error";
  data: unknown;
}

interface Conversation {
  messages: ChatMessage[];
  lastActivity: number;
  userName?: string | null;
}

const conversations = new Map<string, Conversation>();
const CONVERSATION_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY = 30;

function getConversation(id: string): Conversation | undefined {
  const conv = conversations.get(id);
  if (!conv) return undefined;
  if (Date.now() - conv.lastActivity > CONVERSATION_TTL) {
    conversations.delete(id);
    return undefined;
  }
  conv.lastActivity = Date.now();
  return conv;
}

function createConversation(userName?: string | null): Conversation {
  const conv: Conversation = {
    messages: [],
    lastActivity: Date.now(),
    userName,
  };
  return conv;
}

function cleanupOldConversations() {
  const now = Date.now();
  for (const [id, conv] of conversations) {
    if (now - conv.lastActivity > CONVERSATION_TTL) {
      conversations.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldConversations, 5 * 60 * 1000);

function extractProductRefs(text: string): string[] {
  const refs: string[] = [];
  const slugPattern = /\/product\/([a-z0-9-]+)/g;
  let match;
  while ((match = slugPattern.exec(text)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

export async function* streamChat(
  userMessage: string,
  conversationId?: string,
  userId?: string,
  userName?: string | null
): AsyncGenerator<ChatStreamEvent> {
  const id = conversationId || randomUUID();
  let conversation = getConversation(id);

  if (!conversation) {
    conversation = createConversation(userName);
    conversations.set(id, conversation);
  }

  // Fetch categories for system prompt
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const categoryNames = categories.map((c) => c.name);

  // Add user message
  conversation.messages.push({ role: "user", content: userMessage });
  if (conversation.messages.length > MAX_HISTORY) {
    conversation.messages = conversation.messages.slice(-MAX_HISTORY);
  }

  const systemPrompt = buildSystemPrompt(categoryNames, userName);

  // Build messages for API
  const apiMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversation.messages,
  ];

  let collectedText = "";
  const allProducts: ChatProduct[] = [];
  let comparisonData: unknown = null;
  let maxToolRounds = 5;

  // Tool-calling loop
  while (maxToolRounds > 0) {
    maxToolRounds--;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages as OpenAI.ChatCompletionMessageParam[],
      tools: chatTools,
      stream: true,
      temperature: 0.7,
      max_tokens: 800,
    });

    let hasToolCalls = false;
    const toolCalls = new Map<
      string,
      { name: string; arguments: string }
    >();
    let currentContent = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // Handle text content
      if (delta.content) {
        currentContent += delta.content;
        collectedText += delta.content;
        yield { type: "text", data: delta.content };
      }

      // Handle tool calls
      if (delta.tool_calls) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          if (tc.index === undefined) continue;
          const key = `tc_${tc.index}`;
          if (!toolCalls.has(key)) {
            toolCalls.set(key, {
              name: tc.function?.name || "",
              arguments: "",
            });
          }
          const existing = toolCalls.get(key)!;
          if (tc.function?.name) existing.name = tc.function.name;
          if (tc.function?.arguments) existing.arguments += tc.function.arguments;
        }
      }
    }

    if (hasToolCalls && toolCalls.size > 0) {
      // Execute tool calls
      const toolResults: ChatMessage[] = [];

      for (const [, tc] of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.arguments);
        } catch {
          // malformed args
        }

        const result = await executeTool(tc.name, args);

        // Collect products from search results
        if (tc.name === "search_products" && Array.isArray(result)) {
          for (const p of result) {
            allProducts.push(p as ChatProduct);
          }
        }

        // Collect comparison data
        if (tc.name === "compare_products" && Array.isArray(result)) {
          comparisonData = result;
          for (const p of result) {
            allProducts.push(p as ChatProduct);
          }
        }

        // Collect product details
        if (tc.name === "get_product_details" && result && typeof result === "object" && "id" in result) {
          allProducts.push(result as ChatProduct);
        }

        // Collect deals
        if (tc.name === "get_deals" && Array.isArray(result)) {
          for (const p of result) {
            allProducts.push(p as ChatProduct);
          }
        }

        toolResults.push({
          role: "tool" as const,
          content: JSON.stringify(result),
          tool_call_id: randomUUID(),
        });
      }

      // Build assistant message with tool calls
      const assistantToolMsg: ChatMessage = {
        role: "assistant",
        content: currentContent || null,
        tool_calls: Array.from(toolCalls.entries()).map(([, tc], i) => ({
          id: `call_${i}_${randomUUID()}`,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      };

      apiMessages.push(assistantToolMsg);
      for (const tr of toolResults) {
        apiMessages.push(tr);
      }

      // Continue loop for final response
    } else {
      // No tool calls — this is the final text response
      if (currentContent) {
        conversation.messages.push({
          role: "assistant",
          content: currentContent,
        });
      }
      break;
    }
  }

  // Deduplicate products by id
  const seen = new Set<string>();
  const uniqueProducts = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Yield products if any
  if (uniqueProducts.length > 0) {
    yield { type: "products", data: uniqueProducts };
  }

  // Yield comparison if any
  if (comparisonData) {
    yield { type: "comparison", data: comparisonData };
  }

  // Generate follow-up suggestions based on context
  const suggestions = generateSuggestions(userMessage, uniqueProducts);
  if (suggestions.length > 0) {
    yield { type: "suggestions", data: suggestions };
  }

  yield { type: "done", data: { conversationId: id } };
}

function generateSuggestions(
  userMessage: string,
  products: ChatProduct[]
): string[] {
  const lower = userMessage.toLowerCase();
  const suggestions: string[] = [];

  if (products.length > 0) {
    const firstProduct = products[0];
    if (!lower.includes("compare")) {
      suggestions.push(`Compare ${products.length > 1 ? "these products" : firstProduct.name}`);
    }
    if (!lower.includes("price")) {
      suggestions.push("Show me cheaper alternatives");
    }
    if (!lower.includes("review")) {
      suggestions.push("What are the reviews?");
    }
  }

  if (lower.includes("headphone") || lower.includes("earphone") || lower.includes("speaker")) {
    suggestions.push("Show me audio accessories");
  }

  if (lower.includes("laptop") || lower.includes("computer")) {
    suggestions.push("Show me laptop accessories");
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Show me today's deals",
      "What's trending?",
      "Help me find a gift"
    );
  }

  return suggestions.slice(0, 4);
}

export function createConversationId(): string {
  return randomUUID();
}
