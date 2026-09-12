import apiClient from "./client";

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
}

export interface ProductVariantSchema {
  id: string;
  variant_name: string;
  pack_size?: string;
  unit?: string;
  barcode?: string;
}

export interface ProductResponse {
  id: string;
  canonical_name: string;
  normalized_name: string;
  brand?: string;
  description?: string;
  product_type?: string;
  category?: CategoryResponse;
  variants: ProductVariantSchema[];
}

export const productsApi = {
  getProducts: async (params?: { search?: string; category_id?: string; page?: number; page_size?: number }): Promise<{
    items: ProductResponse[];
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
  }> => {
    const response = await apiClient.get("/products", { params });
    return response.data;
  },

  getProduct: async (id: string): Promise<ProductResponse> => {
    const response = await apiClient.get<ProductResponse>(`/products/${id}`);
    return response.data;
  }
};
