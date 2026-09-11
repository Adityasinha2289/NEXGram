import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

import { Landing } from './pages/Landing';
import { Layout } from './components/ui/Layout';
import { EmptyState } from './components/ui/EmptyState';

import { RetailerDashboard } from './pages/retailer/Dashboard';
import { OnboardingFlow as RetailerOnboarding } from './pages/retailer/onboarding/OnboardingFlow';
import { DeveloperPack as RetailerDeveloperPack } from './pages/retailer/developer-pack/DeveloperPack';
import { Profile as RetailerProfile } from './pages/retailer/Profile';
import { RetailerOrders } from './pages/retailer/orders/RetailerOrders';
import { OrderDetail as RetailerOrderDetail } from './pages/retailer/orders/OrderDetail';
import { Reorder } from './pages/retailer/orders/Reorder';

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

// Shared Placeholder for Unimplemented Routes
const PlaceholderPage = ({ title, description }) => (
  <div className="h-full flex items-center justify-center p-4">
    <EmptyState title={`${title} Page`} description={description || "Yeh feature abhi development mein hai."} />
  </div>
);

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
              
              {/* Retailer Routes */}
              <Route element={<ProtectedRoute allowedRoles={['retailer']} />}>
                <Route path="/retailer" element={<Outlet />}>
                  <Route path="onboarding" element={<RetailerOnboarding />} />
                  <Route path="dashboard" element={<Layout title="Mera Business" role="retailer"><RetailerDashboard /></Layout>} />
                  <Route path="profile" element={<Layout title="Mera Profile" role="retailer" showBack><RetailerProfile /></Layout>} />
                  <Route path="developer-pack" element={<Layout title="Developer Pack" role="retailer" showBack><RetailerDeveloperPack /></Layout>} />
                  <Route path="products" element={<Layout title="Stock Dekho" role="retailer"><PlaceholderPage title="Products" /></Layout>} />
                  <Route path="distributors" element={<Layout title="Nearby Distributors" role="retailer" showBack><DistributorDiscovery /></Layout>} />
                  <Route path="distributors/:distributorId" element={<Layout title="Distributor Catalogue" role="retailer" showBack><RetailerDistributorCatalogue /></Layout>} />
                  <Route path="cart" element={<Layout title="Pack Banao" role="retailer"><PlaceholderPage title="Cart" /></Layout>} />
                  <Route path="orders" element={<Layout title="Order Dekho" role="retailer"><RetailerOrders /></Layout>} />
                  <Route path="orders/:orderId" element={<Layout title="Order Detail" role="retailer" showBack><RetailerOrderDetail /></Layout>} />
                  <Route path="reorder" element={<Layout title="Dobara Order Karo" role="retailer" showBack><Reorder /></Layout>} />
                  <Route path="finance" element={<Layout title="Scheme Check Karo" role="retailer"><PlaceholderPage title="Finance" /></Layout>} />
                  <Route path="assistant" element={<Layout title="Kya Chahiye?" role="retailer"><PlaceholderPage title="AI Assistant" /></Layout>} />
                </Route>
              </Route>

              {/* Distributor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['distributor']} />}>
                <Route path="/distributor" element={<Outlet />}>
                  <Route path="onboarding" element={<DistributorOnboarding />} />
                  <Route path="dashboard" element={<Layout title="Mera Business" role="distributor"><DistributorDashboard /></Layout>} />
                  <Route path="profile" element={<Layout title="Mera Profile" role="distributor" showBack><DistributorProfile /></Layout>} />
                  <Route path="opportunities" element={<Layout title="Business Opportunities" role="distributor" showBack><OpportunitiesList /></Layout>} />
                  <Route path="opportunities/:opportunityId" element={<Layout title="Opportunity Detail" role="distributor" showBack><OpportunityDetail /></Layout>} />
                  <Route path="catalogue" element={<Layout title="Meri Catalogue" role="distributor"><DistributorCatalogue /></Layout>} />
                  <Route path="orders" element={<Layout title="Orders" role="distributor"><DistributorOrders /></Layout>} />
                  <Route path="orders/:orderId" element={<Layout title="Order Detail" role="distributor" showBack><DistributorOrderDetail /></Layout>} />
                  <Route path="finance" element={<Layout title="Scheme Check Karo" role="distributor"><PlaceholderPage title="Finance" /></Layout>} />
                  <Route path="assistant" element={<Layout title="Kya Chahiye?" role="distributor"><PlaceholderPage title="AI Assistant" /></Layout>} />
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
