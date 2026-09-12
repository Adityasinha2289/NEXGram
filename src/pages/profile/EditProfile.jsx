import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field } from '../../components/ui/FieldGroup';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { categoriesApi } from '../../services/api/categoriesApi';
import { intelligenceApi } from '../../services/api/intelligenceApi';
import { profilesApi } from '../../services/api/profilesApi';

const BUSINESS_TYPES = ['Kirana Store', 'General Store', 'Dairy Shop', 'Provision Store', 'Medical Store', 'Other'];
const SALES_RANGES = ['under-50000', '50000-100000', '100000-200000', '200000+'];
const BUDGETS = ['under-10000', '10000-25000', '25000-50000', '50000-100000', '100000+'];
const FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly'];
const RADIUS = ['0-5 km', '5-10 km', '10-20 km', '20+ km'];
const MIN_ORDERS = ['1000-3000', '3000-5000', '5000-10000', '10000+'];
const COVERAGE = ['less than 10 retailers', '10-20 retailers', '20-50 retailers', '50+ retailers'];
const DELIVERY = [
  { value: 'own', label: 'Apni delivery' },
  { value: 'staff', label: 'Delivery staff' },
  { value: 'transport', label: 'Transport partner' },
  { value: 'pickup', label: 'Retailer pickup' },
];
const STOCK_LEVELS = [
  { value: 'low', label: 'Kam' },
  { value: 'medium', label: 'Theek-thaak' },
  { value: 'high', label: 'Zyada' },
];

const money = (band) => {
  const parts = String(band).match(/\d+/g);
  if (!parts) return band;
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  if (String(band).startsWith('under')) return `${fmt(parts[0])} tak`;
  if (parts.length === 1) return `${fmt(parts[0])}+`;
  return `${fmt(parts[0])} – ${fmt(parts[1])}`;
};

/**
 * Editing a profile after onboarding.
 *
 * This is not cosmetic. A retailer's demand signal is derived entirely from
 * their categories, unmet needs and location, and a distributor's eligibility
 * for an opportunity comes from their categories and area. Without this screen
 * both are frozen at whatever was typed on the day they signed up.
 *
 * Category options come from the API rather than a hardcoded list, because a
 * value that does not match a real category resolves to nothing and produces a
 * signal the engine silently discards.
 */
export function EditProfile() {
  const navigate = useNavigate();
  const { currentUser, profile, setProfile } = useAuth();
  const role = currentUser?.role;

  const [values, setValues] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    categoriesApi.getCategories()
      .then((res) => {
        // The root "FMCG" node is a grouping, not something a shop stocks.
        setCategories(res.filter((c) => c.level !== 0).map((c) => c.name));
      })
      .catch(() => setCategories([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!profile?.profile_data) return;
    const data = profile.profile_data;
    setValues(
      role === 'retailer'
        ? {
            business_name: data.businessName || '',
            business_type: data.businessType || '',
            area: data.location?.area || '',
            district: data.location?.district || '',
            state: data.location?.state || '',
            demanded_categories: data.demandedCategories || [],
            unmet_categories: data.unmetNeeds?.categories || [],
            unmet_other: data.unmetNeeds?.other || '',
            monthly_sales_range: data.monthlyPurchaseRange || '',
            investment_budget: data.investmentBudget || '',
            purchase_frequency: data.purchasingFrequency || '',
          }
        : {
            business_name: data.businessName || '',
            business_category: data.businessCategory || '',
            area: data.location?.area || '',
            district: data.location?.district || '',
            state: data.location?.state || '',
            product_categories: data.productCategories || [],
            service_radius: data.serviceRadius || '',
            minimum_order_range: data.minimumOrderRange || '',
            retailer_coverage: data.retailerCoverage || '',
            delivery_capabilities: data.deliveryCapabilities || [],
            stock_level: data.stockCapacity?.level || '',
          },
    );
  }, [profile, role]);

  const fields = useMemo(() => {
    if (role === 'retailer') {
      return [
        { section: 'Business', items: [
          { key: 'business_name', label: 'Dukaan ka naam', type: 'text' },
          { key: 'business_type', label: 'Business type', type: 'select', options: BUSINESS_TYPES },
        ]},
        { section: 'Location', hint: 'Aapke area ke signals isi par aggregate hote hain.', items: [
          { key: 'area', label: 'Area / Market', type: 'text', placeholder: 'e.g. Palampur Market' },
          { key: 'district', label: 'District', type: 'text', placeholder: 'e.g. Kangra' },
          { key: 'state', label: 'State', type: 'text', placeholder: 'e.g. Himachal Pradesh' },
        ]},
        { section: 'Aap kya bechte hain', items: [
          { key: 'demanded_categories', label: 'Categories', type: 'multiselect', options: categories },
        ]},
        { section: 'Kya nahi milta', hint: 'Yahi aapke area ka demand signal banta hai.', items: [
          { key: 'unmet_categories', label: 'Categories jo kam padti hain', type: 'multiselect', options: categories },
          { key: 'unmet_other', label: 'Aur kuch?', type: 'textarea', placeholder: 'e.g. paneer roz maanga jaata hai' },
        ]},
        { section: 'Purchasing', items: [
          { key: 'monthly_sales_range', label: 'Monthly purchase', type: 'select',
            options: SALES_RANGES.map((v) => ({ value: v, label: money(v) })) },
          { key: 'investment_budget', label: 'Investment budget', type: 'select',
            options: BUDGETS.map((v) => ({ value: v, label: money(v) })),
            hint: 'Stock plan isi budget ke andar banta hai.' },
          { key: 'purchase_frequency', label: 'Kitni baar order karte hain', type: 'select', options: FREQUENCIES },
        ]},
      ];
    }
    return [
      { section: 'Business', items: [
        { key: 'business_name', label: 'Business ka naam', type: 'text' },
        { key: 'business_category', label: 'Main category', type: 'select', options: categories },
      ]},
      { section: 'Location', hint: 'Opportunities isi area aur district ke hisaab se milti hain.', items: [
        { key: 'area', label: 'Area / Market', type: 'text' },
        { key: 'district', label: 'District', type: 'text' },
        { key: 'state', label: 'State', type: 'text' },
      ]},
      { section: 'Aap kya supply karte hain', hint: 'Inhi categories ki opportunities aapko dikhengi.', items: [
        { key: 'product_categories', label: 'Categories', type: 'multiselect', options: categories },
      ]},
      { section: 'Operations', items: [
        { key: 'service_radius', label: 'Service radius', type: 'select', options: RADIUS },
        { key: 'minimum_order_range', label: 'Minimum order', type: 'select',
          options: MIN_ORDERS.map((v) => ({ value: v, label: money(v) })) },
        { key: 'retailer_coverage', label: 'Kitne retailers', type: 'select', options: COVERAGE },
        { key: 'delivery_capabilities', label: 'Delivery kaise', type: 'multiselect', options: DELIVERY },
        { key: 'stock_level', label: 'Stock capacity', type: 'select', options: STOCK_LEVELS },
      ]},
    ];
  }, [role, categories]);

  const change = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const location = { area: values.area, district: values.district, state: values.state };
      const payload = role === 'retailer'
        ? {
            business_name: values.business_name,
            business_type: values.business_type,
            location,
            demanded_categories: values.demanded_categories,
            unmet_needs: { categories: values.unmet_categories, other: values.unmet_other },
            monthly_sales_range: values.monthly_sales_range,
            investment_budget: values.investment_budget,
            purchase_frequency: values.purchase_frequency,
          }
        : {
            business_name: values.business_name,
            business_category: values.business_category,
            location,
            product_categories: values.product_categories,
            service_radius: values.service_radius,
            minimum_order_range: values.minimum_order_range,
            retailer_coverage: values.retailer_coverage,
            delivery_capabilities: values.delivery_capabilities,
            stock_capacity: { level: values.stock_level, customDescription: '' },
          };

      const updated = role === 'retailer'
        ? await profilesApi.updateRetailerProfile(payload)
        : await profilesApi.updateDistributorProfile(payload);
      setProfile(updated);

      // Categories and location feed the scoring directly, so a saved change
      // that never re-ran the pipeline would leave the user looking at numbers
      // computed from their old answers.
      try {
        await intelligenceApi.refresh();
      } catch {
        // The profile is saved; the recompute will happen on the next trigger.
      }

      setSaved(true);
      setTimeout(() => navigate(`/${role}/profile`), 1200);
    } catch (err) {
      setError(err.message || 'Save nahi hua. Dobara try karein.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !values) return <LoadingSpinner />;
  if (error && !isSaving) return <ErrorState description={error} onRetry={() => setError(null)} />;

  return (
    <div className="flex flex-col gap-5 pb-28 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Profile Edit Karein</h2>
        <p className="text-sm text-text-muted mt-1">
          Yeh details hi aapke liye signals aur recommendations banati hain.
        </p>
      </header>

      {fields.map((group) => (
        <Card key={group.section} className="border-border">
          <CardContent className="p-4 flex flex-col gap-4">
            <div>
              <h3 className="font-bold text-base text-text-primary">{group.section}</h3>
              {group.hint && (
                <p className="text-xs text-text-muted mt-0.5 flex items-start gap-1">
                  <Info size={12} className="mt-0.5 flex-shrink-0" /> {group.hint}
                </p>
              )}
            </div>
            {group.items.map((field) => (
              <Field key={field.key} field={field} value={values[field.key]} onChange={change} />
            ))}
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="fixed bottom-[70px] left-0 right-0 mx-auto max-w-[1024px] p-4 bg-surface border-t border-border z-[60] md:static md:bg-transparent md:border-0 md:p-0">
        <Button fullWidth onClick={save} disabled={isSaving} icon={saved ? Check : undefined}>
          {isSaving ? 'Save ho raha hai...' : saved ? 'Save ho gaya' : 'Changes Save Karein'}
        </Button>
      </div>
    </div>
  );
}
