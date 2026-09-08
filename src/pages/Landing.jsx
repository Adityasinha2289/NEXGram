import { useNavigate } from 'react-router-dom';
import { Store, Truck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 text-primary">Aapka Swagat Hai</h1>
        <p className="text-muted">Apna role select karein</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Card className="hover:shadow-md cursor-pointer transition-shadow" onClick={() => navigate('/retailer/dashboard')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-primary-light rounded-full text-primary">
              <Store size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Main Retailer Hoon</h3>
              <p className="text-sm text-muted">Dukaan chalata hoon</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md cursor-pointer transition-shadow" onClick={() => navigate('/distributor/dashboard')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-secondary-light rounded-full text-secondary">
              <Truck size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Main Distributor Hoon</h3>
              <p className="text-sm text-muted">Samaan supply karta hoon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button variant="ghost" className="mt-4">
        Bhasha Badlein (Language)
      </Button>
    </div>
  );
}
