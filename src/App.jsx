import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { BasketProvider } from './context/BasketContext';
import { isClerkEnabled } from './config/clerk';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RequireOnboarding } from './components/auth/RequireOnboarding';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

import { Landing } from './pages/Landing';
import { Layout } from './components/ui/Layout';
import { Compass, Loader2 } from 'lucide-react';
import { EmptyState } from './components/ui/EmptyState';






/*
 * Every screen past the front door is loaded on demand.
 *
 * The target user is on a metered rural connection and pays for this bundle by
 * the megabyte. A shopkeeper has no reason to download the distributor's
 * opportunity engine or the household's storefront, and the landing page has no
 * reason to carry any of it.
 */
const Address = lazy(() => import('./pages/customer/Address').then((m) => ({ default: m.Address })));
// Lazy so Clerk's SDK never lands in the main bundle. Most sign-ins here are
// still mobile+password, and a metered connection should not pay for an
// identity provider it does not use.
const ClerkSignIn = lazy(() => import('./pages/auth/ClerkSignIn').then((m) => ({ default: m.ClerkSignIn })));
const Deliveries = lazy(() => import('./pages/retailer/deliveries/Deliveries').then((m) => ({ default: m.Deliveries })));
const DistributorCatalogue = lazy(() => import('./pages/distributor/catalogue/Catalogue').then((m) => ({ default: m.Catalogue })));
const DistributorDashboard = lazy(() => import('./pages/distributor/Dashboard').then((m) => ({ default: m.DistributorDashboard })));
const DistributorDiscovery = lazy(() => import('./pages/retailer/distributors/DistributorDiscovery').then((m) => ({ default: m.DistributorDiscovery })));
const DistributorOnboarding = lazy(() => import('./pages/distributor/onboarding/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow })));
const DistributorOrderDetail = lazy(() => import('./pages/distributor/orders/OrderDetail').then((m) => ({ default: m.OrderDetail })));
const DistributorOrders = lazy(() => import('./pages/distributor/orders/DistributorOrders').then((m) => ({ default: m.DistributorOrders })));
const DistributorProfile = lazy(() => import('./pages/distributor/Profile').then((m) => ({ default: m.Profile })));
const EditProfile = lazy(() => import('./pages/profile/EditProfile').then((m) => ({ default: m.EditProfile })));
const Inventory = lazy(() => import('./pages/retailer/inventory/Inventory').then((m) => ({ default: m.Inventory })));
const Loans = lazy(() => import('./pages/loans/Loans').then((m) => ({ default: m.Loans })));
const MarketSearch = lazy(() => import('./pages/retailer/market/MarketSearch').then((m) => ({ default: m.MarketSearch })));
const OpportunitiesList = lazy(() => import('./pages/distributor/opportunities/OpportunitiesList').then((m) => ({ default: m.OpportunitiesList })));
const OpportunityDetail = lazy(() => import('./pages/distributor/opportunities/OpportunityDetail').then((m) => ({ default: m.OpportunityDetail })));
const ProcurementReview = lazy(() => import('./pages/retailer/procurement/ProcurementReview').then((m) => ({ default: m.ProcurementReview })));
const ProductDetail = lazy(() => import('./pages/retailer/products/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const ProductDiscovery = lazy(() => import('./pages/retailer/products/ProductDiscovery').then((m) => ({ default: m.ProductDiscovery })));
const Reorder = lazy(() => import('./pages/retailer/orders/Reorder').then((m) => ({ default: m.Reorder })));
const ReportDemand = lazy(() => import('./pages/retailer/demand/ReportDemand').then((m) => ({ default: m.ReportDemand })));
const RestockPlan = lazy(() => import('./pages/retailer/inventory/RestockPlan').then((m) => ({ default: m.RestockPlan })));
const RetailerDashboard = lazy(() => import('./pages/retailer/Dashboard').then((m) => ({ default: m.RetailerDashboard })));
const RetailerDeveloperPack = lazy(() => import('./pages/retailer/developer-pack/DeveloperPack').then((m) => ({ default: m.DeveloperPack })));
const RetailerDistributorCatalogue = lazy(() => import('./pages/retailer/distributors/Catalogue').then((m) => ({ default: m.Catalogue })));
const RetailerOnboarding = lazy(() => import('./pages/retailer/onboarding/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow })));
const RetailerOrderDetail = lazy(() => import('./pages/retailer/orders/OrderDetail').then((m) => ({ default: m.OrderDetail })));
const RetailerOrders = lazy(() => import('./pages/retailer/orders/RetailerOrders').then((m) => ({ default: m.RetailerOrders })));
const RetailerProfile = lazy(() => import('./pages/retailer/Profile').then((m) => ({ default: m.Profile })));
const ShopCatalogue = lazy(() => import('./pages/customer/ShopCatalogue').then((m) => ({ default: m.ShopCatalogue })));
const Shops = lazy(() => import('./pages/customer/Shops').then((m) => ({ default: m.Shops })));
const Sourcing = lazy(() => import('./pages/retailer/sourcing/Sourcing').then((m) => ({ default: m.Sourcing })));
const VoiceSale = lazy(() => import('./pages/retailer/inventory/VoiceSale').then((m) => ({ default: m.VoiceSale })));
const MyOrders = lazy(() => import('./pages/customer/MyOrders').then((m) => ({ default: m.MyOrders })));
const MyOrderDetail = lazy(() => import('./pages/customer/MyOrders').then((m) => ({ default: m.MyOrderDetail })));


const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="animate-spin text-primary" size={28} />
  </div>
);

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
            {/* One boundary around the whole route table: a chunk arrives in
                well under a second on anything but the worst connection, and a
                per-route skeleton would flash more than it reassures. */}
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              {/* One screen per side of the market; /login stays the chooser. */}
              <Route path="/login/:role" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              {/* Registered only when there is a Clerk instance to sign in
                  against, so a checkout without keys has no route that exists
                  only to bounce you back. The page carries its own provider —
                  it is the one screen that needs Clerk, and keeping the SDK
                  inside this lazy chunk is what keeps it out of the bundle
                  everyone else downloads. The splat is Clerk's requirement: it
                  routes its own sub-steps (OTP, SSO callback) under this path. */}
              {isClerkEnabled && <Route path="/sign-in/*" element={<ClerkSignIn />} />}
              
              {/* Retailer Routes */}
              <Route element={<ProtectedRoute allowedRoles={['retailer']} />}>
                <Route path="/retailer" element={
                  <BasketProvider>
                    <RequireOnboarding />
                  </BasketProvider>
                }>
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
                  <Route path="products" element={<Layout title="Products" role="retailer"><ProductDiscovery /></Layout>} />
                  <Route path="products/:productId" element={<Layout title="Product" role="retailer" showBack><ProductDetail /></Layout>} />
                  <Route path="procurement" element={<Layout title="Basket" role="retailer"><ProcurementReview /></Layout>} />
                  <Route path="report-demand" element={<Layout title="Demand report" role="retailer" showBack width="narrow"><ReportDemand /></Layout>} />
                  <Route path="reorder" element={<Layout title="Reorder" role="retailer" showBack><Reorder /></Layout>} />
                  <Route path="inventory" element={<Layout title="Stock" role="retailer" width="wide"><Inventory /></Layout>} />
                  <Route path="voice-sale" element={<Layout title="Bol kar bechein" role="retailer" showBack width="narrow"><VoiceSale /></Layout>} />
                  <Route path="restock" element={<Layout title="Restock" role="retailer" showBack width="wide"><RestockPlan /></Layout>} />
                  <Route path="sourcing" element={<Layout title="Sourcing" role="retailer" showBack width="wide"><Sourcing /></Layout>} />
                  <Route path="deliveries" element={<Layout title="Delivery" role="retailer" width="wide"><Deliveries /></Layout>} />
                  <Route path="schemes" element={<Layout title="Loan" role="retailer" showBack width="wide"><Loans /></Layout>} />
                </Route>
              </Route>

              {/* Customer Routes — the household ordering from a nearby shop. */}
              <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
                <Route path="/shop" element={<Layout title="Dukaanein" role="customer"><Shops /></Layout>} />
                <Route path="/shop/orders" element={<Layout title="Mere order" role="customer"><MyOrders /></Layout>} />
                <Route path="/shop/address" element={<Layout title="Mera pata" role="customer" showBack width="narrow"><Address /></Layout>} />
                <Route path="/shop/orders/:orderId" element={<Layout title="Order" role="customer" showBack><MyOrderDetail /></Layout>} />
                <Route path="/shop/:shopId" element={<Layout title="Dukaan" role="customer" showBack><ShopCatalogue /></Layout>} />
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
                  <Route path="schemes" element={<Layout title="Loan" role="distributor" showBack width="wide"><Loans /></Layout>} />
                </Route>
              </Route>

              <Route path="*" element={<Layout title="Page nahi mila" showBottomNav={false}><NotFound /></Layout>} />
            </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
