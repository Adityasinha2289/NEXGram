import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  catalogue_item_id: string; // The variant ID essentially
  product_id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number; // Stored here just for display
  distributor_id: string; // Used to group orders since orders go to specific distributors
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (catalogue_item_id: string) => void;
  updateQuantity: (catalogue_item_id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.catalogue_item_id === item.catalogue_item_id
          );
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.catalogue_item_id === item.catalogue_item_id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (catalogue_item_id) =>
        set((state) => ({
          items: state.items.filter((i) => i.catalogue_item_id !== catalogue_item_id),
        })),
      updateQuantity: (catalogue_item_id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.catalogue_item_id === catalogue_item_id ? { ...i, quantity } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'nexgram-cart',
    }
  )
);
