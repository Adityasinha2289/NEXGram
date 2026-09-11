import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    role: 'retailer'
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await register(formData);
      navigate(formData.role === 'retailer' ? '/retailer/dashboard' : '/distributor/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary mb-2">Create Account</h1>
            <p className="text-text-muted text-sm">Join the NEXGram network</p>
          </div>

          {error && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2 p-1 bg-surface-muted rounded-lg mb-2">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.role === 'retailer' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted'}`}
                onClick={() => setFormData(prev => ({ ...prev, role: 'retailer' }))}
              >
                Retailer
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.role === 'distributor' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted'}`}
                onClick={() => setFormData(prev => ({ ...prev, role: 'distributor' }))}
              >
                Distributor
              </button>
            </div>

            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Aapka naam"
              required
            />

            <Input
              label="Mobile Number"
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10 digit number"
              required
            />
            
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
            />

            <Button type="submit" fullWidth disabled={isLoading} className="mt-2">
              {isLoading ? 'Creating Account...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Login here</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
