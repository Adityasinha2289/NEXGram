import { useNavigate } from 'react-router-dom';
import { AlertCircle, MapPin, Pencil, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Meta, PageHeader } from '../../components/ui/PageHeader';
import { Section } from '../../components/ui/Section';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/useAuth';

const NOT_SET = 'Set nahi kiya';

/** Field names the API returns in missing_fields, in words a shopkeeper reads. */
const MISSING_LABELS = {
  business_name: 'Business ka naam',
  business_type: 'Business type',
  business_category: 'Main category',
  location: 'Location',
  demanded_categories: 'Aap kya bechte hain',
  product_categories: 'Aap kya supply karte hain',
  service_radius: 'Service radius',
};

const DELIVERY_LABELS = {
  own: 'Apni delivery',
  staff: 'Delivery staff',
  transport: 'Transport partner',
  pickup: 'Retailer pickup',
};

const STOCK_LABELS = { low: 'Kam', medium: 'Theek-thaak', high: 'Zyada' };

/** "10000-25000" -> "₹10,000 – ₹25,000"; anything unparseable is left alone. */
function money(band) {
  if (!band) return NOT_SET;
  const parts = String(band).match(/\d+/g);
  if (!parts) return band;
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  if (String(band).startsWith('under')) return `${fmt(parts[0])} tak`;
  if (parts.length === 1) return `${fmt(parts[0])}+`;
  return `${fmt(parts[0])} – ${fmt(parts[1])}`;
}

const list = (values, labels) => {
  if (!Array.isArray(values) || values.length === 0) return [];
  return values.map((value) => labels?.[value] ?? value);
};

function Facts({ rows }) {
  return (
    <dl className="panel divide-y divide-border px-4">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-6">
          <dt className="text-sm text-text-muted sm:w-48 sm:flex-shrink-0">{label}</dt>
          <dd className={`text-sm ${value === NOT_SET ? 'text-text-muted' : 'font-medium text-text-primary'}`}>
            {value || NOT_SET}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Chips({ values, empty }) {
  if (values.length === 0) {
    return <p className="text-sm text-text-muted">{empty}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <li
          key={value}
          className="rounded-md border border-border bg-surface px-2.5 py-1 text-2xs font-medium text-text-secondary"
        >
          {value}
        </li>
      ))}
    </ul>
  );
}

/**
 * The business profile, as the server holds it.
 *
 * Both role pages read from the API through AuthContext. They used to read a
 * localStorage key written by a mock onboarding flow, which meant a real
 * account — including every demo login — saw a screen of "Retailer Name",
 * "Area, District" and eight rows of "Not specified", none of it theirs.
 */
export function ProfileView({ role }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-[55%] max-w-[300px]" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const data = profile.profile_data || {};
  const location = data.location || {};
  const isRetailer = role === 'retailer';

  // Block and district are routinely the same word in Kangra, which rendered
  // as "Palampur Market, Kangra, Kangra, Himachal Pradesh".
  const locationLine = [...new Set(
    [location.area, location.block, location.district, location.state].filter(Boolean),
  )].join(', ');

  const sections = isRetailer
    ? [
      {
        title: 'Business',
        rows: [
          { label: 'Dukaan ka naam', value: data.businessName },
          { label: 'Business type', value: data.businessType },
          { label: 'Contact', value: profile.name },
        ],
      },
      {
        title: 'Location',
        hint: 'Aapke area ke signals isi par aggregate hote hain.',
        rows: [
          { label: 'Area / Market', value: location.area },
          { label: 'District', value: location.district },
          { label: 'State', value: location.state },
          { label: 'PIN', value: location.pin },
        ],
      },
      {
        title: 'Purchasing',
        rows: [
          { label: 'Monthly purchase', value: money(data.monthlyPurchaseRange) },
          { label: 'Investment budget', value: money(data.investmentBudget) },
          { label: 'Kitni baar order', value: data.purchasingFrequency },
        ],
      },
    ]
    : [
      {
        title: 'Business',
        rows: [
          { label: 'Business ka naam', value: data.businessName },
          { label: 'Main category', value: data.businessCategory },
          { label: 'Contact', value: profile.name },
        ],
      },
      {
        title: 'Location',
        hint: 'Opportunities isi area aur district ke hisaab se milti hain.',
        rows: [
          { label: 'Area / Market', value: location.area },
          { label: 'District', value: location.district },
          { label: 'State', value: location.state },
          { label: 'PIN', value: location.pin },
        ],
      },
      {
        title: 'Operations',
        rows: [
          { label: 'Service radius', value: data.serviceRadius },
          { label: 'Minimum order', value: money(data.minimumOrderRange) },
          { label: 'Kitne retailers', value: data.retailerCoverage },
          { label: 'Stock capacity', value: STOCK_LABELS[data.stockCapacity?.level] },
          {
            label: 'Delivery',
            value: list(data.deliveryCapabilities, DELIVERY_LABELS).join(', '),
          },
        ],
      },
    ];

  const categoryBlocks = isRetailer
    ? [
      {
        title: 'Aap kya bechte hain',
        values: list(data.demandedCategories),
        empty: 'Koi category select nahi ki.',
      },
      {
        title: 'Kya nahi milta',
        hint: 'Yahi aapke area ka demand signal banata hai.',
        values: list(data.unmetNeeds?.categories),
        note: data.unmetNeeds?.other,
        empty: 'Abhi koi unmet demand darj nahi.',
      },
    ]
    : [
      {
        title: 'Aap kya supply karte hain',
        hint: 'Inhi categories ki opportunities aapko dikhti hain.',
        values: list(data.productCategories),
        empty: 'Koi category select nahi ki.',
      },
    ];

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow={isRetailer ? 'Retailer' : 'Distributor'}
        title={data.businessName || profile.name || 'Mera profile'}
        meta={
          <>
            {profile.mobile && <Meta icon={Phone}>{profile.mobile}</Meta>}
            {locationLine && <Meta icon={MapPin}>{locationLine}</Meta>}
          </>
        }
        action={
          <Button variant="outline" icon={Pencil} onClick={() => navigate(`/${role}/profile/edit`)}>
            Edit karein
          </Button>
        }
      />

      {/* The missing fields are not cosmetic: each one is an input the scoring
          engine reads, so an incomplete profile produces weaker suggestions. */}
      {!profile.profile_complete && profile.missing_fields?.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-bg px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm leading-snug text-text-secondary">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-warning" strokeWidth={2} />
            <span>
              Profile adhura hai — {profile.missing_fields
                .map((field) => MISSING_LABELS[field] || field)
                .join(', ')}
              . Inhi se aapke suggestions bante hain.
            </span>
          </p>
          <Button
            size="sm"
            className="flex-shrink-0"
            onClick={() => navigate(`/${role}/profile/edit`)}
          >
            Poora karein
          </Button>
        </div>
      )}

      {sections.map((section) => (
        <Section key={section.title} title={section.title} description={section.hint}>
          <Facts rows={section.rows} />
        </Section>
      ))}

      {categoryBlocks.map((block) => (
        <Section key={block.title} title={block.title} description={block.hint}>
          <div className="panel flex flex-col gap-3 p-4">
            <Chips values={block.values} empty={block.empty} />
            {block.note && (
              <p className="border-t border-border pt-3 text-sm leading-snug text-text-secondary">
                {block.note}
              </p>
            )}
          </div>
        </Section>
      ))}
    </div>
  );
}

/** Shown when a role's profile row has not been created at all. */
export function ProfileMissing({ role }) {
  const navigate = useNavigate();
  return (
    <EmptyState
      title="Profile abhi bana nahi hai"
      description="Onboarding poora karein taaki hum aapke area ke signals aapse jod sakein."
      actionLabel="Onboarding shuru karein"
      onAction={() => navigate(`/${role}/onboarding`)}
    />
  );
}
