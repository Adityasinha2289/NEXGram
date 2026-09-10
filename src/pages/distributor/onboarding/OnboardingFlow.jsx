import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const STORAGE_KEY = 'nexgram_distributor_onboarding';
const TOTAL_STEPS = 9;

const INITIAL_STATE = {
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

export function OnboardingFlow() {
  const navigate = useNavigate();
  
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateData = (fields) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      console.log('Distributor Onboarding Complete:', data);
      localStorage.removeItem(STORAGE_KEY);
      navigate('/distributor/dashboard');
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
      {renderStep()}
    </OnboardingShell>
  );
}
