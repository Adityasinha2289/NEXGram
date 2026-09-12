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

const NotFound = () => <div className="p-4 h-full flex items-center justify-center"><EmptyState title="404 - Page Not Found" description="Yeh page exist nahi karta." actionLabel="Go Home" onAction={() => window.location.href = '/'} /></div>;

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
                  <Route path="dashboard" element={<Layout title="Mera Business" role="retailer"><RetailerDashboard /></Layout>} />
                  <Route path="profile" element={<Layout title="Mera Profile" role="retailer" showBack><RetailerProfile /></Layout>} />
                  <Route path="profile/edit" element={<Layout title="Profile Edit" role="retailer" showBack><EditProfile /></Layout>} />
                  <Route path="developer-pack" element={<Layout title="Developer Pack" role="retailer" showBack><RetailerDeveloperPack /></Layout>} />
                  <Route path="distributors" element={<Layout title="Nearby Distributors" role="retailer" showBack><DistributorDiscovery /></Layout>} />
                  <Route path="distributors/:distributorId" element={<Layout title="Distributor Catalogue" role="retailer" showBack><RetailerDistributorCatalogue /></Layout>} />
                  <Route path="orders" element={<Layout title="Order Dekho" role="retailer"><RetailerOrders /></Layout>} />
                  <Route path="orders/:orderId" element={<Layout title="Order Detail" role="retailer" showBack><RetailerOrderDetail /></Layout>} />
                  <Route path="market" element={<Layout title="Kya Milta Hai?" role="retailer"><MarketSearch /></Layout>} />
                  <Route path="report-demand" element={<Layout title="Kya Nahi Mila?" role="retailer" showBack><ReportDemand /></Layout>} />
                  <Route path="reorder" element={<Layout title="Dobara Order Karo" role="retailer" showBack><Reorder /></Layout>} />
                  <Route path="schemes" element={<Layout title="Sarkari Schemes" role="retailer" showBack><Schemes /></Layout>} />
                </Route>
              </Route>

              {/* Distributor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['distributor']} />}>
                <Route path="/distributor" element={<RequireOnboarding />}>
                  <Route path="onboarding" element={<DistributorOnboarding />} />
                  <Route path="dashboard" element={<Layout title="Mera Business" role="distributor"><DistributorDashboard /></Layout>} />
                  <Route path="profile" element={<Layout title="Mera Profile" role="distributor" showBack><DistributorProfile /></Layout>} />
                  <Route path="profile/edit" element={<Layout title="Profile Edit" role="distributor" showBack><EditProfile /></Layout>} />
                  <Route path="opportunities" element={<Layout title="Business Opportunities" role="distributor" showBack><OpportunitiesList /></Layout>} />
                  <Route path="opportunities/:opportunityId" element={<Layout title="Opportunity Detail" role="distributor" showBack><OpportunityDetail /></Layout>} />
                  <Route path="catalogue" element={<Layout title="Meri Catalogue" role="distributor"><DistributorCatalogue /></Layout>} />
                  <Route path="orders" element={<Layout title="Orders" role="distributor"><DistributorOrders /></Layout>} />
                  <Route path="orders/:orderId" element={<Layout title="Order Detail" role="distributor" showBack><DistributorOrderDetail /></Layout>} />
                  <Route path="schemes" element={<Layout title="Sarkari Schemes" role="distributor" showBack><Schemes /></Layout>} />
                </Route>
              </Route>

              <Route path="*" element={<Layout title="Error" showBottomNav={false}><NotFound /></Layout>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
