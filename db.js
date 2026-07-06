const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "store.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

function toProduct(row) {
  if (!row) return null;
  const description = row.description || "";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description,
    shortDescription:
      description.length > 126
        ? `${description.slice(0, 123)}...`
        : description,
    price: Number(row.price),
    compareAtPrice: Number(row.compare_at_price),
    imageUrl: row.image_url,
    badge: row.badge,
    rating: Number(row.rating),
    stock: row.stock,
    featured: Boolean(row.featured),
    createdAt: row.created_at,
  };
}

const heroSeedProducts = [
  {
    slug: "aurora-headphones",
    name: "Aurora Headphones",
    category: "Audio",
    description:
      "High-fidelity wireless headphones with adaptive noise cancellation, deep bass tuning, and a 42-hour battery.",
    price: 249,
    compareAtPrice: 329,
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    badge: "Best seller",
    rating: 4.9,
    stock: 22,
    featured: 1,
  },
  {
    slug: "halo-smartwatch",
    name: "Halo Smartwatch",
    category: "Wearables",
    description:
      "A polished smartwatch with sleep tracking, gesture controls, and a premium ceramic frame.",
    price: 189,
    compareAtPrice: 239,
    imageUrl:
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80",
    badge: "New arrival",
    rating: 4.8,
    stock: 18,
    featured: 1,
  },
  {
    slug: "eclipse-speaker",
    name: "Eclipse Speaker",
    category: "Audio",
    description:
      "Compact room-filling speaker engineered for cinematic clarity and rich spatial tone.",
    price: 159,
    compareAtPrice: 199,
    imageUrl:
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
    badge: "Studio grade",
    rating: 4.7,
    stock: 11,
    featured: 0,
  },
  {
    slug: "luna-desk-lamp",
    name: "Luna Desk Lamp",
    category: "Home",
    description:
      "Warm ambient lighting with touch dimming and a sculptural aluminum silhouette.",
    price: 99,
    compareAtPrice: 139,
    imageUrl:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    badge: "Editor pick",
    rating: 4.9,
    stock: 34,
    featured: 1,
  },
  {
    slug: "drift-chair",
    name: "Drift Chair",
    category: "Work",
    description:
      "An ergonomic office chair with breathable mesh, lumbar support, and a floating-profile base.",
    price: 399,
    compareAtPrice: 499,
    imageUrl:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    badge: "Ergonomic",
    rating: 4.8,
    stock: 8,
    featured: 1,
  },
  {
    slug: "nimbus-camera",
    name: "Nimbus Camera",
    category: "Work",
    description:
      "A compact mirrorless camera built for creators who need speed, color depth, and clean low-light shots.",
    price: 799,
    compareAtPrice: 949,
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    badge: "Pro toolkit",
    rating: 4.9,
    stock: 6,
    featured: 1,
  },
  {
    slug: "velvet-cushion-set",
    name: "Velvet Cushion Set",
    category: "Home",
    description:
      "A tactile two-piece cushion set that adds a soft, luxurious finish to living spaces.",
    price: 74,
    compareAtPrice: 109,
    imageUrl:
      "https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=1200&q=80",
    badge: "Soft touch",
    rating: 4.6,
    stock: 27,
    featured: 0,
  },
  {
    slug: "midnight-backpack",
    name: "Midnight Backpack",
    category: "Wearables",
    description:
      "A travel-ready backpack with hidden pockets, weather resistance, and a refined matte finish.",
    price: 129,
    compareAtPrice: 169,
    imageUrl:
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80",
    badge: "Travel ready",
    rating: 4.7,
    stock: 15,
    featured: 0,
  },
];

const catalogBlueprints = [
  {
    category: "Audio",
    basePrice: 129,
    families: ["Headphones", "Earbuds", "Speaker", "Soundbar", "Turntable"],
    imageUrls: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1518441902117-f0a22c73f9af?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "sound",
    benefit: "spatial clarity",
  },
  {
    category: "Wearables",
    basePrice: 99,
    families: ["Smartwatch", "Fitness Band", "Travel Pack", "Sunglasses", "Wallet"],
    imageUrls: [
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "mobility",
    benefit: "everyday performance",
  },
  {
    category: "Home",
    basePrice: 59,
    families: ["Lamp", "Diffuser", "Mirror", "Throw", "Cushion"],
    imageUrls: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "comfort",
    benefit: "refined interiors",
  },
  {
    category: "Work",
    basePrice: 179,
    families: ["Keyboard", "Mouse", "Monitor", "Dock", "Webcam"],
    imageUrls: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "productivity",
    benefit: "precision workflows",
  },
  {
    category: "Travel",
    basePrice: 79,
    families: ["Carry-on", "Backpack", "Case", "Pouch", "Organizer"],
    imageUrls: [
      "https://images.unsplash.com/photo-1523413459650-dff26d65d2a9?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764b1c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "journeys",
    benefit: "smart packing",
  },
  {
    category: "Kitchen",
    basePrice: 69,
    families: ["Blender", "Kettle", "Knife Set", "Cookware", "Scale"],
    imageUrls: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "craft",
    benefit: "reliable prep",
  },
  {
    category: "Beauty",
    basePrice: 39,
    families: ["Serum", "Mirror", "Brush Set", "Organizer", "Spa Kit"],
    imageUrls: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "self-care",
    benefit: "luxury rituals",
  },
  {
    category: "Gaming",
    basePrice: 149,
    families: ["Controller", "Headset", "Keyboard", "Mouse", "Chair"],
    imageUrls: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "play",
    benefit: "competitive response",
  },
  {
    category: "Outdoors",
    basePrice: 89,
    families: ["Jacket", "Bottle", "Lantern", "Pack", "Blanket"],
    imageUrls: [
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516715094483-75da7dee9758?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "exploration",
    benefit: "weather readiness",
  },
  {
    category: "Office",
    basePrice: 159,
    families: ["Chair", "Desk", "Lamp", "Planner", "Station"],
    imageUrls: [
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    ],
    accent: "focus",
    benefit: "premium routines",
  },
];

const variantNames = [
  "Aero",
  "Amber",
  "Atlas",
  "Aura",
  "Breeze",
  "Cinder",
  "Dawn",
  "Drift",
  "Echo",
  "Edge",
  "Glow",
  "Halo",
  "Haven",
  "Ion",
  "Luxe",
  "Lunar",
  "Nova",
  "Orbit",
  "Pulse",
  "Quartz",
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  return String(value)
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCatalogProducts(targetCount = 500) {
  const products = heroSeedProducts.map((product) => ({ ...product }));
  let generatedIndex = 0;

  while (products.length < targetCount) {
    const blueprint = catalogBlueprints[generatedIndex % catalogBlueprints.length];
    const familyIndex = Math.floor(generatedIndex / catalogBlueprints.length) % blueprint.families.length;
    const variantIndex = Math.floor(
      generatedIndex /
        (catalogBlueprints.length * blueprint.families.length),
    ) % variantNames.length;

    const family = blueprint.families[familyIndex];
    const variant = variantNames[variantIndex];
    const categoryToken = titleCase(blueprint.category);
    const name = `${variant} ${family}`;
    const slug = `${slugify(blueprint.category)}-${slugify(name)}-${String(products.length + 1).padStart(3, "0")}`;
    const imageUrl = blueprint.imageUrls[(generatedIndex + familyIndex) % blueprint.imageUrls.length];
    const basePrice = blueprint.basePrice + (familyIndex * 8) + (variantIndex * 5);
    const price = Math.round(basePrice + (generatedIndex % 4) * 9 + (familyIndex % 3) * 7);
    const compareAtPrice = Math.round(price * 1.24);
    const rating = Number((4.4 + ((generatedIndex % 9) * 0.07)).toFixed(1));
    const stock = 8 + ((generatedIndex * 7) % 42);

    products.push({
      slug,
      name,
      category: blueprint.category,
      description: `A ${variant.toLowerCase()} ${family.toLowerCase()} built for ${blueprint.benefit}. It blends ${blueprint.accent} and ${categoryToken.toLowerCase()} performance for a premium everyday experience.`,
      price,
      compareAtPrice,
      imageUrl,
      badge: `${categoryToken} premium`,
      rating,
      stock,
      featured: products.length < 18 || generatedIndex % 11 === 0 ? 1 : 0,
    });

    generatedIndex += 1;
  }

  return products;
}

async function initDatabase() {
  await exec("PRAGMA foreign_keys = ON;");

  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      compare_at_price REAL NOT NULL,
      image_url TEXT NOT NULL,
      badge TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 5,
      stock INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      phone TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping_fee REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'placed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  const productCount = await get("SELECT COUNT(*) AS count FROM products");
  if ((productCount?.count || 0) < 500) {
    const insertStatement = `
      INSERT OR IGNORE INTO products (slug, name, category, description, price, compare_at_price, image_url, badge, rating, stock, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const product of buildCatalogProducts(500)) {
      await run(insertStatement, [
        product.slug,
        product.name,
        product.category,
        product.description,
        product.price,
        product.compareAtPrice,
        product.imageUrl,
        product.badge,
        product.rating,
        product.stock,
        product.featured,
      ]);
    }
  }
}

async function listProducts() {
  const rows = await all(
    "SELECT * FROM products ORDER BY featured DESC, id ASC",
  );
  return rows.map(toProduct);
}

async function listFeaturedProducts() {
  const rows = await all(
    "SELECT * FROM products WHERE featured = 1 ORDER BY id ASC LIMIT 4",
  );
  return rows.map(toProduct);
}

async function searchProducts(query) {
  const pattern = `%${String(query).trim()}%`;
  const rows = await all(
    "SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR description LIKE ? ORDER BY featured DESC, name ASC",
    [pattern, pattern, pattern],
  );
  return rows.map(toProduct);
}

async function getProductById(id) {
  const row = await get("SELECT * FROM products WHERE id = ?", [id]);
  return toProduct(row);
}

async function getProductBySlug(slug) {
  const row = await get("SELECT * FROM products WHERE slug = ?", [slug]);
  return toProduct(row);
}

async function findUserByEmail(email) {
  const row = await get("SELECT * FROM users WHERE lower(email) = lower(?)", [
    email,
  ]);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    verifyPassword(password) {
      return bcrypt.compare(password, row.password_hash);
    },
  };
}

async function getUserById(id) {
  const row = await get(
    "SELECT id, name, email, created_at FROM users WHERE id = ?",
    [id],
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await run(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [name.trim(), email.trim().toLowerCase(), passwordHash],
  );
  return getUserById(result.id);
}

async function createOrder({
  userId,
  items,
  customerName,
  shippingAddress,
  phone,
  email,
}) {
  if (!items.length) {
    throw new Error("No items in order.");
  }

  await exec("BEGIN IMMEDIATE TRANSACTION");

  try {
    const normalizedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await getProductById(item.id);
      if (!product) {
        throw new Error(`Product ${item.id} not found.`);
      }

      const quantity = Number(item.quantity) || 0;
      if (quantity < 1) {
        throw new Error("Invalid item quantity.");
      }

      if (product.stock < quantity) {
        throw new Error(`Only ${product.stock} ${product.name} left in stock.`);
      }

      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      normalizedItems.push({ product, quantity, lineTotal });
    }

    const shippingFee = subtotal > 150 ? 0 : 15;
    const total = subtotal + shippingFee;

    const orderResult = await run(
      `INSERT INTO orders (user_id, customer_name, customer_email, shipping_address, phone, subtotal, shipping_fee, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        customerName.trim(),
        email.trim().toLowerCase(),
        shippingAddress.trim(),
        phone.trim(),
        subtotal,
        shippingFee,
        total,
      ],
    );

    for (const item of normalizedItems) {
      await run(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderResult.id,
          item.product.id,
          item.product.name,
          item.product.price,
          item.quantity,
          item.lineTotal,
        ],
      );

      await run("UPDATE products SET stock = stock - ? WHERE id = ?", [
        item.quantity,
        item.product.id,
      ]);
    }

    await exec("COMMIT");

    return {
      id: orderResult.id,
      subtotal,
      shippingFee,
      total,
      status: "placed",
    };
  } catch (error) {
    await exec("ROLLBACK");
    throw error;
  }
}

async function listOrdersForUser(userId) {
  const orders = await all(
    "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC",
    [userId],
  );
  const payload = [];

  for (const order of orders) {
    const items = await all(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
      [order.id],
    );
    payload.push({
      id: order.id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      shippingAddress: order.shipping_address,
      phone: order.phone,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shipping_fee),
      total: Number(order.total),
      status: order.status,
      createdAt: order.created_at,
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        unitPrice: Number(item.unit_price),
        quantity: item.quantity,
        lineTotal: Number(item.line_total),
      })),
    });
  }

  return payload;
}

module.exports = {
  initDatabase,
  listProducts,
  listFeaturedProducts,
  searchProducts,
  getProductById,
  getProductBySlug,
  findUserByEmail,
  createUser,
  getUserById,
  createOrder,
  listOrdersForUser,
};
