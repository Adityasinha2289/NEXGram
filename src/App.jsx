import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RequireOnboarding } from './components/auth/RequireOnboarding';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

import { Landing } from './pages/Landing';
import { Schemes } from './pages/schemes/Schemes';
import { EditProfile } from './pages/profile/EditProfile';
import { Layout } from './components/ui/Layout';
import { Compass } from 'lucide-react';
import { EmptyState } from './components/ui/EmptyState';

import { RetailerDashboard } from './pages/retailer/Dashboard';
import { OnboardingFlow as RetailerOnboarding } from './pages/retailer/onboarding/OnboardingFlow';
import { DeveloperPack as RetailerDeveloperPack } from './pages/retailer/developer-pack/DeveloperPack';
import { Profile as RetailerProfile } from './pages/retailer/Profile';
import { RetailerOrders } from './pages/retailer/orders/RetailerOrders';
import { OrderDetail as RetailerOrderDetail } from './pages/retailer/orders/OrderDetail';
import { Reorder } from './pages/retailer/orders/Reorder';
import { ReportDemand } from './pages/retailer/demand/ReportDemand';
import { MarketSearch } from './pages/retailer/market/MarketSearch';

import { DistributorDashboard } from './pages/distributor/Dashboard';
import { OnboardingFlow as DistributorOnboarding } from './pages/distributor/onboarding/OnboardingFlow';
import { Catalogue as DistributorCatalogue } from './pages/distributor/catalogue/Catalogue';
import { Profile as DistributorProfile } from './pages/distributor/Profile';
import { OpportunityDetail } from './pages/distributor/opportunities/OpportunityDetail';
import { OpportunitiesList } from './pages/distributor/opportunities/OpportunitiesList';
import { DistributorOrders } from './pages/distributor/orders/DistributorOrders';
import { OrderDetail as DistributorOrderDetail } from './pages/distributor/orders/OrderDetail';

import { DistributorDiscovery } from './pages/retailer/distributors/DistributorDiscovery';
import { Catalogue as RetailerDistributorCatalogue } from './pages/retailer/distributors/Catalogue';

const NotFound = () => (
  <EmptyState
    icon={Compass}
    title="Yeh page nahi mila"
    description="Ho sakta hai link purana ho. Neeche se wapas shuru karein."
    actionLabel="Home par jayein"
    onAction={() => { window.location.href = '/'; }}
  />
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Retailer Routes */}
              <Route element={<ProtectedRoute allowedRoles={['retailer']} />}>
                <Route path="/retailer" element={<RequireOnboarding />}>
                  <Route path="onboarding" element={<RetailerOnboarding />} />
                  <Route path="dashboard" element={<Layout title="Home" role="retailer" width="wide"><RetailerDashboard /></Layout>} />
                  <Route path="profile" element={<Layout title="Profile" role="retailer" showBack width="narrow"><RetailerProfile /></Layout>} />
                  <Route path="profile/edit" element={<Layout title="Profile edit" role="retailer" showBack width="narrow"><EditProfile /></Layout>} />
                  <Route path="developer-pack" element={<Layout title="Pack" role="retailer" showBack width="wide"><RetailerDeveloperPack /></Layout>} />
                  <Route path="distributors" element={<Layout title="Distributors" role="retailer" showBack width="wide"><DistributorDiscovery /></Layout>} />
                  <Route path="distributors/:distributorId" element={<Layout title="Distributor" role="retailer" showBack width="wide"><RetailerDistributorCatalogue /></Layout>} />
                  <Route path="orders" element={<Layout title="Orders" role="retailer"><RetailerOrders /></Layout>} />
                  <Route path="orders/:orderId" element={<Layout title="Order" role="retailer" showBack><RetailerOrderDetail /></Layout>} />
                  <Route path="market" element={<Layout title="Search" role="retailer"><MarketSearch /></Layout>} />
                  <Route path="report-demand" element={<Layout title="Demand report" role="retailer" showBack width="narrow"><ReportDemand /></Layout>} />
                  <Route path="reorder" element={<Layout title="Reorder" role="retailer" showBack><Reorder /></Layout>} />
                  <Route path="schemes" element={<Layout title="Schemes" role="retailer" showBack><Schemes /></Layout>} />
                </Route>
              </Route>

              {/* Distributor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['distributor']} />}>
                <Route path="/distributor" element={<RequireOnboarding />}>
                  <Route path="onboarding" element={<DistributorOnboarding />} />
                  <Route path="dashboard" element={<Layout title="Home" role="distributor" width="wide"><DistributorDashboard /></Layout>} />
                  <Route path="profile" element={<Layout title="Profile" role="distributor" showBack width="narrow"><DistributorProfile /></Layout>} />
                  <Route path="profile/edit" element={<Layout title="Profile edit" role="distributor" showBack width="narrow"><EditProfile /></Layout>} />
                  <Route path="opportunities" element={<Layout title="Signals" role="distributor" showBack width="wide"><OpportunitiesList /></Layout>} />
                  <Route path="opportunities/:opportunityId" element={<Layout title="Opportunity" role="distributor" showBack><OpportunityDetail /></Layout>} />
                  <Route path="catalogue" element={<Layout title="Stock" role="distributor" width="wide"><DistributorCatalogue /></Layout>} />
                  <Route path="orders" element={<Layout title="Orders" role="distributor"><DistributorOrders /></Layout>} />
                  <Route path="orders/:orderId" element={<Layout title="Order" role="distributor" showBack><DistributorOrderDetail /></Layout>} />
                  <Route path="schemes" element={<Layout title="Schemes" role="distributor" showBack><Schemes /></Layout>} />
                </Route>
              </Route>

              <Route path="*" element={<Layout title="Page nahi mila" showBottomNav={false}><NotFound /></Layout>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
