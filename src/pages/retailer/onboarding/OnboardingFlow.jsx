import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/useAuth';
import { intelligenceApi } from '../../../services/api/intelligenceApi';
import { profilesApi } from '../../../services/api/profilesApi';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';

import { BasicDetails } from './steps/BasicDetails';
import { Location } from './steps/Location';
import { BusinessType } from './steps/BusinessType';
import { Demand } from './steps/Demand';
import { UnmetDemand } from './steps/UnmetDemand';
import { Purchasing } from './steps/Purchasing';
import { Investment } from './steps/Investment';
import { Requirements } from './steps/Requirements';

const TOTAL_STEPS = 8;

export function OnboardingFlow() {
  const navigate = useNavigate();
  const { profile, setProfile } = useAuth();
  
  // Use profile_data from context, fallback to empty
  const [data, setData] = useState(() => {
    return profile?.profile_data || {
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
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if profile loads later
  useEffect(() => {
    if (profile?.profile_data) {
      queueMicrotask(() => {
        setData(prev => ({
          ...prev,
          ...profile.profile_data,
          name: profile.profile_data.name || profile.name || prev.name,
          mobile: profile.profile_data.mobile || profile.mobile || prev.mobile,
        }));
      });
    }
  }, [profile]);

  const updateData = (fields) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  const handleNext = async () => {
    setIsSaving(true);
    try {
      // Incremental patch
      const res = await profilesApi.updateRetailerProfile({
        name: data.name,
        mobile: data.mobile,
        location: data.location,
        business_type: data.businessType,
        demanded_categories: data.demandedCategories,
        unmet_needs: data.unmetNeeds,
        monthly_sales_range: data.monthlyPurchaseRange,
        purchase_frequency: data.purchasingFrequency,
        investment_budget: data.investmentBudget,
        requirements: data.requirements,
        existing_supplier_type: data.existingSupplierType
      });
      setProfile(res);
      
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
      } else {
        // What this shop just reported is now part of the local signal, so
        // recompute before landing on the dashboard. A failure here must not
        // strand the user mid-onboarding: the pipeline is idempotent and any
        // later refresh picks the signal up.
        try {
          await intelligenceApi.refresh();
        } catch (err) {
          console.warn('Intelligence refresh failed; signal will be picked up on the next run.', err);
        }
        navigate('/retailer/dashboard');
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
      title="Apni dukaan set karein"
    >
      <div className={isSaving ? 'opacity-50 pointer-events-none' : ''}>
        {renderStep()}
      </div>
    </OnboardingShell>
  );
}
