import { PrismaClient, ProductStatus, DiscountType } from "@prisma/client";
const prisma = new PrismaClient();
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
const categories = [
    { name: "Electronics", description: "Gadgets, devices, and tech essentials" },
    { name: "Clothing", description: "Fashion for every occasion" },
    { name: "Home & Living", description: "Furnish and beautify your space" },
    { name: "Books", description: "Fiction, non-fiction, and educational" },
    { name: "Sports", description: "Gear and equipment for active lifestyles" },
    { name: "Beauty", description: "Skincare, makeup, and personal care" },
    { name: "Accessories", description: "Complete your look" },
    { name: "Toys", description: "Fun for all ages" },
    { name: "Automotive", description: "Car parts and accessories" },
    { name: "Health", description: "Wellness and health products" },
];
const brands = [
    { name: "TechNova", description: "Cutting-edge technology products" },
    { name: "UrbanEdge", description: "Modern urban fashion" },
    { name: "HomeCraft", description: "Premium home furnishings" },
    { name: "FitPro", description: "Professional fitness equipment" },
    { name: "GlowUp", description: "Beauty and skincare essentials" },
    { name: "ReadMore", description: "Curated book collections" },
    { name: "PlayTime", description: "Quality toys and games" },
    { name: "AutoWorks", description: "Automotive accessories and parts" },
    { name: "WellLife", description: "Health and wellness products" },
    { name: "StyleHub", description: "Trendy accessories and more" },
];
const productTemplates = [
    { name: "Wireless Earbuds Pro", category: "Electronics", price: 7999, compareAtPrice: 9999, description: "Premium wireless earbuds with active noise cancellation, 30-hour battery life, and crystal-clear audio quality." },
    { name: "Smart Watch Ultra", category: "Electronics", price: 24999, compareAtPrice: 29999, description: "Advanced smartwatch with health monitoring, GPS, and 7-day battery life." },
    { name: "Bluetooth Speaker", category: "Electronics", price: 4999, compareAtPrice: 6999, description: "Portable waterproof speaker with 360-degree sound and 20-hour playback." },
    { name: "USB-C Hub Adapter", category: "Electronics", price: 3499, compareAtPrice: 4499, description: "7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader, and power delivery." },
    { name: "Mechanical Keyboard", category: "Electronics", price: 12999, compareAtPrice: 15999, description: "RGB mechanical keyboard with hot-swappable switches and aluminum frame." },
    { name: "Cotton Crew Neck T-Shirt", category: "Clothing", price: 2499, compareAtPrice: 3499, description: "Premium 100% organic cotton t-shirt with a comfortable relaxed fit." },
    { name: "Slim Fit Chinos", category: "Clothing", price: 4999, compareAtPrice: 6499, description: "Modern slim-fit chinos with stretch fabric for all-day comfort." },
    { name: "Denim Jacket", category: "Clothing", price: 8999, compareAtPrice: 11999, description: "Classic denim jacket with vintage wash and brass button closure." },
    { name: "Merino Wool Sweater", category: "Clothing", price: 6999, compareAtPrice: 8999, description: "Soft merino wool sweater perfect for layering in cooler weather." },
    { name: "Running Sneakers", category: "Clothing", price: 11999, compareAtPrice: 14999, description: "Lightweight running shoes with responsive cushioning and breathable mesh." },
    { name: "Minimalist Desk Lamp", category: "Home & Living", price: 3999, compareAtPrice: 5499, description: "LED desk lamp with adjustable brightness and color temperature." },
    { name: "Ceramic Plant Pot Set", category: "Home & Living", price: 2999, compareAtPrice: 3999, description: "Set of 3 handmade ceramic plant pots in matte white finish." },
    { name: "Memory Foam Pillow", category: "Home & Living", price: 4499, compareAtPrice: 5999, description: "Ergonomic memory foam pillow with cooling gel layer for better sleep." },
    { name: "Scented Candle Set", category: "Home & Living", price: 3499, compareAtPrice: 4499, description: "Hand-poured soy wax candles in 3 relaxing scents: lavender, vanilla, and cedar." },
    { name: "Bestseller Novel Collection", category: "Books", price: 1999, compareAtPrice: 2999, description: "Collection of 3 award-winning contemporary fiction novels." },
    { name: "Yoga Mat Premium", category: "Sports", price: 3999, compareAtPrice: 5499, description: "Non-slip eco-friendly yoga mat with alignment markers and carrying strap." },
    { name: "Adjustable Dumbbell Set", category: "Sports", price: 29999, compareAtPrice: 39999, description: "Space-saving adjustable dumbbells ranging from 5 to 50 lbs each." },
    { name: "Vitamin C Serum", category: "Beauty", price: 2499, compareAtPrice: 3499, description: "Brightening vitamin C serum with hyaluronic acid for radiant skin." },
    { name: "Skincare Gift Set", category: "Beauty", price: 5999, compareAtPrice: 7999, description: "Luxurious skincare set with cleanser, toner, moisturizer, and serum." },
    { name: "Leather Crossbody Bag", category: "Accessories", price: 7999, compareAtPrice: 9999, description: "Genuine leather crossbody bag with adjustable strap and multiple compartments." },
    { name: "Stainless Steel Watch", category: "Accessories", price: 14999, compareAtPrice: 19999, description: "Elegant stainless steel watch with Japanese quartz movement." },
    { name: "Building Block Set", category: "Toys", price: 3499, compareAtPrice: 4499, description: "500-piece building block set for creative play and STEM learning." },
    { name: "RC Racing Car", category: "Toys", price: 2499, compareAtPrice: 3499, description: "High-speed remote control car with rechargeable battery and 30-min runtime." },
    { name: "Car Phone Mount", category: "Automotive", price: 1499, compareAtPrice: 2499, description: "Universal car phone mount with one-hand operation and 360-degree rotation." },
    { name: "Fitness Tracker Band", category: "Health", price: 4999, compareAtPrice: 6999, description: "Track heart rate, steps, sleep, and workouts with this slim fitness band." },
];
const reviewTitles = [
    "Excellent product!", "Great value for money", "Exceeded expectations",
    "Good quality", "Love it!", "Highly recommend", "Fast shipping",
    "Perfect for everyday use", "Amazing quality", "Worth every penny",
];
const reviewComments = [
    "This product is exactly what I was looking for. The quality is outstanding and it arrived quickly.",
    "Very impressed with the build quality. It feels premium and works perfectly.",
    "Good value for the price. I've been using it daily and it holds up well.",
    "The design is sleek and modern. Fits perfectly with my setup.",
    "Shipping was fast and the product was well-packaged. No complaints!",
    "I've tried many similar products and this one is by far the best.",
    "The features are exactly as described. No false advertising here.",
    "Customer service was helpful when I had a question. Great experience.",
    "Bought this as a gift and the recipient loved it. Would buy again.",
    "Solid product with great attention to detail. Highly recommended.",
];
function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function main() {
    console.log("Seeding database...");
    // Create categories
    const createdCategories = [];
    for (const cat of categories) {
        const category = await prisma.category.upsert({
            where: { slug: generateSlug(cat.name) },
            update: {},
            create: {
                name: cat.name,
                slug: generateSlug(cat.name),
                description: cat.description,
                isActive: true,
            },
        });
        createdCategories.push(category);
    }
    console.log(`Created ${createdCategories.length} categories`);
    // Create brands
    const createdBrands = [];
    for (const brand of brands) {
        const createdBrand = await prisma.brand.upsert({
            where: { slug: generateSlug(brand.name) },
            update: {},
            create: {
                name: brand.name,
                slug: generateSlug(brand.name),
                description: brand.description,
                isActive: true,
            },
        });
        createdBrands.push(createdBrand);
    }
    console.log(`Created ${createdBrands.length} brands`);
    // Create products
    const createdProducts = [];
    for (let i = 0; i < productTemplates.length; i++) {
        const template = productTemplates[i];
        const category = createdCategories.find((c) => c.name === template.category);
        const brand = createdBrands[i % createdBrands.length];
        const slug = generateSlug(template.name) + `-${i + 1}`;
        const product = await prisma.product.upsert({
            where: { slug },
            update: {},
            create: {
                name: template.name,
                slug,
                description: template.description,
                shortDescription: template.description.slice(0, 120),
                sku: `PN-${String(i + 1).padStart(5, "0")}`,
                price: template.price,
                compareAtPrice: template.compareAtPrice,
                status: ProductStatus.ACTIVE,
                isFeatured: i < 8,
                isTrending: i < 6,
                isNewArrival: i >= productTemplates.length - 4,
                categoryId: category?.id,
                brandId: brand?.id,
                avgRating: 4.5,
                reviewCount: 0,
                totalSold: randomInt(10, 200),
                images: {
                    create: {
                        url: `https://picsum.photos/seed/${slug}/600/600`,
                        alt: template.name,
                        position: 0,
                    },
                },
                variants: {
                    create: [
                        { name: "Default", price: template.price, stock: randomInt(10, 50), options: {} },
                        { name: "Large", price: template.price + 2000, stock: randomInt(5, 30), options: { size: "L" } },
                    ],
                },
                specifications: {
                    create: [
                        { name: "Brand", value: brand.name, position: 0 },
                        { name: "Category", value: template.category, position: 1 },
                        { name: "SKU", value: `PN-${String(i + 1).padStart(5, "0")}`, position: 2 },
                    ],
                },
            },
        });
        createdProducts.push(product);
    }
    console.log(`Created ${createdProducts.length} products`);
    // Create coupons
    const coupons = [
        { code: "WELCOME10", discountType: DiscountType.PERCENTAGE, discountValue: 10, minOrderAmount: 5000, description: "Welcome discount - 10% off" },
        { code: "FREESHIP", discountType: DiscountType.FREE_SHIPPING, discountValue: 0, description: "Free shipping on your order" },
        { code: "VIP20", discountType: DiscountType.PERCENTAGE, discountValue: 20, minOrderAmount: 10000, maxDiscountAmount: 5000, description: "VIP discount - 20% off" },
        { code: "SAVE5", discountType: DiscountType.FIXED, discountValue: 500, minOrderAmount: 3000, description: "$5 off your order" },
    ];
    for (const coupon of coupons) {
        await prisma.coupon.upsert({
            where: { code: coupon.code },
            update: {},
            create: {
                ...coupon,
                isActive: true,
            },
        });
    }
    console.log(`Created ${coupons.length} coupons`);
    // Create banners
    const banners = [
        {
            title: "Summer Sale",
            subtitle: "Up to 50% off on selected items",
            image: "https://picsum.photos/seed/banner1/1200/400",
            position: "HERO",
            positionOrder: 0,
        },
        {
            title: "New Arrivals",
            subtitle: "Check out the latest collection",
            image: "https://picsum.photos/seed/banner2/1200/400",
            position: "HERO",
            positionOrder: 1,
        },
        {
            title: "Free Shipping",
            subtitle: "On orders over $150",
            image: "https://picsum.photos/seed/banner3/600/300",
            position: "PROMO",
            positionOrder: 0,
        },
    ];
    for (const banner of banners) {
        await prisma.banner.create({ data: banner });
    }
    console.log("Created banners");
    // Create collections
    const collectionData = [
        { name: "Best Sellers", slug: "best-sellers", description: "Our most popular products" },
        { name: "New Arrivals", slug: "new-arrivals", description: "Fresh finds just for you" },
        { name: "Under $50", slug: "under-50", description: "Great products under $50" },
    ];
    for (const coll of collectionData) {
        const collection = await prisma.collection.upsert({
            where: { slug: coll.slug },
            update: {},
            create: {
                name: coll.name,
                slug: coll.slug,
                description: coll.description,
                isActive: true,
            },
        });
        // Add some products to each collection
        const productsForCollection = createdProducts.slice(0, 6);
        for (let i = 0; i < productsForCollection.length; i++) {
            await prisma.productCollection.upsert({
                where: {
                    productId_collectionId: {
                        productId: productsForCollection[i].id,
                        collectionId: collection.id,
                    },
                },
                update: {},
                create: {
                    productId: productsForCollection[i].id,
                    collectionId: collection.id,
                    position: i,
                },
            });
        }
    }
    console.log("Created collections with products");
    console.log("Seed completed!");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map