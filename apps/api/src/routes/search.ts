import { FastifyPluginAsync } from "fastify";
import { searchProducts } from "../lib/meili";

export const searchRoutes: FastifyPluginAsync = async (app) => {
  // Search products via Meilisearch
  app.get("/", async (request, reply) => {
    const { q, page = 1, limit = 20, filters, sort } = request.query as {
      q?: string;
      page?: number;
      limit?: number;
      filters?: string;
      sort?: string;
    };

    if (!q || q.trim().length === 0) {
      return reply.code(400).send({
        success: false,
        error: "Search query is required",
      });
    }

    const filterArray: string[] = ["status = ACTIVE"];
    if (filters) {
      const filterParts = filters.split(",").map((f) => f.trim());
      filterArray.push(...filterParts);
    }

    const sortArray: string[] = [];
    if (sort) {
      sortArray.push(sort);
    }

    const result = await searchProducts(q, {
      filter: filterArray,
      sort: sortArray,
      limit,
      offset: (page - 1) * limit,
      attributesToHighlight: ["name"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
    });

    return {
      success: true,
      data: result.hits,
      pagination: {
        page,
        limit,
        total: result.estimatedTotalHits || 0,
        totalPages: Math.ceil((result.estimatedTotalHits || 0) / limit),
      },
    };
  });

  // Search suggestions (autocomplete)
  app.get("/suggestions", async (request, reply) => {
    const { q } = request.query as { q?: string };

    if (!q || q.trim().length < 2) {
      return { success: true, data: [] };
    }

    const result = await searchProducts(q, {
      limit: 8,
      attributesToRetrieve: ["id", "name", "slug", "price", "category"],
      attributesToHighlight: ["name"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
    });

    return { success: true, data: result.hits };
  });
};
