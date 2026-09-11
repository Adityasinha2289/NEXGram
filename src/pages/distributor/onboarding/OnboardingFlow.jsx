import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { profilesApi } from '../../../services/api/profilesApi';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';

import { BasicDetails } from './steps/BasicDetails';
import { BusinessCategory } from './steps/BusinessCategory';
import { Location } from './steps/Location';
import { ServiceArea } from './steps/ServiceArea';
import { Products } from './steps/Products';
import { Delivery } from './steps/Delivery';
import { MinimumOrder } from './steps/MinimumOrder';
import { StockCapacity } from './steps/StockCapacity';
import { RetailerCoverage } from './steps/RetailerCoverage';

const TOTAL_STEPS = 9;

export function OnboardingFlow() {
  const navigate = useNavigate();
  const { profile, setProfile } = useAuth();
  
  const [data, setData] = useState(() => {
    return profile?.profile_data || {
      contactName: '',
      businessName: '',
      mobile: '',
      businessCategory: '',
      location: { area: '', block: '', district: '', state: '', pin: '' },
      serviceRadius: '',
      customRadius: '',
      productCategories: [],
      deliveryCapabilities: [],
      minimumOrderRange: '',
      customMinOrder: '',
      stockCapacity: { level: '', customDescription: '' },
      retailerCoverage: ''
    };
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.profile_data) {
      setData(prev => ({ ...prev, ...profile.profile_data }));
    }
  }, [profile]);

  const updateData = (fields) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  const handleNext = async () => {
    setIsSaving(true);
    try {
      const res = await profilesApi.updateDistributorProfile({
        contact_name: data.contactName,
        mobile: data.mobile,
        business_name: data.businessName,
        business_category: data.businessCategory,
        location: data.location,
        service_radius: data.serviceRadius,
        custom_radius: data.customRadius,
        product_categories: data.productCategories,
        delivery_capabilities: data.deliveryCapabilities,
        minimum_order_range: data.minimumOrderRange,
        custom_min_order: data.customMinOrder,
        stock_capacity: data.stockCapacity,
        retailer_coverage: data.retailerCoverage
      });
      setProfile(res);
      
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
      } else {
        navigate('/distributor/dashboard');
      }
    } catch (err) {
      console.error('Failed to save profile state:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const renderStep = () => {
    switch(currentStep) {
      case 1: return <BasicDetails data={data} updateData={updateData} onNext={handleNext} />;
      case 2: return <BusinessCategory data={data} updateData={updateData} onNext={handleNext} />;
      case 3: return <Location data={data} updateData={updateData} onNext={handleNext} />;
      case 4: return <ServiceArea data={data} updateData={updateData} onNext={handleNext} />;
      case 5: return <Products data={data} updateData={updateData} onNext={handleNext} />;
      case 6: return <Delivery data={data} updateData={updateData} onNext={handleNext} />;
      case 7: return <MinimumOrder data={data} updateData={updateData} onNext={handleNext} />;
      case 8: return <StockCapacity data={data} updateData={updateData} onNext={handleNext} />;
      case 9: return <RetailerCoverage data={data} updateData={updateData} onNext={handleNext} />;
      default: return null;
    }
  };

  return (
    <OnboardingShell 
      currentStep={currentStep} 
      totalSteps={TOTAL_STEPS}
      onBack={currentStep > 1 ? handleBack : null}
      title="Aage Badho"
    >
      <div className={isSaving ? 'opacity-50 pointer-events-none' : ''}>
        {renderStep()}
      </div>
    </OnboardingShell>
  );
}
