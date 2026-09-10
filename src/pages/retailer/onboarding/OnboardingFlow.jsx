import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';

import { BasicDetails } from './steps/BasicDetails';
import { Location } from './steps/Location';
import { BusinessType } from './steps/BusinessType';
import { Demand } from './steps/Demand';
import { UnmetDemand } from './steps/UnmetDemand';
import { Purchasing } from './steps/Purchasing';
import { Investment } from './steps/Investment';
import { Requirements } from './steps/Requirements';

const STORAGE_KEY = 'nexgram_retailer_onboarding';
const TOTAL_STEPS = 8;

const INITIAL_STATE = {
  name: '',
  mobile: '',
  location: { area: '', block: '', district: '', state: '', pin: '' },
  businessType: '',
  demandedCategories: [],
  unmetNeeds: { categories: [], other: '' },
  monthlyPurchaseRange: '',
  purchasingFrequency: '',
  investmentBudget: '',
  requirements: [],
  existingSupplierType: ''
};

export function OnboardingFlow() {
  const navigate = useNavigate();
  
  // Try to load from localStorage, otherwise use INITIAL_STATE
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [currentStep, setCurrentStep] = useState(1);

  // Save to localStorage whenever data changes
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
      // Final submission
      console.log('Onboarding Complete:', data);
      // Clean up localStorage after successful completion
      localStorage.removeItem(STORAGE_KEY);
      navigate('/retailer/dashboard');
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
      case 2: return <Location data={data} updateData={updateData} onNext={handleNext} />;
      case 3: return <BusinessType data={data} updateData={updateData} onNext={handleNext} />;
      case 4: return <Demand data={data} updateData={updateData} onNext={handleNext} />;
      case 5: return <UnmetDemand data={data} updateData={updateData} onNext={handleNext} />;
      case 6: return <Purchasing data={data} updateData={updateData} onNext={handleNext} />;
      case 7: return <Investment data={data} updateData={updateData} onNext={handleNext} />;
      case 8: return <Requirements data={data} updateData={updateData} onNext={handleNext} />;
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
