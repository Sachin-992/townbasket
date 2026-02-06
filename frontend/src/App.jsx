import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import SellerDashboard from './pages/SellerDashboard'
import DeliveryDashboard from './pages/DeliveryDashboard'
import ResetPasswordPage from './pages/ResetPasswordPage'
import NotFoundPage from './pages/NotFoundPage'

// Admin Components
import AdminLayout from './components/admin/AdminLayout'
import AdminHome, {
  AdminSellers,
  AdminOrders,
  AdminDelivery,
  AdminComplaints,
  AdminCategories,
  AdminSettings
} from './pages/admin/AdminPages'

// Customer Pages
import HomePage from './pages/customer/HomePage'
import ShopsListPage from './pages/customer/ShopsListPage'
import ShopDetailPage from './pages/customer/ShopDetailPage'
import CartPage from './pages/customer/CartPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrderSuccessPage from './pages/customer/OrderSuccessPage'
import OrdersPage from './pages/customer/OrdersPage'
import ProfilePage from './pages/customer/ProfilePage'
import SavedAddressesPage from './pages/customer/SavedAddressesPage'
import OffersPage from './pages/customer/OffersPage'
import NotificationsPage from './pages/customer/NotificationsPage'
import HelpSupportPage from './pages/customer/HelpSupportPage'
import AboutPage from './pages/customer/AboutPage'
import TermsPage from './pages/customer/TermsPage'
import PrivacyPolicyPage from './pages/customer/PrivacyPolicyPage'
import ContactUsPage from './pages/customer/ContactUsPage'

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Role Selection (after first login) */}
              <Route
                path="/select-role"
                element={
                  <ProtectedRoute>
                    <RoleSelectionPage />
                  </ProtectedRoute>
                }
              />

              {/* Customer Routes */}
              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/shops"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <ShopsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/shop/:shopId"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <ShopDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/cart"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/checkout"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/order-success"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <OrderSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/orders"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/profile"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/addresses"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <SavedAddressesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/offers"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <OffersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/notifications"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/help"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <HelpSupportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/about"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <AboutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/terms"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <TermsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/privacy"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <PrivacyPolicyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/contact"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <ContactUsPage />
                  </ProtectedRoute>
                }
              />

              {/* Seller Routes */}
              <Route
                path="/seller/*"
                element={
                  <ProtectedRoute allowedRoles={['seller']}>
                    <SellerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Delivery Routes */}
              <Route
                path="/delivery/*"
                element={
                  <ProtectedRoute allowedRoles={['delivery']}>
                    <DeliveryDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminHome />} />
                <Route path="sellers" element={<AdminSellers />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="delivery" element={<AdminDelivery />} />
                <Route path="complaints" element={<AdminComplaints />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Default redirect */}
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* 404 Not Found - Must be last */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
