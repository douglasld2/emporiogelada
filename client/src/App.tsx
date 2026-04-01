import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/lib/CartContext";
import { AuthProvider } from "@/lib/AuthContext";
import { StoreProvider } from "@/lib/StoreContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AdminRoute, AuthRoute } from "@/components/RouteGuard";
import { AgeVerification } from "@/components/AgeVerification";

import Home from "@/pages/home";
import GroupPage from "@/pages/group";
import KitsPage from "@/pages/kits";
import CollectionPage from "@/pages/collection";
import ShopPage from "@/pages/shop";
import ProductPage from "@/pages/product";
import Checkout from "@/pages/checkout";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import PoliciesPage from "@/pages/policies";
import NotFound from "@/pages/not-found";

// Auth Pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import VerifyEmailPage from "@/pages/verify-email";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminGroups from "@/pages/admin/groups";
import AdminCollections from "@/pages/admin/collections";
import AdminProducts from "@/pages/admin/products";
import AdminKits from "@/pages/admin/kits";
import AdminPayments from "@/pages/admin/payments";
import AdminCoupons from "@/pages/admin/coupons";
import AdminPromotions from "@/pages/admin/promotions";
import AdminCashback from "@/pages/admin/cashback";
import AdminReferral from "@/pages/admin/referral";
import AdminSupport from "@/pages/admin/support";
import AdminOrders from "@/pages/admin/orders";
import AdminSettings from "@/pages/admin/settings";

// Checkout Status Pages
import CheckoutSuccess from "@/pages/checkout/success";
import CheckoutFailure from "@/pages/checkout/failure";
import CheckoutPending from "@/pages/checkout/pending";

// Customer Account Pages
import AccountOverview from "@/pages/account/overview";
import AccountOrders from "@/pages/account/orders";
import AccountAddresses from "@/pages/account/addresses";
import AccountSupport from "@/pages/account/support";
import AccountReferral from "@/pages/account/referral";
import RefLandingPage from "@/pages/ref-landing";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/kits" component={KitsPage} />
      <Route path="/grupo/:id" component={GroupPage} />
      <Route path="/collection/:id" component={CollectionPage} />
      <Route path="/product/:id" component={ProductPage} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/politicas" component={PoliciesPage} />
      
      {/* Auth Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/verificar-email" component={VerifyEmailPage} />
      <Route path="/esqueci-senha" component={ForgotPasswordPage} />
      <Route path="/redefinir-senha" component={ResetPasswordPage} />

      {/* Checkout Status Routes */}
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/failure" component={CheckoutFailure} />
      <Route path="/checkout/pending" component={CheckoutPending} />

      {/* Admin Routes - Protected */}
      <Route path="/admin">{() => <AdminRoute><AdminDashboard /></AdminRoute>}</Route>
      <Route path="/admin/orders">{() => <AdminRoute><AdminOrders /></AdminRoute>}</Route>
      <Route path="/admin/groups">{() => <AdminRoute><AdminGroups /></AdminRoute>}</Route>
      <Route path="/admin/collections">{() => <AdminRoute><AdminCollections /></AdminRoute>}</Route>
      <Route path="/admin/products">{() => <AdminRoute><AdminProducts /></AdminRoute>}</Route>
      <Route path="/admin/kits">{() => <AdminRoute><AdminKits /></AdminRoute>}</Route>
      <Route path="/admin/coupons">{() => <AdminRoute><AdminCoupons /></AdminRoute>}</Route>
      <Route path="/admin/promotions">{() => <AdminRoute><AdminPromotions /></AdminRoute>}</Route>
      <Route path="/admin/cashback">{() => <AdminRoute><AdminCashback /></AdminRoute>}</Route>
      <Route path="/admin/referral">{() => <AdminRoute><AdminReferral /></AdminRoute>}</Route>
      <Route path="/admin/payments">{() => <AdminRoute><AdminPayments /></AdminRoute>}</Route>
      <Route path="/admin/settings">{() => <AdminRoute><AdminSettings /></AdminRoute>}</Route>
      <Route path="/admin/support/:ticketId?">{() => <AdminRoute><AdminSupport /></AdminRoute>}</Route>

      {/* Customer Account Routes - Protected */}
      <Route path="/account">{() => <AuthRoute><AccountOverview /></AuthRoute>}</Route>
      <Route path="/account/orders">{() => <AuthRoute><AccountOrders /></AuthRoute>}</Route>
      <Route path="/account/addresses">{() => <AuthRoute><AccountAddresses /></AuthRoute>}</Route>
      <Route path="/account/support">{() => <AuthRoute><AccountSupport /></AuthRoute>}</Route>
      <Route path="/account/referral">{() => <AuthRoute><AccountReferral /></AuthRoute>}</Route>
      <Route path="/ref/:code">{() => <RefLandingPage />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <AgeVerification />
            <ScrollToTop />
            <Toaster />
            <EmailVerificationBanner />
            <CartDrawer />
            <WhatsAppButton />
            <Router />
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
