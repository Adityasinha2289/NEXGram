import apiClient from "./client";

export interface OrderItemCreate {
  catalogue_item_id: string;
  quantity: number;
}

export interface OrderCreate {
  distributor_id: string;
  items: OrderItemCreate[];
  notes?: string;
}

export interface OrderItemResponse {
  id: string;
  catalogue_item_id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface OrderStatusHistoryResponse {
  id: string;
  previous_status?: string;
  new_status: string;
  changed_by?: string;
  reason?: string;
  created_at: string;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  retailer_id: string;
  distributor_id: string;
  retailer_name: string;
  distributor_name: string;
  status: string;
  item_count: number;
  subtotal: number;
  total: number;
  created_at: string;
  updated_at?: string;
}

export interface OrderDetail extends OrderSummary {
  notes?: string;
  accepted_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  items: OrderItemResponse[];
  history: OrderStatusHistoryResponse[];
}

export interface OrderStatusUpdate {
  status: string;
  reason?: string;
}

export const ordersApi = {
  createOrder: async (data: OrderCreate): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>("/orders", data);
    return response.data;
  },

  getOrders: async (params?: { page?: number; page_size?: number }): Promise<{
    items: OrderSummary[];
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
  }> => {
    const response = await apiClient.get("/orders", { params });
    return response.data;
  },

  getOrderDetail: async (id: string): Promise<OrderDetail> => {
    const response = await apiClient.get<OrderDetail>(`/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: string, update: OrderStatusUpdate): Promise<OrderDetail> => {
    const response = await apiClient.patch<OrderDetail>(`/orders/${id}/status`, update);
    return response.data;
  }
};
