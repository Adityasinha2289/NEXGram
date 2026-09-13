import { useState } from 'react';
import { CalendarClock, Check, Globe, Minus, Pencil, X } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Input } from '../../../../components/ui/Input';
import { inventoryApi } from '../../../../services/api/inventoryApi';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

/**
 * How long the shelf lasts at the rate this shop actually sells it.
 *
 * The number matters more than the quantity: four cartons is a week for one
 * shop and an afternoon for another, and only the ledger knows which.
 */
function coverLabel(item) {
  if (item.quantity === 0) return { text: 'Khatam', variant: 'danger' };
  if (item.daysOfCover === null) return { text: 'Abhi koi sale nahi', variant: 'neutral' };
  if (item.daysOfCover < 2) return { text: `${item.daysOfCover} din bachega`, variant: 'danger' };
  if (item.daysOfCover < 7) return { text: `${item.daysOfCover} din bachega`, variant: 'warning' };
  return { text: `${item.daysOfCover} din bachega`, variant: 'success' };
}

/**
 * One line of the shelf, with the two edits a shopkeeper makes standing up:
 * correcting a count after a stock-take, and changing the price.
 */
export function InventoryRow({ item, onChanged }) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [price, setPrice] = useState(item.sellingPrice == null ? '' : String(item.sellingPrice));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const cover = coverLabel(item);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Two different operations: a count change is a stock-take correction and
      // belongs in the ledger, a price change is just a field.
      if (Number(quantity) !== item.quantity) {
        await inventoryApi.adjustStock(item.id, Number(quantity), 'Stock take');
      }
      if (price !== '' && Number(price) !== item.sellingPrice) {
        await inventoryApi.updateItem(item.id, { selling_price: Number(price) });
      }
      setIsEditing(false);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Save nahi hua');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOnline = async () => {
    setError(null);
    try {
      await inventoryApi.updateItem(item.id, { is_listed_online: !item.isListedOnline });
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Change nahi hua');
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <p className="text-sm font-semibold text-text-primary">
          {item.name} <span className="font-normal text-text-muted">{item.variant}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kitne hain (gin kar)"
            type="number"
            inputMode="numeric"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Bechne ka daam"
            type="number"
            inputMode="decimal"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        {error && <p role="alert" className="text-2xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="btn btn-sm btn-primary flex-1"
          >
            <Check size={14} /> Save
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(false); setError(null); }}
            className="btn btn-sm btn-ghost"
          >
            <X size={14} /> Rehne dein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight text-text-primary">
            {item.name}
            {item.variant && <span className="ml-1.5 font-normal text-text-muted">{item.variant}</span>}
          </h3>
          <Badge variant={cover.variant} dot>{cover.text}</Badge>
          {item.expiringQuantity > 0 && (
            <Badge variant="warning">
              {item.expiringQuantity} expire ho raha
            </Badge>
          )}
        </div>

        <p className="num mt-1 text-2xs text-text-muted">
          {rupees(item.sellingPrice)} / {item.unit}
          {item.salesPerDay > 0 && ` · roz ~${item.salesPerDay}`}
          {item.nextExpiry && ` · agli expiry ${item.nextExpiry}`}
        </p>

        <button
          type="button"
          onClick={toggleOnline}
          className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs transition-colors ${
            item.isListedOnline
              ? 'text-success hover:bg-success-bg'
              : 'text-text-faint hover:bg-surface-muted'
          }`}
        >
          {item.isListedOnline ? <Globe size={11} /> : <Minus size={11} />}
          {item.isListedOnline ? 'Online bik raha hai' : 'Online nahi hai'}
        </button>

        {error && <p role="alert" className="mt-1 text-2xs text-danger">{error}</p>}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="num text-lg font-bold leading-none text-text-primary">{item.quantity}</p>
          <p className="mt-0.5 text-2xs text-text-muted">bache</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label={`${item.name} ka stock theek karein`}
          className="grid h-8 w-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
        >
          <Pencil size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/** A compact expiry line, shared with the restock screen. */
export function ExpiryNote({ item }) {
  if (!item.nextExpiry) return null;
  return (
    <span className="flex items-center gap-1 text-2xs text-warning">
      <CalendarClock size={11} /> {item.nextExpiry}
    </span>
  );
}
