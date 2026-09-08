import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';

import { Landing } from './pages/Landing';
import { Layout } from './components/ui/Layout';
import { EmptyState } from './components/ui/EmptyState';

import { RetailerDashboard } from './pages/retailer/Dashboard';
import { DistributorDashboard } from './pages/distributor/Dashboard';

// Shared Placeholder for Unimplemented Routes
const PlaceholderPage = ({ title }) => (
  <div className="h-full flex items-center justify-center p-4">
    <EmptyState title={`${title} Page`} description="Yeh feature abhi development mein hai." />
  </div>
);

const NotFound = () => <div className="p-4 h-full flex items-center justify-center"><EmptyState title="404 - Page Not Found" description="Yeh page exist nahi karta." actionLabel="Go Home" onAction={() => window.location.href = '/'} /></div>;

function App() {
  return (
    <Router>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            
            {/* Retailer Routes */}
            <Route path="/retailer" element={<Outlet />}>
              <Route path="onboarding" element={<Layout title="Aage Badho" role="retailer" showBottomNav={false}><PlaceholderPage title="Onboarding" /></Layout>} />
              <Route path="dashboard" element={<Layout title="Mera Business" role="retailer"><RetailerDashboard /></Layout>} />
              <Route path="developer-pack" element={<Layout title="Developer Pack" role="retailer" showBack><PlaceholderPage title="Developer Pack" /></Layout>} />
              <Route path="products" element={<Layout title="Stock Dekho" role="retailer"><PlaceholderPage title="Products" /></Layout>} />
              <Route path="distributors" element={<Layout title="Distributors" role="retailer"><PlaceholderPage title="Distributors" /></Layout>} />
              <Route path="cart" element={<Layout title="Pack Banao" role="retailer"><PlaceholderPage title="Cart" /></Layout>} />
              <Route path="orders" element={<Layout title="Order Dekho" role="retailer"><PlaceholderPage title="Orders" /></Layout>} />
              <Route path="reorder" element={<Layout title="Dobara Order Karo" role="retailer"><PlaceholderPage title="Reorder" /></Layout>} />
              <Route path="finance" element={<Layout title="Scheme Check Karo" role="retailer"><PlaceholderPage title="Finance" /></Layout>} />
              <Route path="assistant" element={<Layout title="Kya Chahiye?" role="retailer"><PlaceholderPage title="AI Assistant" /></Layout>} />
            </Route>

            {/* Distributor Routes */}
            <Route path="/distributor" element={<Outlet />}>
              <Route path="onboarding" element={<Layout title="Aage Badho" role="distributor" showBottomNav={false}><PlaceholderPage title="Onboarding" /></Layout>} />
              <Route path="dashboard" element={<Layout title="Mera Business" role="distributor"><DistributorDashboard /></Layout>} />
              <Route path="opportunities" element={<Layout title="Opportunity Dekho" role="distributor"><PlaceholderPage title="Opportunities" /></Layout>} />
              <Route path="catalogue" element={<Layout title="Stock Dekho" role="distributor"><PlaceholderPage title="Catalogue" /></Layout>} />
              <Route path="orders" element={<Layout title="Order Aaye Hain" role="distributor"><PlaceholderPage title="Orders" /></Layout>} />
              <Route path="finance" element={<Layout title="Scheme Check Karo" role="distributor"><PlaceholderPage title="Finance" /></Layout>} />
              <Route path="assistant" element={<Layout title="Kya Chahiye?" role="distributor"><PlaceholderPage title="AI Assistant" /></Layout>} />
            </Route>

            <Route path="*" element={<Layout title="Error" showBottomNav={false}><NotFound /></Layout>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
