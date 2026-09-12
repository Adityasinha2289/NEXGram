import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Search, Truck } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Input } from '../../../components/ui/Input';
import { List } from '../../../components/ui/List';
import { Meta, PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { CatalogueRow } from './components/CatalogueRow';
import { OrderDraftBar } from './components/OrderDraftBar';
import { distributorsApi } from '../../../services/api/distributorsApi';
import { ordersApi } from '../../../services/api/ordersApi';
import { useApiResource } from '../../../hooks/useApiResource';

const titleCase = (slug) => (slug
  ? slug.split(/[-_]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  : 'Uncategorised');

/**
 * One supplier's catalogue, and an order built from it.
 *
 * The draft lives in component state and is scoped to this supplier, because an
 * order is per-distributor on the server. It used to be written to
 * localStorage under the key "nexgram_retailer_developer_pack" — a second thing
 * called the Developer Pack that the actual, server-computed plan never read,
 * so adding a product here changed nothing anywhere else in the app.
 */
export function Catalogue() {
  const { distributorId } = useParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState({});
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderError, setOrderError] = useState(null);

  const fetcher = useCallback(
    async () => {
      const [distributor, catalogue] = await Promise.all([
        distributorsApi.getDistributor(distributorId),
        distributorsApi.getDistributorCatalogue(distributorId, { page_size: 100 }),
      ]);
      return { distributor, items: catalogue.items || [] };
    },
    [distributorId],
  );
  const { data, isLoading, error, reload } = useApiResource(fetcher);

  const products = useMemo(() => (data?.items || []).map((item) => ({
    id: item.id,
    name: item.product_name,
    variant: item.variant_name,
    category: titleCase(item.category_slug),
    price: item.selling_price,
    minimumOrderQuantity: item.minimum_order_quantity,
    availableStock: item.available_stock,
    stockStatus: item.stock_status,
    deliveryTime: item.delivery_time,
  })), [data]);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (p) => `${p.name} ${p.variant}`.toLowerCase().includes(query)
        || p.category.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const lines = useMemo(
    () => products
      .filter((p) => draft[p.id])
      .map((p) => ({ ...p, quantity: draft[p.id] })),
    [products, draft],
  );
  const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);

  const addToDraft = (product) => {
    setOrderError(null);
    setDraft((prev) => ({
      ...prev,
      // Starting below the minimum order quantity would only produce a
      // rejection from the server, so the first quantity is the MOQ.
      [product.id]: Math.min(product.minimumOrderQuantity, product.availableStock),
    }));
  };

  const setQuantity = (id, quantity) => setDraft((prev) => ({ ...prev, [id]: quantity }));

  const removeFromDraft = (id) => setDraft((prev) => {
    const next = { ...prev };
    delete next[id];
    return next;
  });

  const placeOrder = async () => {
    setIsPlacing(true);
    setOrderError(null);
    try {
      const order = await ordersApi.createOrder({
        distributor_id: distributorId,
        items: lines.map((line) => ({
          catalogue_item_id: line.id,
          quantity: line.quantity,
        })),
        notes: 'Catalogue se order',
      });
      setDraft({});
      navigate(`/retailer/orders/${order.id}`);
      return true;
    } catch (err) {
      setOrderError(err.message || 'Order nahi ja paya. Dobara try karein.');
      return false;
    } finally {
      setIsPlacing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonList rows={6} />
      </div>
    );
  }

  if (error) return <ErrorState description={error} onRetry={reload} />;

  if (!data?.distributor) {
    return (
      <EmptyState
        title="Catalogue nahi mila"
        description="Is distributor ka catalogue available nahi hai."
        actionLabel="Wapas jayein"
        onAction={() => navigate(-1)}
      />
    );
  }

  const { distributor } = data;
  const location = distributor.location || {};
  const locationLine = [location.area, location.district].filter(Boolean).join(', ');

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow={distributor.business_category || 'Supplier'}
        title={distributor.business_name}
        description="Jo chahiye woh order mein daalein — order bhejne se pehle poora summary dikhega."
        meta={
          <>
            {locationLine && <Meta icon={MapPin}>{locationLine}</Meta>}
            {distributor.service_radius && <Meta icon={Truck}>{distributor.service_radius}</Meta>}
          </>
        }
      />

      <Input
        icon={Search}
        type="search"
        placeholder="Is catalogue mein dhoondhein"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Catalogue mein dhoondhein"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title={products.length === 0 ? 'Catalogue khaali hai' : 'Koi product nahi mila'}
          description={
            products.length === 0
              ? 'Is distributor ne abhi koi product list nahi kiya.'
              : 'Apna search badal kar dekhiye.'
          }
        />
      ) : (
        <List>
          {visible.map((product) => (
            <CatalogueRow
              key={product.id}
              product={product}
              quantity={draft[product.id] || 0}
              onAdd={addToDraft}
              onChangeQuantity={setQuantity}
              onRemove={removeFromDraft}
            />
          ))}
        </List>
      )}

      <OrderDraftBar
        lines={lines}
        total={total}
        distributorName={distributor.business_name}
        isPlacing={isPlacing}
        error={orderError}
        onPlace={placeOrder}
      />
    </div>
  );
}
