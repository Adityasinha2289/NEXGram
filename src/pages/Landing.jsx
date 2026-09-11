import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Truck, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export function Landing() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate(currentUser.role === 'retailer' ? '/retailer/dashboard' : '/distributor/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleDemo = async (role) => {
    try {
      setIsLoading(true);
      if (role === 'retailer') {
        await login('8888888881', 'password123');
        navigate('/retailer/dashboard');
      } else {
        await login('9999999991', 'password123');
        navigate('/distributor/dashboard');
      }
    } catch (err) {
      console.error("Demo login failed", err);
      // Fallback if demo users aren't seeded yet
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-8 pb-12 animate-fade-in">
      <div className="text-center mt-8">
        <h1 className="text-3xl font-bold mb-2 text-primary">Aapka Swagat Hai</h1>
        <p className="text-text-muted">Apna role select karein</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/login')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-primary-light rounded-full text-primary">
              <Store size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Main Retailer Hoon</h3>
              <p className="text-sm text-text-muted">Login ya Register karein</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-secondary transition-colors cursor-pointer" onClick={() => navigate('/login')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-secondary-light rounded-full text-secondary">
              <Truck size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Main Distributor Hoon</h3>
              <p className="text-sm text-text-muted">Login ya Register karein</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full max-w-sm pt-6 border-t border-border flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <PlayCircle size={18} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Explore Demo</h3>
        </div>
        <Button 
          variant="outline" 
          fullWidth 
          disabled={isLoading}
          onClick={() => handleDemo('retailer')}
        >
          View Retailer Features
        </Button>
        <Button 
          variant="outline" 
          fullWidth 
          disabled={isLoading}
          onClick={() => handleDemo('distributor')}
        >
          View Distributor Features
        </Button>
      </div>

      <Button variant="ghost" className="mt-2 text-text-muted">
        Bhasha Badlein (Language)
      </Button>
    </div>
  );
}
