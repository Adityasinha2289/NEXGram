import apiClient from "./client";

export interface DemandSignal {
  id: number | string;
  location?: string;
  product?: string;
  demand?: number;
  [key: string]: unknown;
}

export interface Opportunity {
  id: number | string;
  location: string;
  product: string;
  score: number;
  potential: string;
  [key: string]: unknown;
}

export interface RetailerDashboard {
  overview: {
    totalRevenue: number;
    activeOrders: number;
    inventoryAlerts: number;
  };
  demandSignals: DemandSignal[];
  opportunities: Opportunity[];
}

export interface DistributorDashboard {
  overview: {
    totalSales: number;
    activeRetailers: number;
    pendingOrders: number;
  };
  supplyGaps: DemandSignal[];
  topOpportunities: Opportunity[];
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

  getDeveloperPack: async () => {
    const { data } = await apiClient.get("/intelligence/developer-pack");
    return data;
  },

  getMarketOptions: async (query?: string, categoryId?: string) => {
    const { data } = await apiClient.get("/intelligence/market", {
      params: { q: query, category_id: categoryId },
    });
    return data;
  },

  getReorderSuggestions: async (limit: number = 25) => {
    const { data } = await apiClient.get("/intelligence/reorder", {
      params: { limit },
    });
    return data;
  },

  getOpportunities: async (params?: { limit?: number; offset?: number; min_score?: number }) => {
    const { data } = await apiClient.get("/intelligence/opportunities", { params });
    return data;
  },

  getOpportunity: async (id: string) => {
    const { data } = await apiClient.get(`/intelligence/opportunities/${id}`);
    return data;
  },

};
