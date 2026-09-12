import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Wallet, ClipboardList, User } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { storage } from '../../utils/storage';
import { APP_CONSTANTS } from '../../constants/appConstants';
import { Models } from '../../data/models';

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Read raw data and normalize it using the explicit domain model
    const rawData = storage.get(APP_CONSTANTS.STORAGE_KEYS.RETAILER_ONBOARDING, {});
    const normalizedProfile = Models.createRetailerProfile({
      ...rawData,
      name: rawData.contactName || 'Retailer Name', // Mapping from old mock key
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
          <p className="text-sm text-text-muted mt-1">Aapke business ki details.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/retailer/profile/edit')}>
          Profile Edit Karo
        </Button>
      </header>

      {/* Basic Info */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-base text-text-primary mb-3 flex items-center gap-2">
            <User size={18} className="text-primary" /> Basic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-text-muted block">Name</span>
              <span className="font-medium text-text-primary">{profile.name}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Business Type</span>
              <span className="font-medium text-text-primary">{profile.businessType || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Business Age</span>
              <span className="font-medium text-text-primary">{profile.businessAge || 'Not specified'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-base text-text-primary mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-primary" /> Location
          </h3>
          <div className="text-sm flex flex-col gap-1">
            <span className="font-medium text-text-primary">{profile.location.area || 'Area not set'}, {profile.location.block}</span>
            <span className="text-text-muted">{profile.location.district}, {profile.location.state} - {profile.location.pin}</span>
          </div>
        </CardContent>
      </Card>

      {/* Financials & Purchasing */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-base text-text-primary mb-3 flex items-center gap-2">
            <Wallet size={18} className="text-primary" /> Business & Purchasing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-text-muted block">Monthly Sales</span>
              <span className="font-medium text-text-primary">{profile.monthlySales || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Purchase Frequency</span>
              <span className="font-medium text-text-primary">{profile.purchasingFrequency || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Investment Budget</span>
              <span className="font-medium text-text-primary">{profile.investmentBudget || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Existing Supplier</span>
              <span className="font-medium text-text-primary">{profile.existingSupplierType || 'Not specified'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-base text-text-primary mb-3 flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" /> Requirements
          </h3>
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <span className="text-xs text-text-muted block mb-1">Demanded Categories</span>
              <div className="flex flex-wrap gap-2">
                {profile.demandedCategories?.length > 0 ? profile.demandedCategories.map(c => (
                  <span key={c} className="px-2 py-1 bg-surface-muted border border-border rounded text-xs">{c}</span>
                )) : <span className="text-text-muted italic">None selected</span>}
              </div>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Unmet Needs</span>
              <span className="font-medium text-text-primary">{profile.unmetNeeds || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Current Requirements</span>
              <span className="font-medium text-text-primary">{profile.requirements || 'Not specified'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
