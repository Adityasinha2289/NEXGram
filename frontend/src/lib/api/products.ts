import apiClient from "./client";

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  level?: number;
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

/**
 * One supplier's listing of a product.
 *
 * `id` is the catalogue item id, which is what POST /orders wants. The product
 * page used to add a *variant* id to the cart alongside a hardcoded
 * "demo-distributor-id" and a made-up ₹500, so every order built from it was
 * refused by the server.
 */
export interface SupplierOffer {
  id: string;
  distributor_id: string;
  distributor_name: string;
  distributor_location: string | null;
  variant_id: string;
  variant_name: string;
  pack_size: string | null;
  price: number;
  moq: number;
  stock: number;
  stock_status: string;
  delivery_time: string | null;
}

export interface ProductWithSuppliers extends ProductResponse {
  offers: SupplierOffer[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

export const productsApi = {
  getProducts: async (params?: {
    search?: string;
    category_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<Paginated<ProductResponse>> => {
    const response = await apiClient.get<Paginated<ProductResponse>>("/products", { params });
    return response.data;
  },

  getProduct: async (id: string): Promise<ProductResponse> => {
    const response = await apiClient.get<ProductResponse>(`/products/${id}`);
    return response.data;
  },

  /** The product plus every local supplier who lists it, with real prices. */
  getProductWithSuppliers: async (id: string): Promise<ProductWithSuppliers> => {
    const response = await apiClient.get<ProductWithSuppliers>(`/products/${id}/suppliers`);
    return response.data;
  },
};

export const categoriesApi = {
  getCategories: async (): Promise<CategoryResponse[]> => {
    const response = await apiClient.get<CategoryResponse[]>("/categories");
    return response.data;
  },
};
