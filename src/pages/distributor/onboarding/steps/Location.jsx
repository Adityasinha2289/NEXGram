import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';

export function Location({ data, updateData, onNext }) {
  const [error, setError] = useState('');
  const [isDetected, setIsDetected] = useState(data.location.area !== '');
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetect = () => {
    setIsDetecting(true);
    // Mock API call delay
    setTimeout(() => {
      updateData({
        location: {
          area: 'Palampur Hub',
          block: 'Palampur',
          district: 'Kangra',
          state: 'Himachal Pradesh',
          pin: '176061'
        }
      });
      setIsDetected(true);
      setIsDetecting(false);
      setError('');
    }, 800);
  };

  const validateAndNext = () => {
    if (!data.location.area) {
      setError('Apni location confirm karein.');
    } else {
      setError('');
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aapka business kahan located hai?</h2>
        {isDetected && (
          <p className="text-sm text-text-muted mt-2">
            Is location ke basis par hum nearby demand aur business opportunities analyse karenge.
          </p>
        )}
      </div>

      {!isDetected ? (
        <div className="flex flex-col gap-4">
          <Input 
            placeholder="Village / Area search karein" 
            icon={MapPin}
          />
          <div className="flex items-center justify-center my-2 text-text-muted text-sm">YA</div>
          <Button 
            variant="outline" 
            icon={MapPin} 
            fullWidth 
            onClick={handleDetect}
            isLoading={isDetecting}
          >
            Auto-Detect Location
          </Button>
          {error && <p className="text-danger text-sm text-center">{error}</p>}
        </div>
      ) : (
        <Card className="border-primary bg-primary-light">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-4">
              <MapPin size={20} />
              <span>Detected Location</span>
            </div>
            <div className="flex flex-col gap-2 text-text-primary">
              <p><span className="text-text-muted w-20 inline-block">Area:</span> {data.location.area}</p>
              <p><span className="text-text-muted w-20 inline-block">Block:</span> {data.location.block}</p>
              <p><span className="text-text-muted w-20 inline-block">District:</span> {data.location.district}</p>
              <p><span className="text-text-muted w-20 inline-block">State:</span> {data.location.state}</p>
              <p><span className="text-text-muted w-20 inline-block">PIN:</span> {data.location.pin}</p>
            </div>
            <Button 
              variant="ghost" 
              className="mt-4 p-0 h-auto text-sm text-primary" 
              onClick={() => {
                setIsDetected(false);
                updateData({ location: { area: '', block: '', district: '', state: '', pin: '' } });
              }}
            >
              Badle (Change)
            </Button>
          </CardContent>
        </Card>
      )}

      <Button 
        size="lg" 
        fullWidth 
        onClick={validateAndNext} 
        className="mt-auto"
        disabled={!isDetected}
      >
        Location Confirm Karo
      </Button>
    </div>
  );
}
