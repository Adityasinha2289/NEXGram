import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * One line of a procurement order.
 *
 * `catalogue_item_id` is a *listing* id - one supplier's offer of one variant -
 * not a product or variant id, because that is what POST /orders resolves price
 * and stock against. `distributor_id` comes from the same listing: an order
 * belongs to exactly one supplier server-side, and the API refuses a payload
 * whose items belong to someone else.
 *
 * The MOQ and stock travel with the line so the cart can respect the limits the
 * server enforces instead of discovering them as a rejected checkout.
 */
export interface CartItem {
  catalogue_item_id: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  distributor_id: string;
  distributor_name: string;
  minimum_order_quantity: number;
  available_stock: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (catalogue_item_id: string) => void;
  updateQuantity: (catalogue_item_id: string, quantity: number) => void;
  clearCart: () => void;
  /** Drops just one supplier's lines, after their order is placed. */
  clearDistributor: (distributor_id: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.catalogue_item_id === item.catalogue_item_id
          );
          if (existing) {
            const merged = existing.quantity + item.quantity;
            return {
              items: state.items.map((i) =>
                i.catalogue_item_id === item.catalogue_item_id
                  ? { ...i, quantity: Math.min(merged, i.available_stock || merged) }
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
      clearDistributor: (distributor_id) =>
        set((state) => ({
          items: state.items.filter((i) => i.distributor_id !== distributor_id),
        })),
    }),
    {
      // Bumped because stored lines from the previous shape carry a variant id
      // where a catalogue item id belongs, and no distributor - an order built
      // from one could only ever be rejected.
      name: 'nexgram-cart-v2',
    }
  )
);

/** Groups the cart the way the API wants it: one order per supplier. */
export function groupBySupplier(items: CartItem[]) {
  const groups = new Map<string, { distributorId: string; distributorName: string; items: CartItem[]; total: number }>();
  for (const item of items) {
    const group = groups.get(item.distributor_id) ?? {
      distributorId: item.distributor_id,
      distributorName: item.distributor_name || 'Supplier',
      items: [],
      total: 0,
    };
    group.items.push(item);
    group.total += item.unit_price * item.quantity;
    groups.set(item.distributor_id, group);
  }
  return [...groups.values()];
}

/** Lines the server would refuse, so checkout can block before sending. */
export function linesBelowMoq(items: CartItem[]) {
  return items.filter((i) => i.quantity < (i.minimum_order_quantity || 1));
}
