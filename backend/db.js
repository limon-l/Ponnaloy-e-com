const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "..", "data");
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
    description: "High-fidelity wireless headphones with adaptive noise cancellation, deep bass tuning, and a 42-hour battery life. Perfect for long flights and focused work sessions.",
    price: 249,
    compareAtPrice: 329,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    badge: "Best seller",
    rating: 4.9,
    stock: 22,
    featured: 1,
  },
  {
    slug: "halo-smartwatch",
    name: "Halo Smartwatch",
    category: "Wearables",
    description: "A polished smartwatch with sleep tracking, gesture controls, and a premium ceramic frame. Tracks heart rate, SpO2, and daily activity goals.",
    price: 189,
    compareAtPrice: 239,
    imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80",
    badge: "New arrival",
    rating: 4.8,
    stock: 18,
    featured: 1,
  },
  {
    slug: "eclipse-speaker",
    name: "Eclipse Speaker",
    category: "Audio",
    description: "Compact room-filling speaker engineered for cinematic clarity and rich spatial tone. IPX7 waterproof with 18-hour battery.",
    price: 159,
    compareAtPrice: 199,
    imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
    badge: "Studio grade",
    rating: 4.7,
    stock: 11,
    featured: 0,
  },
  {
    slug: "luna-desk-lamp",
    name: "Luna Desk Lamp",
    category: "Home",
    description: "Warm ambient lighting with touch dimming and a sculptural aluminum silhouette. Features wireless charging base and 5 color temperatures.",
    price: 99,
    compareAtPrice: 139,
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    badge: "Editor pick",
    rating: 4.9,
    stock: 34,
    featured: 1,
  },
  {
    slug: "drift-chair",
    name: "Drift Chair",
    category: "Work",
    description: "An ergonomic office chair with breathable mesh, lumbar support, and a floating-profile base. Adjustable armrests and seat depth for all-day comfort.",
    price: 399,
    compareAtPrice: 499,
    imageUrl: "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=1200&q=80",
    badge: "Ergonomic",
    rating: 4.8,
    stock: 8,
    featured: 1,
  },
  {
    slug: "nimbus-camera",
    name: "Nimbus Camera",
    category: "Work",
    description: "A compact mirrorless camera built for creators who need speed, color depth, and clean low-light shots. 26MP sensor with 4K60 video.",
    price: 799,
    compareAtPrice: 949,
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    badge: "Pro toolkit",
    rating: 4.9,
    stock: 6,
    featured: 1,
  },
  {
    slug: "velvet-cushion-set",
    name: "Velvet Cushion Set",
    category: "Home",
    description: "A tactile two-piece cushion set that adds a soft, luxurious finish to living spaces. Premium velvet cover with hidden zipper.",
    price: 74,
    compareAtPrice: 109,
    imageUrl: "https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=1200&q=80",
    badge: "Soft touch",
    rating: 4.6,
    stock: 27,
    featured: 0,
  },
  {
    slug: "midnight-backpack",
    name: "Midnight Backpack",
    category: "Travel",
    description: "A travel-ready backpack with hidden pockets, weather resistance, and a refined matte finish. Fits 16-inch laptop with padded compartment.",
    price: 129,
    compareAtPrice: 169,
    imageUrl: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80",
    badge: "Travel ready",
    rating: 4.7,
    stock: 15,
    featured: 0,
  },
  // ── Audio ──
  {
    slug: "sonance-wireless-earbuds",
    name: "Sonance Wireless Earbuds",
    category: "Audio",
    description: "True wireless earbuds with active noise cancellation, transparency mode, and 32-hour total battery life. IPX5 sweat and water resistant.",
    price: 129,
    compareAtPrice: 169,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?auto=format&fit=crop&w=1200&q=80",
    badge: "Popular",
    rating: 4.7,
    stock: 30,
    featured: 1,
  },
  {
    slug: "resonance-soundbar",
    name: "Resonance Soundbar",
    category: "Audio",
    description: "Slim soundbar with Dolby Atmos support, wireless subwoofer, and HDMI eARC. Transforms your TV audio into immersive 3D surround sound.",
    price: 349,
    compareAtPrice: 449,
    imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
    badge: "Cinema sound",
    rating: 4.8,
    stock: 12,
    featured: 0,
  },
  {
    slug: "vinyl-roots-turntable",
    name: "Vinyl Roots Turntable",
    category: "Audio",
    description: "Belt-driven turntable with built-in phono preamp and USB output. Converts vinyl to digital with warm analog fidelity.",
    price: 219,
    compareAtPrice: 289,
    imageUrl: "https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=1200&q=80",
    badge: "Audiophile",
    rating: 4.6,
    stock: 9,
    featured: 0,
  },
  {
    slug: "pulse-bt-speaker",
    name: "Pulse BT Speaker",
    category: "Audio",
    description: "Portable Bluetooth speaker with 360-degree sound, LED light ring, and 24-hour playback. Perfect for outdoor gatherings.",
    price: 79,
    compareAtPrice: 109,
    imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1200&q=80",
    badge: "Fun pick",
    rating: 4.5,
    stock: 40,
    featured: 0,
  },
  // ── Wearables ──
  {
    slug: "stride-fitness-band",
    name: "Stride Fitness Band",
    category: "Wearables",
    description: "Lightweight fitness tracker with GPS, heart rate monitor, sleep analysis, and 14-day battery. Swim-proof to 50 meters.",
    price: 79,
    compareAtPrice: 109,
    imageUrl: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=1200&q=80",
    badge: "Fitness pick",
    rating: 4.6,
    stock: 25,
    featured: 0,
  },
  {
    slug: "cascade-running-shoes",
    name: "Cascade Running Shoes",
    category: "Wearables",
    description: "Responsive running shoes with carbon fiber plate, breathable knit upper, and energy-return foam. Built for speed and comfort.",
    price: 159,
    compareAtPrice: 199,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    badge: "Performance",
    rating: 4.8,
    stock: 18,
    featured: 1,
  },
  {
    slug: "onyx-sunglasses",
    name: "Onyx Sunglasses",
    category: "Wearables",
    description: "Polarized sunglasses with titanium frame, anti-scratch coating, and UV400 protection. Includes hardshell case and microfiber cloth.",
    price: 149,
    compareAtPrice: 199,
    imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80",
    badge: "UV protection",
    rating: 4.7,
    stock: 20,
    featured: 0,
  },
  {
    slug: "nomad-leather-wallet",
    name: "Nomad Leather Wallet",
    category: "Wearables",
    description: "Slim bifold wallet crafted from full-grain Horween leather. RFID blocking with 8 card slots and a bill compartment.",
    price: 69,
    compareAtPrice: 95,
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=80",
    badge: "Handcrafted",
    rating: 4.8,
    stock: 35,
    featured: 0,
  },
  {
    slug: "urban-crossbody-bag",
    name: "Urban Crossbody Bag",
    category: "Wearables",
    description: "Minimalist crossbody bag with water-resistant nylon, adjustable strap, and quick-access front pocket. Fits phone, wallet, and keys.",
    price: 59,
    compareAtPrice: 85,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
    badge: "Everyday",
    rating: 4.5,
    stock: 28,
    featured: 0,
  },
  // ── Home ──
  {
    slug: "zen-aroma-diffuser",
    name: "Zen Aroma Diffuser",
    category: "Home",
    description: "Ultrasonic essential oil diffuser with color-changing LED light, auto shut-off, and whisper-quiet operation. Covers up to 500 sq ft.",
    price: 49,
    compareAtPrice: 69,
    imageUrl: "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=1200&q=80",
    badge: "Relaxation",
    rating: 4.7,
    stock: 42,
    featured: 0,
  },
  {
    slug: "cascade-throw-blanket",
    name: "Cascade Throw Blanket",
    category: "Home",
    description: "Ultra-soft microfiber throw blanket with waffle texture. Machine washable and fade-resistant. Perfect for couch or bed.",
    price: 45,
    compareAtPrice: 65,
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    badge: "Cozy pick",
    rating: 4.6,
    stock: 50,
    featured: 0,
  },
  {
    slug: "prism-wall-mirror",
    name: "Prism Wall Mirror",
    category: "Home",
    description: "Frameless round wall mirror with beveled edge and mounting hardware. 24-inch diameter with anti-shatter backing.",
    price: 119,
    compareAtPrice: 159,
    imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80",
    badge: "Decor",
    rating: 4.8,
    stock: 14,
    featured: 1,
  },
  {
    slug: "terra-planters-set",
    name: "Terra Planters Set",
    category: "Home",
    description: "Set of 3 ceramic planters in matte earth tones with drainage holes and bamboo saucers. Sizes: 4\", 6\", and 8\".",
    price: 55,
    compareAtPrice: 79,
    imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80",
    badge: "Green living",
    rating: 4.5,
    stock: 22,
    featured: 0,
  },
  // ── Work ──
  {
    slug: "mechanical-pro-keyboard",
    name: "Mechanical Pro Keyboard",
    category: "Work",
    description: "Hot-swappable mechanical keyboard with RGB backlight, PBT keycaps, and wireless/wired connectivity. Cherry MX compatible.",
    price: 149,
    compareAtPrice: 189,
    imageUrl: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=1200&q=80",
    badge: "Typist favorite",
    rating: 4.8,
    stock: 20,
    featured: 1,
  },
  {
    slug: "precision-ergo-mouse",
    name: "Precision Ergo Mouse",
    category: "Work",
    description: "Vertical ergonomic mouse with 4000 DPI sensor, quiet clicks, and Bluetooth/USB-C dual connectivity. Reduces wrist strain.",
    price: 69,
    compareAtPrice: 89,
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80",
    badge: "Ergonomic",
    rating: 4.6,
    stock: 30,
    featured: 0,
  },
  {
    slug: "ultrawide-curve-monitor",
    name: "Ultrawide Curve Monitor",
    category: "Work",
    description: "34-inch curved ultrawide monitor with WQHD resolution, 165Hz refresh rate, and USB-C power delivery. HDR10 support.",
    price: 599,
    compareAtPrice: 749,
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
    badge: "Immersive",
    rating: 4.9,
    stock: 5,
    featured: 1,
  },
  {
    slug: "hub-c-usb-dock",
    name: "Hub-C USB Dock",
    category: "Work",
    description: "12-in-1 USB-C hub with dual HDMI, Ethernet, SD card reader, and 100W pass-through charging. Aluminum heat-sink design.",
    price: 79,
    compareAtPrice: 109,
    imageUrl: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=1200&q=80",
    badge: "Essential",
    rating: 4.5,
    stock: 38,
    featured: 0,
  },
  {
    slug: "clarity-4k-webcam",
    name: "Clarity 4K Webcam",
    category: "Work",
    description: "4K webcam with auto-framing, noise-cancelling dual mics, and low-light correction. Privacy shutter included.",
    price: 129,
    compareAtPrice: 169,
    imageUrl: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?auto=format&fit=crop&w=1200&q=80",
    badge: "Remote work",
    rating: 4.7,
    stock: 16,
    featured: 0,
  },
  // ── Travel ──
  {
    slug: "voyager-carry-on",
    name: "Voyager Carry-On",
    category: "Travel",
    description: "Hardshell carry-on suitcase with 360-degree spinner wheels, TSA-approved lock, and compression divider. 20-inch fits overhead bins.",
    price: 199,
    compareAtPrice: 279,
    imageUrl: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=1200&q=80",
    badge: "Travel essential",
    rating: 4.8,
    stock: 12,
    featured: 1,
  },
  {
    slug: "explorer-daypack",
    name: "Explorer Daypack",
    category: "Travel",
    description: "30L daypack with padded laptop sleeve, water bottle pockets, and reflective accents. Ripstop nylon with YKK zippers.",
    price: 89,
    compareAtPrice: 119,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
    badge: "Adventure",
    rating: 4.6,
    stock: 25,
    featured: 0,
  },
  {
    slug: "sentinel TSA-lock",
    name: "Sentinel TSA Lock",
    category: "Travel",
    description: "Heavy-duty combination TSA lock with zinc alloy body and steel shackle. Resettable 3-digit code with travel alert indicator.",
    price: 29,
    compareAtPrice: 39,
    imageUrl: "https://images.unsplash.com/photo-1590846083693-f23fdede3a7e?auto=format&fit=crop&w=1200&q=80",
    badge: "Security",
    rating: 4.4,
    stock: 60,
    featured: 0,
  },
  {
    slug: "nest-tech-organizer",
    name: "Nest Tech Organizer",
    category: "Travel",
    description: "Cord and gadget organizer with elastic loops, mesh pockets, and waterproof exterior. Fits chargers, cables, and adapters.",
    price: 35,
    compareAtPrice: 49,
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=1200&q=80",
    badge: "Neat pick",
    rating: 4.5,
    stock: 45,
    featured: 0,
  },
  // ── Kitchen ──
  {
    slug: "blendforce-pro-blender",
    name: "BlendForce Pro Blender",
    category: "Kitchen",
    description: "1400W countertop blender with 6 stainless steel blades, 64 oz Tritan pitcher, and 5 pre-programmed cycles. BPA-free.",
    price: 119,
    compareAtPrice: 159,
    imageUrl: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=1200&q=80",
    badge: "Kitchen essential",
    rating: 4.7,
    stock: 18,
    featured: 0,
  },
  {
    slug: "tempgoose-neck-kettle",
    name: "TempGoose Neck Kettle",
    category: "Kitchen",
    description: "Variable temperature electric kettle with gooseneck spout, built-in thermometer, and 60-minute hold. Perfect for pour-over coffee.",
    price: 69,
    compareAtPrice: 89,
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
    badge: "Barista pick",
    rating: 4.8,
    stock: 22,
    featured: 1,
  },
  {
    slug: "forged-chef-knife-set",
    name: "Forged Chef Knife Set",
    category: "Kitchen",
    description: "5-piece German steel knife set with magnetic block. Includes 8\" chef, 7\" santoku, 5\" utility, 3.5\" paring, and kitchen shears.",
    price: 189,
    compareAtPrice: 249,
    imageUrl: "https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=1200&q=80",
    badge: "Professional",
    rating: 4.9,
    stock: 10,
    featured: 1,
  },
  {
    slug: "granite-mortar-pestle",
    name: "Granite Mortar & Pestle",
    category: "Kitchen",
    description: "Solid granite mortar and pestle with unpolished grinding surface. 6-inch diameter, ideal for spices, herbs, and pastes.",
    price: 39,
    compareAtPrice: 55,
    imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80",
    badge: "Classic",
    rating: 4.6,
    stock: 30,
    featured: 0,
  },
  // ── Beauty ──
  {
    slug: "radiance-vitamin-c-serum",
    name: "Radiance Vitamin C Serum",
    category: "Beauty",
    description: "20% Vitamin C serum with hyaluronic acid and vitamin E. Brightens skin, reduces dark spots, and boosts collagen production.",
    price: 38,
    compareAtPrice: 52,
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80",
    badge: "Cult favorite",
    rating: 4.8,
    stock: 45,
    featured: 1,
  },
  {
    slug: "glow-led-mirror",
    name: "Glow LED Mirror",
    category: "Beauty",
    description: "Vanity mirror with 3 color modes, touch dimmer, and 10x magnification side. USB rechargeable with 4-hour battery.",
    price: 59,
    compareAtPrice: 79,
    imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1200&q=80",
    badge: "Vanity essential",
    rating: 4.7,
    stock: 20,
    featured: 0,
  },
  {
    slug: "artisan-brush-set",
    name: "Artisan Brush Set",
    category: "Beauty",
    description: "12-piece makeup brush set with synthetic bristles, rose gold ferrules, and vegan leather case. Includes face, eye, and lip brushes.",
    price: 45,
    compareAtPrice: 65,
    imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80",
    badge: "Complete set",
    rating: 4.6,
    stock: 28,
    featured: 0,
  },
  {
    slug: "spa-luxury-gift-set",
    name: "Spa Luxury Gift Set",
    category: "Beauty",
    description: "Gift box with bath salts, body butter, scented candle, and silk eye mask. Perfect self-care package in a reusable linen pouch.",
    price: 65,
    compareAtPrice: 89,
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    badge: "Gift ready",
    rating: 4.7,
    stock: 15,
    featured: 0,
  },
  // ── Gaming ──
  {
    slug: "phantom-pro-controller",
    name: "Phantom Pro Controller",
    category: "Gaming",
    description: "Wireless controller with Hall effect thumbsticks, programmable back buttons, and swappable thumbstick caps. PC, PS5, and Switch compatible.",
    price: 89,
    compareAtPrice: 119,
    imageUrl: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1200&q=80",
    badge: "Pro grade",
    rating: 4.7,
    stock: 22,
    featured: 1,
  },
  {
    slug: "titan-gaming-headset",
    name: "Titan Gaming Headset",
    category: "Gaming",
    description: "7.1 surround sound gaming headset with detachable mic, memory foam ear cups, and RGB lighting. 40mm neodymium drivers.",
    price: 99,
    compareAtPrice: 139,
    imageUrl: "https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=1200&q=80",
    badge: "Immersive",
    rating: 4.6,
    stock: 18,
    featured: 0,
  },
  {
    slug: "flux-mech-keyboard",
    name: "Flux Mech Keyboard",
    category: "Gaming",
    description: "Compact 65% gaming keyboard with hot-swap switches, PBT doubleshot keycaps, and per-key RGB. Rapid trigger support.",
    price: 119,
    compareAtPrice: 149,
    imageUrl: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1200&q=80",
    badge: "Tournament",
    rating: 4.8,
    stock: 14,
    featured: 0,
  },
  {
    slug: "aero-gaming-mouse",
    name: "Aero Gaming Mouse",
    category: "Gaming",
    description: "Ultralight 58g gaming mouse with 25K DPI sensor, PTFE feet, and flexible paracord cable. 6 programmable buttons.",
    price: 79,
    compareAtPrice: 99,
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80",
    badge: "Featherweight",
    rating: 4.7,
    stock: 20,
    featured: 0,
  },
  // ── Outdoors ──
  {
    slug: "alpine-down-jacket",
    name: "Alpine Down Jacket",
    category: "Outdoors",
    description: "800-fill goose down jacket with waterproof shell, packable design, and internal pockets. Weighs only 12 oz.",
    price: 229,
    compareAtPrice: 299,
    imageUrl: "https://images.unsplash.com/photo-1544923246-77307dd270aa?auto=format&fit=crop&w=1200&q=80",
    badge: "Summit ready",
    rating: 4.9,
    stock: 10,
    featured: 1,
  },
  {
    slug: "summit-insulated-bottle",
    name: "Summit Insulated Bottle",
    category: "Outdoors",
    description: "32oz vacuum-insulated stainless steel bottle. Keeps cold 24 hours, hot 12. Leak-proof cap with wide mouth.",
    price: 35,
    compareAtPrice: 49,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=80",
    badge: "Hydration",
    rating: 4.7,
    stock: 55,
    featured: 0,
  },
  {
    slug: "beam-camping-lantern",
    name: "Beam Camping Lantern",
    category: "Outdoors",
    description: "Rechargeable LED lantern with 1000 lumens, 4 brightness modes, and red night vision. Doubles as a power bank.",
    price: 49,
    compareAtPrice: 65,
    imageUrl: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80",
    badge: "Night essential",
    rating: 4.6,
    stock: 30,
    featured: 0,
  },
  {
    slug: "ridgeline-hiking-pack",
    name: "Ridgeline Hiking Pack",
    category: "Outdoors",
    description: "45L hiking backpack with ventilated back panel, rain cover, and trekking pole loops. Hydration bladder compatible.",
    price: 149,
    compareAtPrice: 199,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
    badge: "Trail tested",
    rating: 4.8,
    stock: 12,
    featured: 0,
  },
  // ── Office ──
  {
    slug: "standing-desk-pro",
    name: "Standing Desk Pro",
    category: "Office",
    description: "Electric sit-stand desk with dual motor, programmable height presets, and cable management tray. 48x30 inch bamboo top.",
    price: 499,
    compareAtPrice: 649,
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=80",
    badge: "Upgrade",
    rating: 4.9,
    stock: 6,
    featured: 1,
  },
  {
    slug: "focus-desk-organizer",
    name: "Focus Desk Organizer",
    category: "Office",
    description: "Bamboo desk organizer with pen holder, phone stand, card slots, and drawer. Keeps your workspace tidy and stylish.",
    price: 39,
    compareAtPrice: 55,
    imageUrl: "https://images.unsplash.com/photo-1589588601964-e07276d7cfba?auto=format&fit=crop&w=1200&q=80",
    badge: "Tidy desk",
    rating: 4.5,
    stock: 40,
    featured: 0,
  },
  {
    slug: "minimalist-planner-2026",
    name: "Minimalist Planner 2026",
    category: "Office",
    description: "Undated weekly planner with habit tracker, goal setting pages, and premium 100gsm paper. Hardcover with ribbon bookmark.",
    price: 24,
    compareAtPrice: 34,
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=1200&q=80",
    badge: "Organize",
    rating: 4.6,
    stock: 55,
    featured: 0,
  },
  {
    slug: "lumina-desk-lamp-pro",
    name: "Lumina Desk Lamp Pro",
    category: "Office",
    description: "LED desk lamp with wireless charging pad, USB-A and USB-C ports, auto-dimming sensor, and 5 color temperatures.",
    price: 89,
    compareAtPrice: 119,
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?auto=format&fit=crop&w=1200&q=80",
    badge: "Smart light",
    rating: 4.7,
    stock: 24,
    featured: 0,
  },
];

function buildCatalogProducts() {
  return heroSeedProducts.map((product) => ({ ...product }));
}

async function initDatabase() {
  await exec("PRAGMA foreign_keys = ON;");

  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      is_admin INTEGER NOT NULL DEFAULT 0,
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
      payment_method TEXT DEFAULT 'card',
      promo_code TEXT DEFAULT NULL,
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

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT NOT NULL DEFAULT '',
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT 'Home',
      full_name TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      zip_code TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      subscribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await exec(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''`).catch(() => {});
  await exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''`).catch(() => {});
  await exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'card'`).catch(() => {});
  await exec(`ALTER TABLE orders ADD COLUMN promo_code TEXT DEFAULT NULL`).catch(() => {});

  const productCount = await get("SELECT COUNT(*) AS count FROM products");
  if ((productCount?.count || 0) < 50) {
    const insertStatement = `
      INSERT OR IGNORE INTO products (slug, name, category, description, price, compare_at_price, image_url, badge, rating, stock, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const product of buildCatalogProducts()) {
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

  const adminExists = await get("SELECT id FROM users WHERE email = 'admin@ponnaloy.com'");
  if (!adminExists) {
    const hash = await bcrypt.hash("admin123", 10);
    await run(
      "INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)",
      ["Admin", "admin@ponnaloy.com", hash]
    );
  }
}

/* ── Product queries ── */
async function listProducts() {
  const rows = await all(
    "SELECT * FROM products ORDER BY featured DESC, id ASC",
  );
  return rows.map(toProduct);
}

async function listFeaturedProducts() {
  const rows = await all(
    "SELECT * FROM products WHERE featured = 1 ORDER BY id ASC LIMIT 8",
  );
  return rows.map(toProduct);
}

async function listTrendingProducts() {
  const rows = await all(
    "SELECT * FROM products WHERE rating >= 4.7 ORDER BY rating DESC, stock DESC LIMIT 8",
  );
  return rows.map(toProduct);
}

async function listDealProducts() {
  const rows = await all(
    "SELECT *, CAST((compare_at_price - price) * 100.0 / compare_at_price AS INTEGER) AS discount_pct FROM products WHERE compare_at_price > price ORDER BY discount_pct DESC LIMIT 6",
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

/* ── User queries ── */
async function findUserByEmail(email) {
  const row = await get("SELECT * FROM users WHERE lower(email) = lower(?)", [
    email,
  ]);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    avatarUrl: row.avatar_url || "",
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at,
    verifyPassword(password) {
      return bcrypt.compare(password, row.password_hash);
    },
  };
}

async function getUserById(id) {
  const row = await get(
    "SELECT id, name, email, phone, avatar_url, is_admin, created_at FROM users WHERE id = ?",
    [id],
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    avatarUrl: row.avatar_url || "",
    isAdmin: Boolean(row.is_admin),
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

async function updateUserProfile(userId, { name, email, phone, avatarUrl }) {
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push("name = ?"); params.push(name.trim()); }
  if (email !== undefined) { fields.push("email = ?"); params.push(email.trim().toLowerCase()); }
  if (phone !== undefined) { fields.push("phone = ?"); params.push(phone.trim()); }
  if (avatarUrl !== undefined) { fields.push("avatar_url = ?"); params.push(avatarUrl.trim()); }
  if (!fields.length) return getUserById(userId);
  params.push(userId);
  await run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);
  return getUserById(userId);
}

async function updateUserPassword(userId, newPassword) {
  const hash = await bcrypt.hash(newPassword, 10);
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);
}

/* ── Order queries ── */
async function createOrder({
  userId,
  items,
  customerName,
  shippingAddress,
  phone,
  email,
  paymentMethod,
  promoCode,
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
      `INSERT INTO orders (user_id, customer_name, customer_email, shipping_address, phone, subtotal, shipping_fee, total, payment_method, promo_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        customerName.trim(),
        email.trim().toLowerCase(),
        shippingAddress.trim(),
        phone.trim(),
        subtotal,
        shippingFee,
        total,
        paymentMethod || "card",
        promoCode || null,
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
      paymentMethod: order.payment_method || "card",
      promoCode: order.promo_code || null,
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

async function getOrderById(orderId) {
  const order = await get("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (!order) return null;
  const items = await all(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
    [orderId],
  );
  return {
    id: order.id,
    userId: order.user_id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    shippingAddress: order.shipping_address,
    phone: order.phone,
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shipping_fee),
    total: Number(order.total),
    status: order.status,
    paymentMethod: order.payment_method || "card",
    promoCode: order.promo_code || null,
    createdAt: order.created_at,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
    })),
  };
}

/* ── Review queries ── */
async function getReviewsForProduct(productId) {
  const rows = await all(
    `SELECT r.*, u.name AS user_name FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ? ORDER BY r.created_at DESC`,
    [productId],
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    productId: r.product_id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: r.created_at,
  }));
}

async function createReview({ userId, productId, rating, title, comment }) {
  const existing = await get(
    "SELECT id FROM reviews WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );
  if (existing) {
    await run(
      "UPDATE reviews SET rating = ?, title = ?, comment = ? WHERE id = ?",
      [rating, title || "", comment || "", existing.id]
    );
    return { id: existing.id, updated: true };
  }
  const result = await run(
    "INSERT INTO reviews (user_id, product_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)",
    [userId, productId, rating, title || "", comment || ""]
  );
  const avg = await get(
    "SELECT AVG(rating) AS avg_rating, COUNT(*) AS count FROM reviews WHERE product_id = ?",
    [productId]
  );
  if (avg?.avg_rating) {
    await run("UPDATE products SET rating = ? WHERE id = ?", [
      Math.round(avg.avg_rating * 10) / 10,
      productId,
    ]);
  }
  return { id: result.id, updated: false };
}

async function deleteReview(reviewId, userId) {
  const review = await get("SELECT * FROM reviews WHERE id = ?", [reviewId]);
  if (!review) return false;
  if (review.user_id !== userId) return false;
  await run("DELETE FROM reviews WHERE id = ?", [reviewId]);
  const avg = await get(
    "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = ?",
    [review.product_id]
  );
  await run("UPDATE products SET rating = ? WHERE id = ?", [
    avg?.avg_rating ? Math.round(avg.avg_rating * 10) / 10 : 5,
    review.product_id,
  ]);
  return true;
}

async function getProductReviewStats(productId) {
  const row = await get(
    "SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_reviews FROM reviews WHERE product_id = ?",
    [productId]
  );
  const distribution = await all(
    "SELECT rating, COUNT(*) AS count FROM reviews WHERE product_id = ? GROUP BY rating ORDER BY rating DESC",
    [productId]
  );
  return {
    avgRating: row?.avg_rating ? Math.round(row.avg_rating * 10) / 10 : 0,
    totalReviews: row?.total_reviews || 0,
    distribution: distribution.map((d) => ({ rating: d.rating, count: d.count })),
  };
}

/* ── Wishlist queries ── */
async function getWishlistForUser(userId) {
  const rows = await all(
    `SELECT w.*, p.slug, p.name, p.category, p.description, p.price, p.compare_at_price,
            p.image_url, p.badge, p.rating, p.stock, p.featured, p.created_at
     FROM wishlist w
     JOIN products p ON w.product_id = p.id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    wishlistId: r.id,
    product: toProduct(r),
    addedAt: r.created_at,
  }));
}

async function toggleWishlistItem(userId, productId) {
  const existing = await get(
    "SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );
  if (existing) {
    await run("DELETE FROM wishlist WHERE id = ?", [existing.id]);
    return { added: false };
  }
  await run(
    "INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)",
    [userId, productId]
  );
  return { added: true };
}

/* ── Address queries ── */
async function getAddressesForUser(userId) {
  return all(
    "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
    [userId]
  );
}

async function createAddress(userId, data) {
  if (data.isDefault) {
    await run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
  }
  const result = await run(
    `INSERT INTO addresses (user_id, label, full_name, address_line1, address_line2, city, state, zip_code, phone, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.label || "Home",
      data.fullName,
      data.addressLine1,
      data.addressLine2 || "",
      data.city || "",
      data.state || "",
      data.zipCode || "",
      data.phone || "",
      data.isDefault ? 1 : 0,
    ]
  );
  return { id: result.id, ...data };
}

async function updateAddress(addressId, userId, data) {
  const existing = await get("SELECT * FROM addresses WHERE id = ? AND user_id = ?", [addressId, userId]);
  if (!existing) return null;
  if (data.isDefault) {
    await run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
  }
  await run(
    `UPDATE addresses SET label = ?, full_name = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, zip_code = ?, phone = ?, is_default = ? WHERE id = ? AND user_id = ?`,
    [
      data.label || existing.label,
      data.fullName || existing.full_name,
      data.addressLine1 || existing.address_line1,
      data.addressLine2 !== undefined ? data.addressLine2 : existing.address_line2,
      data.city !== undefined ? data.city : existing.city,
      data.state !== undefined ? data.state : existing.state,
      data.zipCode !== undefined ? data.zipCode : existing.zip_code,
      data.phone !== undefined ? data.phone : existing.phone,
      data.isDefault ? 1 : 0,
      addressId,
      userId,
    ]
  );
  return get("SELECT * FROM addresses WHERE id = ?", [addressId]);
}

async function deleteAddress(addressId, userId) {
  const result = await run("DELETE FROM addresses WHERE id = ? AND user_id = ?", [addressId, userId]);
  return result.changes > 0;
}

/* ── Admin queries ── */
async function getAdminStats() {
  const [productCount, userCount, orderCount, revenue, recentOrders, lowStock] = await Promise.all([
    get("SELECT COUNT(*) AS count FROM products"),
    get("SELECT COUNT(*) AS count FROM users"),
    get("SELECT COUNT(*) AS count FROM orders"),
    get("SELECT COALESCE(SUM(total), 0) AS total FROM orders"),
    all("SELECT * FROM orders ORDER BY id DESC LIMIT 10"),
    all("SELECT * FROM products WHERE stock < 10 ORDER BY stock ASC LIMIT 10"),
  ]);
  return {
    productCount: productCount?.count || 0,
    userCount: userCount?.count || 0,
    orderCount: orderCount?.count || 0,
    totalRevenue: revenue?.total || 0,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      customerName: o.customer_name,
      total: Number(o.total),
      status: o.status,
      createdAt: o.created_at,
    })),
    lowStockProducts: lowStock.map(toProduct),
  };
}

async function adminListAllOrders() {
  const orders = await all("SELECT * FROM orders ORDER BY id DESC");
  const payload = [];
  for (const order of orders) {
    const items = await all(
      "SELECT * FROM order_items WHERE order_id = ?",
      [order.id]
    );
    payload.push({
      id: order.id,
      userId: order.user_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      shippingAddress: order.shipping_address,
      phone: order.phone,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shipping_fee),
      total: Number(order.total),
      status: order.status,
      paymentMethod: order.payment_method || "card",
      promoCode: order.promo_code || null,
      createdAt: order.created_at,
      items: items.map((i) => ({
        productId: i.product_id,
        productName: i.product_name,
        unitPrice: Number(i.unit_price),
        quantity: i.quantity,
        lineTotal: Number(i.line_total),
      })),
    });
  }
  return payload;
}

async function adminUpdateOrderStatus(orderId, status) {
  const validStatuses = ["placed", "confirmed", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) throw new Error("Invalid order status.");
  await run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
  return getOrderById(orderId);
}

async function adminCreateProduct(data) {
  const result = await run(
    `INSERT INTO products (slug, name, category, description, price, compare_at_price, image_url, badge, rating, stock, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.slug || slugify(data.name),
      data.name,
      data.category,
      data.description || "",
      data.price,
      data.compareAtPrice || data.price,
      data.imageUrl || "",
      data.badge || "New",
      data.rating || 5,
      data.stock || 0,
      data.featured ? 1 : 0,
    ]
  );
  return getProductById(result.id);
}

async function adminUpdateProduct(productId, data) {
  const existing = await getProductById(productId);
  if (!existing) return null;
  const fields = [];
  const params = [];
  const map = {
    name: "name",
    category: "category",
    description: "description",
    price: "price",
    compareAtPrice: "compare_at_price",
    imageUrl: "image_url",
    badge: "badge",
    rating: "rating",
    stock: "stock",
    featured: "featured",
    slug: "slug",
  };
  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(key === "featured" ? (data[key] ? 1 : 0) : data[key]);
    }
  }
  if (!fields.length) return existing;
  params.push(productId);
  await run(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, params);
  return getProductById(productId);
}

async function adminDeleteProduct(productId) {
  const result = await run("DELETE FROM products WHERE id = ?", [productId]);
  return result.changes > 0;
}

async function adminListAllUsers() {
  return all(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.is_admin, u.created_at,
            (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
     FROM users u ORDER BY u.id DESC`
  );
}

/* ── Newsletter ── */
async function subscribeNewsletter(email) {
  try {
    await run("INSERT INTO newsletter_subscribers (email) VALUES (?)", [
      email.trim().toLowerCase(),
    ]);
    return true;
  } catch (e) {
    return false;
  }
}

async function getNewsletterCount() {
  const row = await get("SELECT COUNT(*) AS count FROM newsletter_subscribers");
  return row?.count || 0;
}

module.exports = {
  initDatabase,
  listProducts,
  listFeaturedProducts,
  listTrendingProducts,
  listDealProducts,
  searchProducts,
  getProductById,
  getProductBySlug,
  findUserByEmail,
  createUser,
  getUserById,
  updateUserProfile,
  updateUserPassword,
  createOrder,
  listOrdersForUser,
  getOrderById,
  getReviewsForProduct,
  createReview,
  deleteReview,
  getProductReviewStats,
  getWishlistForUser,
  toggleWishlistItem,
  getAddressesForUser,
  createAddress,
  updateAddress,
  deleteAddress,
  getAdminStats,
  adminListAllOrders,
  adminUpdateOrderStatus,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminListAllUsers,
  subscribeNewsletter,
  getNewsletterCount,
};
