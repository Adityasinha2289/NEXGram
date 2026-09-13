import apiClient from "./client";

/*
 * These types describe what /api/intelligence actually returns.
 *
 * They previously described something else entirely - a RetailerDashboard of
 * { overview: { totalRevenue, activeOrders, inventoryAlerts } } that no endpoint
 * has ever produced - so `dashboardData?.overview?.totalRevenue` was always
 * undefined and every dashboard fell through to its hardcoded placeholder. The
 * shapes below were taken from the running API.
 */

export interface LocationSummary {
  area: string;
  district: string;
}

/** One line of a budget-aware stock plan. */
export interface PackItem {
  id: string;
  productId: string;
  name: string;
  category: string;
  variant: string;
  unit: string;
  suggestedQuantity: number;
  price: number;
  lineTotal: number;
  minimumOrderQuantity: number;
  availability: string;
  stockCapped: boolean;
  distributorId: string;
  distributorName: string;
  /** Why the engine put this line in the plan. */
  reason: string;
  retailers: number;
  suppliers: number;
}

export interface SkippedItem {
  name: string;
  reason: string;
}

/** Which local supplier can fill the most of a plan, and for how much. */
export interface DistributorMatch {
  distributorId: string;
  distributorName: string;
  productsFulfilled: number;
  productsRequested: number;
  fulfilmentPercent: number;
  fulfilmentStatus: string;
  estimatedTotal: number;
  distanceKm: number | null;
  sameArea: boolean;
  reasons: string[];
}

export interface DeveloperPack {
  title: string;
  description?: string;
  items: PackItem[];
  estimatedTotal: number;
  budget: { min: number; max: number | null } | null;
  skipped: SkippedItem[];
  distributorMatches?: DistributorMatch[];
}

export interface RecommendedProduct {
  id: string;
  name: string;
  category: string;
  demand: string;
  demandBadge: string;
  availability: string;
  availabilityBadge: string;
  retailers: number;
  suppliers: number;
}

export interface ReorderItem {
  id: string;
  productId: string;
  productVariantId: string;
  name: string;
  category: string;
  variant: string;
  unit: string;
  price: number | null;
  lastPaidPrice: number;
  minimumOrderQuantity: number;
  distributorId: string;
  distributorName: string;
  lastOrderedDate: string;
  daysAgo: number;
  timesOrdered: number;
  cadenceDays: number | null;
  dueNow: boolean;
  /** False when no live listing backs this row; `id` is then a product id. */
  available: boolean;
  suggestion: string;
}

export interface NearbyDistributor {
  id: string;
  name: string;
  categories: string;
  distance: string;
  distanceKm: number | null;
  delivery: string;
}

export interface DashboardReorderItem {
  id: string;
  name: string;
  lastOrdered: string;
  daysAgo: number | null;
}

export interface RetailerDashboard {
  businessName: string;
  location: LocationSummary;
  developerPack: DeveloperPack;
  snapshot: {
    health: string;
    healthLabel: string;
    demand: string;
    demandLabel: string;
    opportunity: string;
    opportunityLabel: string;
  };
  recommendedProducts: RecommendedProduct[];
  reorderItems: DashboardReorderItem[];
  nearbyDistributors: NearbyDistributor[];
}

export interface DemandGap {
  id: string;
  category: string;
  product: string;
  demand: string;
  retailers: number;
  supply: string;
  opportunity: string;
  badgeVariant: string;
  score: number;
  confidence: string;
}

export interface DistributorDashboard {
  businessName: string;
  location: LocationSummary;
  snapshot: {
    opportunityScore: string;
    opportunityLabel: string;
    opportunityTier: string;
    opportunityVariant: string;
    retailersLooking: number;
    retailersLabel: string;
  };
  demandGaps: DemandGap[];
  retailerDemand: { id: string; category: string; count: number }[];
  orders: { pending: number; ready: number; completed: number };
  catalogue: { totalProducts: number; totalCategories: number };
  opportunityCount: number;
}

/** One scored component of an opportunity, with what produced the points. */
export interface EvidenceLine {
  label: string;
  points: number;
  max: number;
  detail: string;
  /** OBSERVED is counted from real rows; MODEL_INFERENCE is derived. */
  source_type: "OBSERVED" | "MODEL_INFERENCE" | string;
}

export interface OpportunityEvidence {
  demand?: string;
  supply?: string;
  competition?: string;
  fit?: string;
  summary?: string;
  confidence?: string;
  breakdown?: EvidenceLine[];
  total?: number;
}

export interface Opportunity {
  id: string;
  name: string;
  category: string;
  isProduct: boolean;
  productId: string | null;
  defaultVariantId: string | null;
  defaultVariantName: string | null;
  area: string;
  district: string;
  score: number;
  tier: string;
  tierVariant: string;
  confidence: string;
  retailerCount: number;
  supplierCount: number;
  availableSupplierCount: number;
  supplyLabel: string;
  recommendedInitialStock: number;
  distributorFit: string | null;
  components: { demand: number; scarcity: number; fit: number };
  evidence: OpportunityEvidence;
  generatedAt: string | null;
  /**
   * Generated server-side and checked against the evidence it describes, so a
   * sentence can never state a figure the engine did not produce. `verified`
   * is false when that check failed and the text should not be trusted.
   */
  explanation: { text: string; verified: boolean; source: string };
}

export interface OpportunityPage {
  items: Opportunity[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface MarketOffer {
  catalogueItemId: string;
  distributorId: string;
  distributorName: string;
  variant: string;
  price: number;
  minimumOrderQuantity: number;
  availableStock: number;
  deliveryTime: string | null;
  sameArea: boolean;
}

export interface MarketResult {
  productId: string;
  name: string;
  category: string;
  retailersAsking: number;
  offers: MarketOffer[];
  bestPrice: number;
  bestDistributorName: string;
  supplierCount: number;
  priceSpread: number;
  comparableVariant: string | null;
}

export interface Alert {
  id: string;
  type: "opportunity" | "order" | "reorder";
  severity: string;
  title: string;
  body: string;
  confidence: string | null;
  at: string | null;
  age: string;
  link: string;
}

export interface DemandReport {
  product: string | null;
  productId: string | null;
  category: string | null;
  note: string;
  reportedAt: string;
}

export const intelligenceApi = {
  getRetailerDashboard: async (): Promise<RetailerDashboard> => {
    const { data } = await apiClient.get<RetailerDashboard>(
      "/intelligence/dashboard/retailer",
    );
    return data;
  },

  getDistributorDashboard: async (): Promise<DistributorDashboard> => {
    const { data } = await apiClient.get<DistributorDashboard>(
      "/intelligence/dashboard/distributor",
    );
    return data;
  },

  getDeveloperPack: async (): Promise<DeveloperPack> => {
    const { data } = await apiClient.get<DeveloperPack>("/intelligence/developer-pack");
    return data;
  },

  getDeveloperPackOptions: async (): Promise<PackItem[]> => {
    const { data } = await apiClient.get<PackItem[]>("/intelligence/developer-pack/options");
    return data;
  },

  searchMarket: async (query?: string, categoryId?: string): Promise<MarketResult[]> => {
    const { data } = await apiClient.get<MarketResult[]>("/intelligence/market", {
      params: { q: query || undefined, category_id: categoryId || undefined },
    });
    return data;
  },

  getReorderSuggestions: async (limit: number = 25): Promise<ReorderItem[]> => {
    const { data } = await apiClient.get<ReorderItem[]>("/intelligence/reorder", {
      params: { limit },
    });
    return data;
  },

  getOpportunities: async (params?: {
    limit?: number;
    offset?: number;
    min_score?: number;
  }): Promise<OpportunityPage> => {
    const { data } = await apiClient.get<OpportunityPage>("/intelligence/opportunities", {
      params,
    });
    return data;
  },

  getOpportunity: async (id: string): Promise<Opportunity> => {
    const { data } = await apiClient.get<Opportunity>(`/intelligence/opportunities/${id}`);
    return data;
  },

  getAlerts: async (): Promise<{ items: Alert[]; count: number }> => {
    const { data } = await apiClient.get<{ items: Alert[]; count: number }>(
      "/intelligence/alerts",
    );
    return data;
  },

  getDemandReports: async (): Promise<DemandReport[]> => {
    const { data } = await apiClient.get<DemandReport[]>("/intelligence/demand-reports");
    return data;
  },

  reportDemand: async (payload: {
    product_id?: string | null;
    product_name?: string | null;
    category_name?: string | null;
    note?: string;
  }): Promise<DemandReport> => {
    const { data } = await apiClient.post<DemandReport>("/intelligence/demand-reports", payload);
    return data;
  },

  /**
   * Recomputes demand -> supply gaps -> opportunities.
   *
   * Adding stock or editing a profile changes the signals everyone else is
   * scored against. The engines upsert on deterministic ids, so repeat calls
   * are harmless.
   */
  refresh: async (): Promise<unknown> => {
    const { data } = await apiClient.post("/intelligence/refresh");
    return data;
  },
};
