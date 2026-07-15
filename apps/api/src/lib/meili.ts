import { MeiliSearch } from "meilisearch";
import { config } from "../config/env";

const globalForMeili = globalThis as unknown as {
  meili: MeiliSearch | undefined;
};

export const meili =
  globalForMeili.meili ??
  new MeiliSearch({
    host: config.meilisearch.host,
    apiKey: config.meilisearch.apiKey,
  });

if (config.nodeEnv !== "production") {
  globalForMeili.meili = meili;
}

export const PRODUCT_INDEX = "products";

export async function ensureIndexes(): Promise<void> {
  try {
    const indexes = await meili.getIndexes();
    const existingUids = indexes.results.map((i) => i.uid);

    if (!existingUids.includes(PRODUCT_INDEX)) {
      await meili.createIndex(PRODUCT_INDEX, { primaryKey: "id" });
    }

    const index = meili.index(PRODUCT_INDEX);
    await index.updateSettings({
      searchableAttributes: [
        "name",
        "description",
        "category",
        "brand",
        "sku",
      ],
      filterableAttributes: [
        "categoryId",
        "brandId",
        "price",
        "avgRating",
        "status",
        "isFeatured",
        "isTrending",
        "isNewArrival",
      ],
      sortableAttributes: [
        "price",
        "avgRating",
        "totalSold",
        "createdAt",
        "reviewCount",
      ],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
      },
    });
  } catch (error) {
    console.error("Meilisearch index setup failed:", error);
  }
}

export async function indexProduct(product: Record<string, unknown>): Promise<void> {
  try {
    await meili.index(PRODUCT_INDEX).addDocuments([product]);
  } catch (error) {
    console.error("Meilisearch indexing failed:", error);
  }
}

export async function removeProduct(id: string): Promise<void> {
  try {
    await meili.index(PRODUCT_INDEX).deleteDocument(id);
  } catch (error) {
    console.error("Meilisearch removal failed:", error);
  }
}

export async function searchProducts(query: string, options: Record<string, unknown> = {}) {
  try {
    return await meili.index(PRODUCT_INDEX).search(query, options);
  } catch (error) {
    console.error("Meilisearch search failed:", error);
    return { hits: [], estimatedTotalHits: 0 };
  }
}

export default meili;
