import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/ui/PageLoader'
import DocumentTitle from './components/DocumentTitle'

// ────────────────────────────────────────────
// Eagerly loaded (needed on first paint)
// ────────────────────────────────────────────
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

// ────────────────────────────────────────────
// Lazy loaded — separate chunks per role
// ────────────────────────────────────────────

// Auth
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Seller
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'))

// Delivery
const DeliveryDashboard = lazy(() => import('./pages/DeliveryDashboard'))

// Admin — modular control center
const AdminLayout = lazy(() => import('./admin/layout/AdminLayout'))
const AdminOverview = lazy(() => import('./admin/overview/index.js').then(m => ({ default: m.OverviewPage })))
const AdminSellers = lazy(() => import('./admin/shops/index.js').then(m => ({ default: m.SellersPage })))
const AdminOrders = lazy(() => import('./admin/orders/index.js').then(m => ({ default: m.OrdersPage })))
const AdminDelivery = lazy(() => import('./admin/delivery/index.js').then(m => ({ default: m.DeliveryPage })))
const AdminComplaints = lazy(() => import('./admin/pages/ComplaintsPage'))
const AdminCategories = lazy(() => import('./admin/pages/CategoriesPage'))
const AdminSettings = lazy(() => import('./admin/pages/SettingsPage'))
const AdminAuditLog = lazy(() => import('./admin/audit/index.js').then(m => ({ default: m.AuditLogPage })))
const AdminFraud = lazy(() => import('./admin/fraud/index.js').then(m => ({ default: m.FraudPage })))
const AdminAnalytics = lazy(() => import('./admin/revenue/index.js').then(m => ({ default: m.AnalyticsPage })))
const AdminSystemHealth = lazy(() => import('./admin/system/index.js').then(m => ({ default: m.SystemHealthPage })))
const AdminUsers = lazy(() => import('./admin/users/index.js').then(m => ({ default: m.UsersPage })))
const AdminNotifications = lazy(() => import('./admin/notifications/index.js').then(m => ({ default: m.NotificationsPage })))

// Customer Pages
const HomePage = lazy(() => import('./pages/customer/HomePage'))
const ShopsListPage = lazy(() => import('./pages/customer/ShopsListPage'))
const ShopDetailPage = lazy(() => import('./pages/customer/ShopDetailPage'))

const CartPage = lazy(() => import('./pages/customer/CartPage'))
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('./pages/customer/OrderSuccessPage'))
const OrdersPage = lazy(() => import('./pages/customer/OrdersPage'))
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage'))
const SavedAddressesPage = lazy(() => import('./pages/customer/SavedAddressesPage'))
const OffersPage = lazy(() => import('./pages/customer/OffersPage'))
const NotificationsPage = lazy(() => import('./pages/customer/NotificationsPage'))
const HelpSupportPage = lazy(() => import('./pages/customer/HelpSupportPage'))
const AboutPage = lazy(() => import('./pages/customer/AboutPage'))
const TermsPage = lazy(() => import('./pages/customer/TermsPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/customer/PrivacyPolicyPage'))
const ContactUsPage = lazy(() => import('./pages/customer/ContactUsPage'))



function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <ConfirmProvider>
                <DocumentTitle />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />

                    {/* Role Selection */}
                    <Route
                      path="/select-role"
                      element={
                        <ProtectedRoute>
                          <RoleSelectionPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Customer Routes */}
                    <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']}><HomePage /></ProtectedRoute>} />
                    <Route path="/customer/shops" element={<ProtectedRoute allowedRoles={['customer']}><ShopsListPage /></ProtectedRoute>} />
                    <Route path="/customer/shop/:shopId" element={<ProtectedRoute allowedRoles={['customer']}><ShopDetailPage /></ProtectedRoute>} />
                    <Route path="/customer/cart" element={<ProtectedRoute allowedRoles={['customer']}><CartPage /></ProtectedRoute>} />
                    <Route path="/customer/checkout" element={<ProtectedRoute allowedRoles={['customer']}><CheckoutPage /></ProtectedRoute>} />
                    <Route path="/customer/order-success" element={<ProtectedRoute allowedRoles={['customer']}><OrderSuccessPage /></ProtectedRoute>} />
                    <Route path="/customer/orders" element={<ProtectedRoute allowedRoles={['customer']}><OrdersPage /></ProtectedRoute>} />
                    <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><ProfilePage /></ProtectedRoute>} />
                    <Route path="/customer/addresses" element={<ProtectedRoute allowedRoles={['customer']}><SavedAddressesPage /></ProtectedRoute>} />
                    <Route path="/customer/offers" element={<ProtectedRoute allowedRoles={['customer']}><OffersPage /></ProtectedRoute>} />
                    <Route path="/customer/notifications" element={<ProtectedRoute allowedRoles={['customer']}><NotificationsPage /></ProtectedRoute>} />
                    <Route path="/customer/help" element={<ProtectedRoute allowedRoles={['customer']}><HelpSupportPage /></ProtectedRoute>} />
                    <Route path="/customer/about" element={<ProtectedRoute allowedRoles={['customer']}><AboutPage /></ProtectedRoute>} />
                    <Route path="/customer/terms" element={<ProtectedRoute allowedRoles={['customer']}><TermsPage /></ProtectedRoute>} />
                    <Route path="/customer/privacy" element={<ProtectedRoute allowedRoles={['customer']}><PrivacyPolicyPage /></ProtectedRoute>} />
                    <Route path="/customer/contact" element={<ProtectedRoute allowedRoles={['customer']}><ContactUsPage /></ProtectedRoute>} />

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
                      <Route index element={<AdminOverview />} />
                      <Route path="sellers" element={<AdminSellers />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="delivery" element={<AdminDelivery />} />
                      <Route path="complaints" element={<AdminComplaints />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="analytics" element={<AdminAnalytics />} />
                      <Route path="fraud" element={<AdminFraud />} />
                      <Route path="system-health" element={<AdminSystemHealth />} />
                      <Route path="audit-log" element={<AdminAuditLog />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="notifications" element={<AdminNotifications />} />
                    </Route>

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </ConfirmProvider>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
