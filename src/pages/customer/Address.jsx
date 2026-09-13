import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, LocateFixed, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../context/useAuth';
import { storefrontApi } from '../../services/api/storefrontApi';

/**
 * Where the delivery boy actually has to go.
 *
 * A landmark matters more than a street here: rural addresses are given as
 * "peepal tree ke paas", and a runner on a bicycle finds a house that way
 * rather than by a house number nobody has painted.
 *
 * The GPS button is offered, not required. Without coordinates a shop is
 * matched by shared area instead, so an unmapped village still works — but a
 * pin is what lets the app measure the distance and refuse a shop too far to
 * cycle to before an order is placed.
 */
export function Address() {
  const navigate = useNavigate();
  const { setProfile } = useAuth();

  const fetcher = useCallback(() => storefrontApi.getMe(), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher);

  const [edits, setEdits] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);

  const values = edits ?? {
    address_line: data?.addressLine || '',
    landmark: data?.landmark || '',
    latitude: data?.latitude ?? null,
    longitude: data?.longitude ?? null,
  };

  const set = (field, value) => {
    setEdits({ ...values, [field]: value });
    setSaved(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setSaveError('Is browser mein location support nahi hai.');
      return;
    }
    setLocating(true);
    setSaveError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEdits({
          ...values,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setLocating(false);
        setSaved(false);
      },
      () => {
        setSaveError('Location nahi mili. Area ke hisaab se dukaanein dikhayenge.');
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const save = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await storefrontApi.updateMe({
        address_line: values.address_line || undefined,
        landmark: values.landmark || undefined,
        latitude: values.latitude ?? undefined,
        longitude: values.longitude ?? undefined,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => navigate('/shop'), 900);
    } catch (err) {
      setSaveError(err.message || 'Save nahi hua. Dobara try karein.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-[55%] max-w-[300px]" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (error) return <ErrorState description={error} onRetry={reload} />;

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); save(); }}
      className="flex animate-fade-in flex-col gap-5"
    >
      <PageHeader
        eyebrow="Delivery"
        title="Aapka pata"
        description="Delivery waala cycle par aata hai — isliye ghar ka nishaan sabse zaroori hai."
      />

      <div className="panel flex flex-col gap-4 px-4 py-4">
        <Input
          label="Pata"
          placeholder="e.g. Ward 4, Palampur"
          value={values.address_line}
          onChange={(e) => set('address_line', e.target.value)}
        />
        <Input
          label="Nishaan (landmark)"
          placeholder="e.g. peepal ped ke paas"
          value={values.landmark}
          onChange={(e) => set('landmark', e.target.value)}
        />

        <div className="flex flex-col gap-2 rounded-lg bg-surface-muted px-3.5 py-3">
          <p className="flex items-start gap-2 text-sm leading-snug text-text-secondary">
            <MapPin size={15} className="mt-0.5 flex-shrink-0 text-text-muted" strokeWidth={2} />
            {values.latitude != null
              ? 'Location set hai — aapko sirf paas ki dukaanein dikhengi.'
              : 'Location set karenge to hum sahi doori naap kar dukaanein dikha payenge.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={LocateFixed}
            isLoading={locating}
            onClick={useMyLocation}
          >
            {values.latitude != null ? 'Location dobara lein' : 'Meri location lein'}
          </Button>
        </div>

        {saveError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
            {saveError}
          </p>
        )}

        {saved && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2.5 text-sm text-success"
          >
            <Check size={16} strokeWidth={2.5} /> Pata save ho gaya.
          </p>
        )}

        <Button type="submit" fullWidth isLoading={isSaving}>
          Save karein
        </Button>
      </div>
    </form>
  );
}
