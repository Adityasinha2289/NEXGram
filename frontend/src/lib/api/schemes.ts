import apiClient from "./client";

export interface SchemeCheck {
  label: string;
  status: "met" | "self_declare" | "not_met";
  reason: string;
}

export interface Scheme {
  id: string;
  name: string;
  authority: string;
  summary: string;
  benefit: string;
  documents: string[];
  source: string;
  applyAt: string;
  checks: SchemeCheck[];
  metCount: number;
  totalCount: number;
  verdict: string;
  verdictVariant: "success" | "warning" | "danger";
  disclaimer: string;
}

export interface SchemesResponse {
  role: string;
  schemes: Scheme[];
  totalCatalogued: number;
}

export const schemesApi = {
  getSchemes: async (): Promise<SchemesResponse> => {
    const response = await apiClient.get<SchemesResponse>("/schemes");
    return response.data;
  }
};
