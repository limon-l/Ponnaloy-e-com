import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: "Electronics",
    slug: "electronics",
    description: "Latest gadgets, phones, and tech accessories",
    image: "https://picsum.photos/seed/electronics/400/400",
    position: 1,
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Trending clothing, shoes, and accessories",
    image: "https://picsum.photos/seed/fashion/400/400",
    position: 2,
  },
  {
    name: "Home & Living",
    slug: "home-living",
    description: "Furniture, decor, and home essentials",
    image: "https://picsum.photos/seed/homeliving/400/400",
    position: 3,
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description: "Fitness gear, outdoor equipment, and sportswear",
    image: "https://picsum.photos/seed/sports/400/400",
    position: 4,
  },
  {
    name: "Beauty & Health",
    slug: "beauty-health",
    description: "Skincare, makeup, and wellness products",
    image: "https://picsum.photos/seed/beauty/400/400",
    position: 5,
  },
  {
    name: "Books & Stationery",
    slug: "books-stationery",
    description: "Bestselling books, journals, and writing essentials",
    image: "https://picsum.photos/seed/books/400/400",
    position: 6,
  },
  {
    name: "Toys & Games",
    slug: "toys-games",
    description: "Fun for all ages — puzzles, board games, and toys",
    image: "https://picsum.photos/seed/toys/400/400",
    position: 7,
  },
  {
    name: "Food & Beverages",
    slug: "food-beverages",
    description: "Gourmet snacks, organic food, and specialty drinks",
    image: "https://picsum.photos/seed/food/400/400",
    position: 8,
  },
];

const BRANDS = [
  { name: "TechNova", slug: "technova", description: "Premium electronics and gadgets", logo: "https://picsum.photos/seed/technova/100/100" },
  { name: "UrbanEdge", slug: "urbanedge", description: "Modern streetwear and accessories", logo: "https://picsum.photos/seed/urbanedge/100/100" },
  { name: "HomeCraft", slug: "homecraft", description: "Handcrafted home furnishings", logo: "https://picsum.photos/seed/homecraft/100/100" },
  { name: "PeakFit", slug: "peakfit", description: "Performance sports and fitness gear", logo: "https://picsum.photos/seed/peakfit/100/100" },
  { name: "GlowUp", slug: "glowup", description: "Clean beauty and skincare", logo: "https://picsum.photos/seed/glowup/100/100" },
  { name: "PageTurner", slug: "pageturner", description: "Curated books and stationery", logo: "https://picsum.photos/seed/pageturner/100/100" },
  { name: "PlayZone", slug: "playzone", description: "Toys, games, and entertainment", logo: "https://picsum.photos/seed/playzone/100/100" },
  { name: "NatureBite", slug: "naturebite", description: "Organic and natural food products", logo: "https://picsum.photos/seed/naturebite/100/100" },
  { name: "LuxeLane", slug: "luxelane", description: "Premium lifestyle products", logo: "https://picsum.photos/seed/luxelane/100/100" },
  { name: "SwiftGear", slug: "swiftgear", description: "Fast-moving consumer goods", logo: "https://picsum.photos/seed/swiftgear/100/100" },
];

// slug → category lookup (filled after upsert)
const catSlugToId: Record<string, string> = {};
const brandSlugToId: Record<string, string> = {};

interface ProductInput {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number; // in cents
  compareAtPrice?: number;
  costPrice?: number;
  sku: string;
  status: "ACTIVE";
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  avgRating: number;
  reviewCount: number;
  totalSold: number;
  categorySlug: string;
  brandSlug: string;
  images: { url: string; alt: string }[];
  weight?: number;
}

const PRODUCTS: ProductInput[] = [
  // ── Electronics ──────────────────────────────────────
  {
    name: "Wireless Noise-Cancelling Headphones",
    slug: "wireless-noise-cancelling-headphones",
    description: "Premium over-ear headphones with active noise cancellation, 40-hour battery life, and Hi-Res Audio support. Features comfortable memory foam ear cups and foldable design for travel.",
    shortDescription: "Premium ANC headphones with 40hr battery",
    price: 24999,
    compareAtPrice: 34999,
    sku: "TN-ELEC-001",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
    avgRating: 4.8,
    reviewCount: 342,
    totalSold: 1205,
    categorySlug: "electronics",
    brandSlug: "technova",
    images: [
      { url: "https://picsum.photos/seed/headphones1/600/600", alt: "Black wireless headphones" },
      { url: "https://picsum.photos/seed/headphones2/600/600", alt: "Headphones side view" },
    ],
    weight: 250,
  },
  {
    name: "Smart Watch Pro X",
    slug: "smart-watch-pro-x",
    description: "Advanced smartwatch with AMOLED display, heart rate monitoring, GPS, sleep tracking, and 7-day battery life. Water-resistant to 50m with interchangeable bands.",
    shortDescription: "Feature-packed smartwatch with AMOLED display",
    price: 19999,
    compareAtPrice: 27999,
    sku: "TN-ELEC-002",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
    avgRating: 4.7,
    reviewCount: 256,
    totalSold: 890,
    categorySlug: "electronics",
    brandSlug: "technova",
    images: [
      { url: "https://picsum.photos/seed/smartwatch1/600/600", alt: "Smartwatch on wrist" },
      { url: "https://picsum.photos/seed/smartwatch2/600/600", alt: "Smartwatch display" },
    ],
    weight: 45,
  },
  {
    name: "Portable Bluetooth Speaker",
    slug: "portable-bluetooth-speaker",
    description: "360-degree sound with deep bass, IP67 waterproof rating, and 20-hour playtime. Perfect for outdoor adventures with built-in microphone for calls.",
    shortDescription: "Waterproof speaker with 360° sound",
    price: 7999,
    compareAtPrice: 11999,
    sku: "TN-ELEC-003",
    status: "ACTIVE",
    isFeatured: false,
    isTrending: true,
    isNewArrival: false,
    avgRating: 4.6,
    reviewCount: 518,
    totalSold: 2340,
    categorySlug: "electronics",
    brandSlug: "technova",
    images: [
      { url: "https://picsum.photos/seed/speaker1/600/600", alt: "Bluetooth speaker" },
    ],
    weight: 680,
  },
  {
    name: "4K Ultra HD Webcam",
    slug: "4k-ultra-hd-webcam",
    description: "Professional-grade 4K webcam with auto-focus, built-in ring light, and noise-cancelling microphone. Ideal for streaming and video conferences.",
    shortDescription: "4K webcam with ring light and auto-focus",
    price: 12999,
    compareAtPrice: 16999,
    sku: "TN-ELEC-004",
    status: "ACTIVE",
    isFeatured: true,
    isNewArrival: true,
    avgRating: 4.5,
    reviewCount: 128,
    totalSold: 456,
    categorySlug: "electronics",
    brandSlug: "technova",
    images: [
      { url: "https://picsum.photos/seed/webcam1/600/600", alt: "4K webcam" },
    ],
    weight: 150,
  },
  {
    name: "Mechanical Gaming Keyboard",
    slug: "mechanical-gaming-keyboard",
    description: "RGB backlit mechanical keyboard with hot-swappable switches, aluminum frame, and programmable macro keys. N-key rollover for competitive gaming.",
    shortDescription: "Hot-swappable mechanical keyboard with RGB",
    price: 8999,
    compareAtPrice: 12999,
    sku: "TN-ELEC-005",
    status: "ACTIVE",
    isTrending: true,
    avgRating: 4.7,
    reviewCount: 892,
    totalSold: 3100,
    categorySlug: "electronics",
    brandSlug: "technova",
    images: [
      { url: "https://picsum.photos/seed/keyboard1/600/600", alt: "Mechanical keyboard" },
    ],
    weight: 850,
  },
  {
    name: "True Wireless Earbuds",
    slug: "true-wireless-earbuds",
    description: "Compact earbuds with ANC, transparency mode, and 30-hour total battery. IPX5 sweat-resistant with wireless charging case.",
    shortDescription: "Compact ANC earbuds with 30hr battery",
    price: 5999,
    compareAtPrice: 8999,
    sku: "TN-ELEC-006",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    avgRating: 4.4,
    reviewCount: 1024,
    totalSold: 5600,
    categorySlug: "electronics",
    brandSlug: "swiftgear",
    images: [
      { url: "https://picsum.photos/seed/earbuds1/600/600", alt: "Wireless earbuds" },
    ],
    weight: 12,
  },

  // ── Fashion ──────────────────────────────────────
  {
    name: "Classic Leather Jacket",
    slug: "classic-leather-jacket",
    description: "Genuine lambskin leather jacket with satin lining, YKK zippers, and adjustable waist belt. A timeless wardrobe essential.",
    shortDescription: "Genuine lambskin leather jacket",
    price: 14999,
    compareAtPrice: 21999,
    sku: "UE-FASH-001",
    status: "ACTIVE",
    isFeatured: true,
    isNewArrival: true,
    avgRating: 4.9,
    reviewCount: 186,
    totalSold: 720,
    categorySlug: "fashion",
    brandSlug: "urbanedge",
    images: [
      { url: "https://picsum.photos/seed/leatherjacket1/600/600", alt: "Leather jacket front" },
      { url: "https://picsum.photos/seed/leatherjacket2/600/600", alt: "Leather jacket back" },
    ],
    weight: 1200,
  },
  {
    name: "Premium Denim Jeans",
    slug: "premium-denim-jeans",
    description: "Slim-fit stretch denim jeans with reinforced stitching, classic 5-pocket design, and premium selvedge detail.",
    shortDescription: "Slim-fit stretch denim jeans",
    price: 6999,
    compareAtPrice: 9999,
    sku: "UE-FASH-002",
    status: "ACTIVE",
    isTrending: true,
    avgRating: 4.6,
    reviewCount: 445,
    totalSold: 2800,
    categorySlug: "fashion",
    brandSlug: "urbanedge",
    images: [
      { url: "https://picsum.photos/seed/jeans1/600/600", alt: "Denim jeans" },
    ],
    weight: 680,
  },
  {
    name: "Minimalist Canvas Sneakers",
    slug: "minimalist-canvas-sneakers",
    description: "Lightweight canvas sneakers with memory foam insoles and vulcanized rubber outsoles. Available in multiple colors.",
    shortDescription: "Lightweight canvas sneakers with memory foam",
    price: 4999,
    compareAtPrice: 6999,
    sku: "UE-FASH-003",
    status: "ACTIVE",
    isFeatured: true,
    avgRating: 4.5,
    reviewCount: 678,
    totalSold: 4200,
    categorySlug: "fashion",
    brandSlug: "urbanedge",
    images: [
      { url: "https://picsum.photos/seed/sneakers1/600/600", alt: "Canvas sneakers" },
    ],
    weight: 320,
  },
  {
    name: "Oversized Wool Blend Coat",
    slug: "oversized-wool-blend-coat",
    description: "Elegant oversized coat in premium wool blend fabric. Double-breasted closure with notched lapels and side pockets.",
    shortDescription: "Premium wool blend oversized coat",
    price: 12999,
    compareAtPrice: 18999,
    sku: "UE-FASH-004",
    status: "ACTIVE",
    isNewArrival: true,
    avgRating: 4.8,
    reviewCount: 92,
    totalSold: 310,
    categorySlug: "fashion",
    brandSlug: "luxelane",
    images: [
      { url: "https://picsum.photos/seed/woolcoat1/600/600", alt: "Wool coat" },
    ],
    weight: 1400,
  },
  {
    name: "Crossbody Messenger Bag",
    slug: "crossbody-messenger-bag",
    description: "Water-resistant nylon crossbody bag with padded laptop compartment, multiple organizer pockets, and adjustable strap.",
    shortDescription: "Water-resistant crossbody with laptop sleeve",
    price: 5499,
    compareAtPrice: 7999,
    sku: "UE-FASH-005",
    status: "ACTIVE",
    isTrending: true,
    avgRating: 4.4,
    reviewCount: 312,
    totalSold: 1900,
    categorySlug: "fashion",
    brandSlug: "urbanedge",
    images: [
      { url: "https://picsum.photos/seed/crossbody1/600/600", alt: "Crossbody bag" },
    ],
    weight: 450,
  },

  // ── Home & Living ──────────────────────────────────────
  {
    name: "Scandinavian Wood Coffee Table",
    slug: "scandinavian-wood-coffee-table",
    description: "Minimalist coffee table crafted from solid oak with tapered legs and a natural oil finish. Dimensions: 120×60×45cm.",
    shortDescription: "Solid oak coffee table with tapered legs",
    price: 29999,
    compareAtPrice: 39999,
    sku: "HC-HOME-001",
    status: "ACTIVE",
    isFeatured: true,
    avgRating: 4.8,
    reviewCount: 89,
    totalSold: 245,
    categorySlug: "home-living",
    brandSlug: "homecraft",
    images: [
      { url: "https://picsum.photos/seed/coffeetable1/600/600", alt: "Oak coffee table" },
      { url: "https://picsum.photos/seed/coffeetable2/600/600", alt: "Coffee table detail" },
    ],
    weight: 12000,
  },
  {
    name: "Ceramic Plant Pot Set (3-Pack)",
    slug: "ceramic-plant-pot-set",
    description: "Set of 3 minimalist ceramic pots in matte white, sage green, and terracotta. Includes drainage holes and bamboo saucers.",
    shortDescription: "3-pack ceramic pots with drainage holes",
    price: 3499,
    compareAtPrice: 5499,
    sku: "HC-HOME-002",
    status: "ACTIVE",
    isTrending: true,
    isNewArrival: true,
    avgRating: 4.7,
    reviewCount: 234,
    totalSold: 1800,
    categorySlug: "home-living",
    brandSlug: "homecraft",
    images: [
      { url: "https://picsum.photos/seed/plantpots1/600/600", alt: "Ceramic plant pots" },
    ],
    weight: 2200,
  },
  {
    name: "Organic Cotton Throw Blanket",
    slug: "organic-cotton-throw-blanket",
    description: "Luxuriously soft organic cotton throw with herringbone weave. Machine washable, sustainably sourced. Size: 150×200cm.",
    shortDescription: "Soft organic cotton throw blanket",
    price: 5999,
    compareAtPrice: 8499,
    sku: "HC-HOME-003",
    status: "ACTIVE",
    isFeatured: true,
    avgRating: 4.9,
    reviewCount: 167,
    totalSold: 980,
    categorySlug: "home-living",
    brandSlug: "homecraft",
    images: [
      { url: "https://picsum.photos/seed/blanket1/600/600", alt: "Cotton throw blanket" },
    ],
    weight: 900,
  },
  {
    name: "Rechargeable LED Desk Lamp",
    slug: "rechargeable-led-desk-lamp",
    description: "Wireless LED desk lamp with 5 brightness levels, 3 color temperatures, and 60-hour battery. Touch control with USB-C charging.",
    shortDescription: "Wireless LED lamp with 5 brightness levels",
    price: 4499,
    compareAtPrice: 6999,
    sku: "HC-HOME-004",
    status: "ACTIVE",
    isNewArrival: true,
    avgRating: 4.6,
    reviewCount: 198,
    totalSold: 1100,
    categorySlug: "home-living",
    brandSlug: "swiftgear",
    images: [
      { url: "https://picsum.photos/seed/desklamp1/600/600", alt: "LED desk lamp" },
    ],
    weight: 650,
  },

  // ── Sports & Outdoors ──────────────────────────────────────
  {
    name: "Ultra-Light Running Shoes",
    slug: "ultra-light-running-shoes",
    description: "Featherweight running shoes with responsive foam midsole, breathable mesh upper, and reflective details for night runs. Weight: 220g.",
    shortDescription: "Featherweight running shoes — 220g",
    price: 8999,
    compareAtPrice: 12999,
    sku: "PF-SPRT-001",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    avgRating: 4.8,
    reviewCount: 567,
    totalSold: 3400,
    categorySlug: "sports-outdoors",
    brandSlug: "peakfit",
    images: [
      { url: "https://picsum.photos/seed/runshoes1/600/600", alt: "Running shoes" },
    ],
    weight: 220,
  },
  {
    name: "Yoga Mat Premium Non-Slip",
    slug: "yoga-mat-premium-non-slip",
    description: "6mm thick TPE yoga mat with alignment lines, dual-layer non-slip texture, and carrying strap. Eco-friendly and latex-free.",
    shortDescription: "6mm non-slip TPE yoga mat with alignment lines",
    price: 3999,
    compareAtPrice: 5999,
    sku: "PF-SPRT-002",
    status: "ACTIVE",
    isTrending: true,
    avgRating: 4.7,
    reviewCount: 892,
    totalSold: 6100,
    categorySlug: "sports-outdoors",
    brandSlug: "peakfit",
    images: [
      { url: "https://picsum.photos/seed/yogamat1/600/600", alt: "Yoga mat" },
    ],
    weight: 1200,
  },
  {
    name: "Insulated Water Bottle 750ml",
    slug: "insulated-water-bottle-750ml",
    description: "Double-wall vacuum insulated stainless steel bottle. Keeps drinks cold 24hrs or hot 12hrs. BPA-free with leak-proof lid.",
    shortDescription: "Vacuum insulated bottle — cold 24hr, hot 12hr",
    price: 2999,
    compareAtPrice: 4499,
    sku: "PF-SPRT-003",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    avgRating: 4.6,
    reviewCount: 1245,
    totalSold: 8900,
    categorySlug: "sports-outdoors",
    brandSlug: "peakfit",
    images: [
      { url: "https://picsum.photos/seed/waterbottle1/600/600", alt: "Water bottle" },
    ],
    weight: 350,
  },
  {
    name: "Adjustable Dumbbell Set",
    slug: "adjustable-dumbbell-set",
    description: "Space-saving adjustable dumbbells from 2.5kg to 25kg each. Quick-lock mechanism, ergonomic grip, and compact design for home gyms.",
    shortDescription: "Adjustable dumbbells 2.5-25kg",
    price: 19999,
    compareAtPrice: 29999,
    sku: "PF-SPRT-004",
    status: "ACTIVE",
    isNewArrival: true,
    avgRating: 4.8,
    reviewCount: 156,
    totalSold: 520,
    categorySlug: "sports-outdoors",
    brandSlug: "peakfit",
    images: [
      { url: "https://picsum.photos/seed/dumbbells1/600/600", alt: "Adjustable dumbbells" },
    ],
    weight: 50000,
  },

  // ── Beauty & Health ──────────────────────────────────────
  {
    name: "Vitamin C Brightening Serum",
    slug: "vitamin-c-brightening-serum",
    description: "20% Vitamin C serum with hyaluronic acid and vitamin E. Dermatologically tested, paraben-free. Reduces dark spots and evens skin tone.",
    shortDescription: "20% Vitamin C serum with hyaluronic acid",
    price: 3499,
    compareAtPrice: 4999,
    sku: "GU-BEAU-001",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
    avgRating: 4.9,
    reviewCount: 678,
    totalSold: 4500,
    categorySlug: "beauty-health",
    brandSlug: "glowup",
    images: [
      { url: "https://picsum.photos/seed/serum1/600/600", alt: "Vitamin C serum" },
    ],
    weight: 85,
  },
  {
    name: "Hydrating Face Moisturizer",
    slug: "hydrating-face-moisturizer",
    description: "Lightweight daily moisturizer with ceramides, squalane, and SPF 30. Suitable for all skin types. Non-comedogenic formula.",
    shortDescription: "Daily moisturizer with ceramides & SPF 30",
    price: 2499,
    compareAtPrice: 3499,
    sku: "GU-BEAU-002",
    status: "ACTIVE",
    isTrending: true,
    avgRating: 4.7,
    reviewCount: 543,
    totalSold: 3800,
    categorySlug: "beauty-health",
    brandSlug: "glowup",
    images: [
      { url: "https://picsum.photos/seed/moisturizer1/600/600", alt: "Face moisturizer" },
    ],
    weight: 120,
  },
  {
    name: "Natural Bamboo Hair Brush Set",
    slug: "natural-bamboo-hair-brush-set",
    description: "Set of 3 eco-friendly bamboo brushes — paddle brush, round brush, and wide-tooth comb. Anti-static bristles for smooth, shiny hair.",
    shortDescription: "3-piece eco-friendly bamboo brush set",
    price: 1999,
    compareAtPrice: 2999,
    sku: "GU-BEAU-003",
    status: "ACTIVE",
    isNewArrival: true,
    avgRating: 4.5,
    reviewCount: 312,
    totalSold: 2100,
    categorySlug: "beauty-health",
    brandSlug: "glowup",
    images: [
      { url: "https://picsum.photos/seed/hairbrush1/600/600", alt: "Bamboo brush set" },
    ],
    weight: 280,
  },

  // ── Books & Stationery ──────────────────────────────────────
  {
    name: "Leather-Bound Journal",
    slug: "leather-bound-journal",
    description: "Hand-stitched genuine leather journal with 200 pages of acid-free paper. Features ribbon bookmark and elastic closure.",
    shortDescription: "Hand-stitched leather journal — 200 pages",
    price: 2499,
    compareAtPrice: 3999,
    sku: "PT-BOOK-001",
    status: "ACTIVE",
    isFeatured: true,
    avgRating: 4.8,
    reviewCount: 234,
    totalSold: 1500,
    categorySlug: "books-stationery",
    brandSlug: "pageturner",
    images: [
      { url: "https://picsum.photos/seed/journal1/600/600", alt: "Leather journal" },
    ],
    weight: 350,
  },
  {
    name: "Bestselling Fiction Collection",
    slug: "bestselling-fiction-collection",
    description: "Curated set of 5 award-winning novels from contemporary authors. Beautiful paperback editions with author notes and discussion guides.",
    shortDescription: "5-book award-winning fiction collection",
    price: 3999,
    compareAtPrice: 5999,
    sku: "PT-BOOK-002",
    status: "ACTIVE",
    isTrending: true,
    avgRating: 4.7,
    reviewCount: 456,
    totalSold: 2200,
    categorySlug: "books-stationery",
    brandSlug: "pageturner",
    images: [
      { url: "https://picsum.photos/seed/fictionbooks1/600/600", alt: "Fiction book collection" },
    ],
    weight: 800,
  },
  {
    name: "Watercolor Paint Set — 36 Colors",
    slug: "watercolor-paint-set-36-colors",
    description: "Professional-grade watercolor paints in 36 vibrant colors. Includes mixing palette, brushes, and portable tin case. High pigment concentration.",
    shortDescription: "36-color professional watercolor set",
    price: 2999,
    compareAtPrice: 4499,
    sku: "PT-BOOK-003",
    status: "ACTIVE",
    isNewArrival: true,
    avgRating: 4.6,
    reviewCount: 189,
    totalSold: 980,
    categorySlug: "books-stationery",
    brandSlug: "pageturner",
    images: [
      { url: "https://picsum.photos/seed/watercolor1/600/600", alt: "Watercolor paint set" },
    ],
    weight: 420,
  },

  // ── Toys & Games ──────────────────────────────────────
  {
    name: "Strategy Board Game — Empire",
    slug: "strategy-board-game-empire",
    description: "Award-winning strategy board game for 2-6 players. Build civilizations, trade resources, and conquer territories. Average game time: 90 min.",
    shortDescription: "Strategy board game for 2-6 players",
    price: 3499,
    compareAtPrice: 4999,
    sku: "PZ-TOYS-001",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    avgRating: 4.8,
    reviewCount: 567,
    totalSold: 2800,
    categorySlug: "toys-games",
    brandSlug: "playzone",
    images: [
      { url: "https://picsum.photos/seed/boardgame1/600/600", alt: "Strategy board game" },
    ],
    weight: 1200,
  },
  {
    name: "STEM Robotics Building Kit",
    slug: "stem-robotics-building-kit",
    description: "Build and program 12 different robots with this STEM kit. Includes motors, sensors, and app-based coding for ages 8+. No tools required.",
    shortDescription: "Build 12 robots — app-based coding",
    price: 4999,
    compareAtPrice: 6999,
    sku: "PZ-TOYS-002",
    status: "ACTIVE",
    isNewArrival: true,
    avgRating: 4.7,
    reviewCount: 234,
    totalSold: 1100,
    categorySlug: "toys-games",
    brandSlug: "playzone",
    images: [
      { url: "https://picsum.photos/seed/robotkit1/600/600", alt: "Robotics kit" },
    ],
    weight: 850,
  },
  {
    name: "1000-Piece Jigsaw Puzzle",
    slug: "1000-piece-jigsaw-puzzle",
    description: "Stunning landscape photography jigsaw puzzle. 1000 premium pieces with snap-fit technology. Finished size: 68×49cm. Includes reference poster.",
    shortDescription: "1000-piece premium jigsaw puzzle",
    price: 1999,
    compareAtPrice: 2999,
    sku: "PZ-TOYS-003",
    status: "ACTIVE",
    isTrending: true,
    avgRating: 4.5,
    reviewCount: 890,
    totalSold: 5400,
    categorySlug: "toys-games",
    brandSlug: "playzone",
    images: [
      { url: "https://picsum.photos/seed/puzzle1/600/600", alt: "Jigsaw puzzle" },
    ],
    weight: 680,
  },

  // ── Food & Beverages ──────────────────────────────────────
  {
    name: "Artisan Coffee Bean Blend",
    slug: "artisan-coffee-bean-blend",
    description: "Single-origin Arabica beans from Colombia, medium roast with notes of caramel, cherry, and dark chocolate. Fair trade certified. 500g bag.",
    shortDescription: "Colombian Arabica — medium roast 500g",
    price: 1899,
    compareAtPrice: 2499,
    sku: "NB-FOOD-001",
    status: "ACTIVE",
    isFeatured: true,
    isTrending: true,
    avgRating: 4.8,
    reviewCount: 1245,
    totalSold: 9800,
    categorySlug: "food-beverages",
    brandSlug: "naturebite",
    images: [
      { url: "https://picsum.photos/seed/coffeebeans1/600/600", alt: "Coffee bean bag" },
    ],
    weight: 500,
  },
  {
    name: "Organic Matcha Green Tea Powder",
    slug: "organic-matcha-green-tea-powder",
    description: "Ceremonial grade organic matcha from Uji, Japan. Stone-ground for smooth, umami-rich flavor. Rich in antioxidants. 100g tin.",
    shortDescription: "Ceremonial grade organic matcha — 100g",
    price: 2999,
    compareAtPrice: 3999,
    sku: "NB-FOOD-002",
    status: "ACTIVE",
    isNewArrival: true,
    avgRating: 4.7,
    reviewCount: 345,
    totalSold: 2100,
    categorySlug: "food-beverages",
    brandSlug: "naturebite",
    images: [
      { url: "https://picsum.photos/seed/matcha1/600/600", alt: "Matcha powder tin" },
    ],
    weight: 150,
  },
  {
    name: "Mixed Nuts & Dried Fruit Box",
    slug: "mixed-nuts-dried-fruit-box",
    description: "Gourmet gift box with 6 varieties of premium nuts and 4 types of dried fruits. No added sugar or preservatives. 750g total.",
    shortDescription: "Gourmet nuts & fruit gift box — 750g",
    price: 2499,
    compareAtPrice: 3499,
    sku: "NB-FOOD-003",
    status: "ACTIVE",
    isFeatured: true,
    avgRating: 4.6,
    reviewCount: 678,
    totalSold: 3400,
    categorySlug: "food-beverages",
    brandSlug: "naturebite",
    images: [
      { url: "https://picsum.photos/seed/nutsbox1/600/600", alt: "Nuts and fruit box" },
    ],
    weight: 750,
  },
  {
    name: "Cold-Pressed Extra Virgin Olive Oil",
    slug: "cold-pressed-extra-virgin-olive-oil",
    description: "First cold-pressed olive oil from Greek Kalamata olives. Rich, fruity flavor with peppery finish. Dark glass bottle to preserve freshness. 500ml.",
    shortDescription: "Greek Kalamata EVOO — cold-pressed 500ml",
    price: 1499,
    compareAtPrice: 2299,
    sku: "NB-FOOD-004",
    status: "ACTIVE",
    avgRating: 4.5,
    reviewCount: 234,
    totalSold: 1800,
    categorySlug: "food-beverages",
    brandSlug: "naturebite",
    images: [
      { url: "https://picsum.photos/seed/oliveoil1/600/600", alt: "Olive oil bottle" },
    ],
    weight: 750,
  },
];

async function main() {
  console.log("Seeding database...\n");

  // ── Categories ──────────────────────────────────────
  console.log("Seeding categories...");
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, image: cat.image, position: cat.position },
      create: cat,
    });
    catSlugToId[cat.slug] = created.id;
    console.log(`  ✓ ${cat.name}`);
  }

  // ── Brands ──────────────────────────────────────
  console.log("\nSeeding brands...");
  for (const brand of BRANDS) {
    const created = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, description: brand.description, logo: brand.logo },
      create: brand,
    });
    brandSlugToId[brand.slug] = created.id;
    console.log(`  ✓ ${brand.name}`);
  }

  // ── Products ──────────────────────────────────────
  console.log("\nSeeding products...");
  let productCount = 0;

  for (const product of PRODUCTS) {
    const categoryId = catSlugToId[product.categorySlug];
    const brandId = brandSlugToId[product.brandSlug];

    if (!categoryId || !brandId) {
      console.log(`  ✗ Skipping ${product.name} — missing category or brand`);
      continue;
    }

    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAtPrice: product.compareAtPrice ?? null,
        costPrice: product.costPrice ?? null,
        sku: product.sku,
        status: product.status,
        isFeatured: product.isFeatured ?? false,
        isTrending: product.isTrending ?? false,
        isNewArrival: product.isNewArrival ?? false,
        avgRating: product.avgRating,
        reviewCount: product.reviewCount,
        totalSold: product.totalSold,
        weight: product.weight ?? null,
        categoryId,
        brandId,
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAtPrice: product.compareAtPrice ?? null,
        costPrice: product.costPrice ?? null,
        sku: product.sku,
        status: product.status,
        isFeatured: product.isFeatured ?? false,
        isTrending: product.isTrending ?? false,
        isNewArrival: product.isNewArrival ?? false,
        avgRating: product.avgRating,
        reviewCount: product.reviewCount,
        totalSold: product.totalSold,
        weight: product.weight ?? null,
        categoryId,
        brandId,
      },
    });

    // Upsert images (delete existing, recreate)
    await prisma.productImage.deleteMany({ where: { productId: created.id } });
    await prisma.productImage.createMany({
      data: product.images.map((img, idx) => ({
        url: img.url,
        alt: img.alt,
        position: idx,
        productId: created.id,
      })),
    });

    productCount++;
    console.log(`  ✓ ${product.name} ($${(product.price / 100).toFixed(2)})`);
  }

  console.log(`\nDone! Created ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${productCount} products.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
