import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Truck, Package } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { storage } from '../../utils/storage';
import { APP_CONSTANTS } from '../../constants/appConstants';
import { Models } from '../../data/models';

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Read raw data and normalize it
    const rawData = storage.get(APP_CONSTANTS.STORAGE_KEYS.DISTRIBUTOR_ONBOARDING, {});
    const normalizedProfile = Models.createDistributorProfile({
      ...rawData,
      location: rawData.location || { area: 'Area', district: 'District', pin: '000000' }
    });
    setProfile(normalizedProfile);
  }, []);

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-primary leading-tight">Mera Profile</h2>
          <p className="text-sm text-text-muted mt-1">Aapke distribution business ki details.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/distributor/profile/edit')}>
          Profile Edit Karo
        </Button>
      </header>

      {/* Business Info */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-md text-text-primary mb-3 flex items-center gap-2">
            <Store size={18} className="text-primary" /> Business Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-text-muted block">Business Name</span>
              <span className="font-medium text-text-primary">{profile.businessName || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Contact Name</span>
              <span className="font-medium text-text-primary">{profile.contactName || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Mobile</span>
              <span className="font-medium text-text-primary">{profile.mobile || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Business Category</span>
              <span className="font-medium text-text-primary">{profile.businessCategory || 'Not specified'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-md text-text-primary mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-primary" /> Location
          </h3>
          <div className="text-sm flex flex-col gap-1">
            <span className="font-medium text-text-primary">{profile.location.area || 'Area not set'}, {profile.location.block}</span>
            <span className="text-text-muted">{profile.location.district}, {profile.location.state} - {profile.location.pin}</span>
          </div>
        </CardContent>
      </Card>

      {/* Service Area */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-md text-text-primary mb-3 flex items-center gap-2">
            <Truck size={18} className="text-primary" /> Service Area & Delivery
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-text-muted block">Service Radius</span>
              <span className="font-medium text-text-primary">{profile.serviceRadius || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Delivery Capability</span>
              <span className="font-medium text-text-primary">{profile.deliveryCapabilities || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Retailer Coverage</span>
              <span className="font-medium text-text-primary">{profile.retailerCoverage || 'Not specified'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalogue */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-md text-text-primary mb-3 flex items-center gap-2">
            <Package size={18} className="text-primary" /> Catalogue Capabilities
          </h3>
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <span className="text-xs text-text-muted block mb-1">Categories Supplied</span>
              <div className="flex flex-wrap gap-2">
                {profile.productCategories?.length > 0 ? profile.productCategories.map(c => (
                  <span key={c} className="px-2 py-1 bg-surface-muted border border-border rounded text-xs">{c}</span>
                )) : <span className="text-text-muted italic">None selected</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-2">
              <div>
                <span className="text-xs text-text-muted block">Stock Capacity</span>
                <span className="font-medium text-text-primary">{profile.stockCapacity || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">Minimum Order</span>
                <span className="font-medium text-text-primary">{profile.minimumOrderRange || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
