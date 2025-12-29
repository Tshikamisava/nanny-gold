
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { BookingProvider } from "./contexts/BookingContext";
import { AuthProvider } from "./components/AuthProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import PublicRoute from "./components/PublicRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import TenantRoute from "./components/TenantRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { NannyLayout } from "./layouts/NannyLayout";
import { ClientLayout } from "./layouts/ClientLayout";
import { ClientProfileGate } from "./components/ClientProfileGate";
import { UserCleanup } from "./components/UserCleanup";
import { Skeleton } from "@/components/ui/skeleton";
import AuthRedirect from "./components/AuthRedirect";
import { initializeDataPreloading } from "./utils/dataPreloader";
import { PublicLayout } from "./layouts/PublicLayout";

// Critical pages (loaded immediately)
import LandingScreen from "./pages/LandingScreen";
import SimpleAuthScreen from "./pages/SimpleAuthScreen";
import LoginScreen from "./pages/LoginScreen";
import AdminLogin from "./pages/AdminLogin";
import NannyAuth from "./pages/NannyAuth";
import NotFound from "./pages/NotFound";
import OtpVerification from "./pages/OtpVerification";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import AdminSetup from "./pages/AdminSetup";

// Lazy load all other pages
const ServicePrompt = lazy(() => import("./pages/ServicePrompt"));
const ShortTermBooking = lazy(() => import("./pages/ShortTermBooking"));
const EmergencyBookingConfirmation = lazy(() => import("./pages/EmergencyBookingConfirmation"));
const LivingArrangement = lazy(() => import("./pages/LivingArrangement"));
const ScheduleBuilder = lazy(() => import("./pages/ScheduleBuilder"));
const NannyPreferences = lazy(() => import("./pages/NannyPreferences"));
const TrustVerification = lazy(() => import("./pages/TrustVerification"));
const MatchResults = lazy(() => import("./pages/MatchResults"));
const PaymentScreen = lazy(() => import("./pages/PaymentScreen"));
const EFTPaymentScreen = lazy(() => import("./pages/EFTPaymentScreen"));

const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const ReviewScreen = lazy(() => import("./pages/ReviewScreen"));
const SupportCenter = lazy(() => import("./pages/SupportCenter"));
const InterviewScheduling = lazy(() => import("./pages/InterviewScheduling"));
const NannyProfileView = lazy(() => import("./pages/NannyProfile"));
const NewClientOnboarding = lazy(() => import("./pages/NewClientOnboarding"));

// Admin Pages (lazy loaded)
const AdminOverview = lazy(() => import("./components/performance/OptimizedAdminOverview"));
const AdminNannies = lazy(() => import("./pages/admin/AdminNannies"));
const AdminNannyProfiles = lazy(() => import("./pages/admin/AdminNannyProfiles"));
const AdminClientManagement = lazy(() => import("./pages/admin/AdminClientManagement"));
const AdminBookingManagement = lazy(() => import("./pages/admin/AdminBookingManagement"));
const AdminBookingCalendar = lazy(() => import("./pages/admin/AdminBookingCalendar"));
const AdminReferralProgram = lazy(() => import("./pages/admin/AdminReferralProgram"));
const AdminProfessionalDevelopment = lazy(() => import("./pages/admin/AdminProfessionalDevelopment").then(module => ({ default: module.AdminProfessionalDevelopment })));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminVerification = lazy(() => import("./pages/admin/AdminVerification"));
const AdminInterviews = lazy(() => import("./pages/admin/AdminInterviews"));
const AdminNannyProfileView = lazy(() => import("./pages/admin/AdminNannyProfileView"));
const AdminNannyProfileEdit = lazy(() => import("./pages/admin/AdminNannyProfileEdit"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminUserManagement = lazy(() => import("./pages/admin/AdminUserManagement").then(module => ({ default: module.AdminUserManagement })));
const AdminTools = lazy(() => import("./pages/admin/AdminTools").then(module => ({ default: module.AdminTools })));
const AdminInvoicingRewards = lazy(() => import("./pages/admin/AdminInvoicingRewards").then(module => ({ default: module.AdminInvoicingRewards })));
const AdminInvoiceManagement = lazy(() => import("./pages/admin/AdminInvoiceManagement"));
const AdminPaymentProofs = lazy(() => import("./pages/admin/AdminPaymentProofs"));
const AdminTestingSuite = lazy(() => import("./pages/admin/AdminTestingSuite").then(module => ({ default: module.default })));
const CommunicationCalendarTester = lazy(() => import("./components/CommunicationCalendarTester"));

// Nanny Pages (lazy loaded)
const NannyMessages = lazy(() => import("./pages/nanny/NannyMessages"));
const NannyDashboard = lazy(() => import("./pages/nanny/NannyDashboard"));
const NannyBookingsManagement = lazy(() => import("./pages/nanny/NannyBookingsManagement"));
const NannyInterviews = lazy(() => import("./pages/nanny/NannyInterviews"));
const NannyCalendar = lazy(() => import("./pages/nanny/NannyCalendar"));
const NannyProfile = lazy(() => import("./pages/nanny/NannyProfile"));
const NannyProfessionalDevelopment = lazy(() => import("./pages/nanny/NannyProfessionalDevelopment").then(module => ({ default: module.NannyProfessionalDevelopment })));
const NannyPrivacyPolicy = lazy(() => import("./pages/nanny/NannyPrivacyPolicy"));
const NannyTermsConditions = lazy(() => import("./pages/nanny/NannyTermsConditions"));
const NannyReferrals = lazy(() => import("./pages/nanny/NannyReferrals").then(module => ({ default: module.NannyReferrals })));

// Client Pages (lazy loaded)
const ClientDashboard = lazy(() => import("./pages/client/ClientDashboard"));
const ClientBookingDetails = lazy(() => import("./pages/client/ClientBookingDetails"));
const ClientCalendar = lazy(() => import("./pages/client/ClientCalendar"));
const ClientInterviews = lazy(() => import("./pages/client/ClientInterviews"));
const ClientFavorites = lazy(() => import("./pages/client/ClientFavorites"));
const ClientInvoices = lazy(() => import("./pages/client/ClientInvoices"));
const ClientPaymentSettings = lazy(() => import("./pages/client/ClientPaymentSettings"));
const ClientProfileSettings = lazy(() => import("./pages/client/ClientProfileSettings"));
const ClientNotifications = lazy(() => import("./pages/client/ClientNotifications"));
const NotificationPanel = lazy(() => import("./components/notifications/NotificationPanel"));
const ClientPrivacyPolicy = lazy(() => import("./pages/client/ClientPrivacyPolicy"));
const ClientTermsConditions = lazy(() => import("./pages/client/ClientTermsConditions"));
const ClientReferrals = lazy(() => import("./pages/client/ClientReferrals").then(module => ({ default: module.ClientReferrals })));
const ClientEmails = lazy(() => import("./pages/client/ClientEmails"));
const NannyEmails = lazy(() => import("./pages/nanny/NannyEmails"));
const AdminEmails = lazy(() => import("./pages/admin/AdminEmails"));

// Enhanced Auth Pages
const EnhancedSignup = lazy(() => import("./pages/EnhancedSignup"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen p-6 flex items-center justify-center">
    <div className="w-full max-w-2xl space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  </div>
);

const prefetchTargets = [
  () => import("./pages/MatchResults"),
  () => import("./pages/PaymentScreen"),
  () => import("./pages/EFTPaymentScreen"),
  () => import("./pages/ServicePrompt"),
  () => import("./pages/ShortTermBooking"),
];

const App = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    initializeDataPreloading(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    type IdleHandle = number;
    const scheduleIdle = (callback: () => void): IdleHandle => {
      if ("requestIdleCallback" in window && typeof window.requestIdleCallback === "function") {
        return window.requestIdleCallback(() => callback()) as unknown as IdleHandle;
      }
      return window.setTimeout(callback, 2000);
    };

    const cancelIdle = (handle: IdleHandle) => {
      if ("cancelIdleCallback" in window && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(handle as unknown as number);
      } else {
        clearTimeout(handle);
      }
    };

    const handle = scheduleIdle(() => {
      prefetchTargets.forEach(prefetch => {
        prefetch().catch(() => {
          // Best-effort prefetch – ignore failures
        });
      });
    });

    return () => {
      cancelIdle(handle);
    };
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <AuthProvider>
          <BookingProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_relativeSplatPath: true }}>
              <Routes>
                {/* Public Routes with Layout */}
                <Route path="/" element={
                  <PublicRoute>
                    <LandingScreen />
                  </PublicRoute>
                } />
                <Route path="/auth" element={
                  <PublicRoute>
                    <SimpleAuthScreen />
                  </PublicRoute>
                } />
                <Route path="/login" element={
                  <PublicRoute>
                    <LoginScreen />
                  </PublicRoute>
                } />
                <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
                <Route path="/enhanced-signup" element={
                  <PublicRoute>
                    <Suspense fallback={<PageLoader />}><EnhancedSignup /></Suspense>
                  </PublicRoute>
                } />
                <Route element={<PublicLayout />}>
                  <Route path="/admin-login" element={
                    <PublicRoute>
                      <AdminLogin />
                    </PublicRoute>
                  } />
                  <Route path="/nanny/auth" element={
                    <PublicRoute redirectTo="/nanny">
                      <NannyAuth />
                    </PublicRoute>
                  } />
                  <Route path="/reset-password" element={
                    <PublicRoute>
                      <ResetPassword />
                    </PublicRoute>
                  } />
                  <Route path="/forgot-password" element={
                    <PublicRoute>
                      <ForgotPassword />
                    </PublicRoute>
                  } />
                </Route>

                {/* Standalone Routes (No Layout or Custom Layout) */}
                <Route path="/admin-setup" element={<AdminSetup />} />
                <Route path="/user-cleanup" element={<UserCleanup />} />
                <Route path="/otp-verification" element={<OtpVerification />} />
                <Route path="/auth-redirect" element={
                  <ProtectedRoute>
                    <AuthRedirect />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <TenantRoute requiredRole="admin">
                    <AdminLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AdminOverview /></Suspense>} />
                  <Route path="nannies" element={<Suspense fallback={<PageLoader />}><AdminNannies /></Suspense>} />
                  <Route path="nanny-profiles" element={<Suspense fallback={<PageLoader />}><AdminNannyProfiles /></Suspense>} />
                  <Route path="nanny-profile/:nannyId" element={<Suspense fallback={<PageLoader />}><AdminNannyProfileView /></Suspense>} />
                  <Route path="nanny-profile/:nannyId/edit" element={<Suspense fallback={<PageLoader />}><AdminNannyProfileEdit /></Suspense>} />
                  <Route path="clients" element={<Suspense fallback={<PageLoader />}><AdminClientManagement /></Suspense>} />
                  <Route path="bookings" element={<Suspense fallback={<PageLoader />}><AdminBookingManagement /></Suspense>} />
                  <Route path="booking-calendar" element={<Suspense fallback={<PageLoader />}><AdminBookingCalendar /></Suspense>} />
                  <Route path="referral-program" element={<Suspense fallback={<PageLoader />}><AdminReferralProgram /></Suspense>} />
                  <Route path="professional-development" element={<Suspense fallback={<PageLoader />}><AdminProfessionalDevelopment /></Suspense>} />
                  <Route path="support" element={<Suspense fallback={<PageLoader />}><AdminSupport /></Suspense>} />
                  <Route path="verification" element={<Suspense fallback={<PageLoader />}><AdminVerification /></Suspense>} />
                  <Route path="interviews" element={<Suspense fallback={<PageLoader />}><AdminInterviews /></Suspense>} />
                  <Route path="tools" element={<Suspense fallback={<PageLoader />}><AdminTools /></Suspense>} />
                  <Route path="user-management" element={<Suspense fallback={<PageLoader />}><AdminUserManagement /></Suspense>} />
                  <Route path="payments" element={<Suspense fallback={<PageLoader />}><AdminPayments /></Suspense>} />
                  <Route path="payment-proofs" element={<Suspense fallback={<PageLoader />}><AdminPaymentProofs /></Suspense>} />
                  <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AdminAnalytics /></Suspense>} />
                  <Route path="testing-suite" element={<Suspense fallback={<PageLoader />}><AdminTestingSuite /></Suspense>} />
                  <Route path="communication-test" element={<Suspense fallback={<PageLoader />}><CommunicationCalendarTester /></Suspense>} />
                  <Route path="invoicing-rewards" element={<Suspense fallback={<PageLoader />}><AdminInvoicingRewards /></Suspense>} />
                  <Route path="invoice-management" element={<Suspense fallback={<PageLoader />}><AdminInvoiceManagement /></Suspense>} />
                  <Route path="notifications-inbox" element={<Suspense fallback={<PageLoader />}><NotificationPanel /></Suspense>} />
                  <Route path="emails" element={<Suspense fallback={<PageLoader />}><AdminEmails /></Suspense>} />
                </Route>

                {/* Nanny Routes */}
                <Route path="/nanny" element={
                  <TenantRoute requiredRole="nanny">
                    <NannyLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><NannyDashboard /></Suspense>} />
                  <Route path="messages" element={<Suspense fallback={<PageLoader />}><NannyMessages /></Suspense>} />
                  <Route path="bookings" element={<Suspense fallback={<PageLoader />}><NannyBookingsManagement /></Suspense>} />
                  <Route path="calendar" element={<Suspense fallback={<PageLoader />}><NannyCalendar /></Suspense>} />
                  <Route path="interviews" element={<Suspense fallback={<PageLoader />}><NannyInterviews /></Suspense>} />
                  <Route path="professional-development" element={<Suspense fallback={<PageLoader />}><NannyProfessionalDevelopment /></Suspense>} />
                  <Route path="referrals" element={<Suspense fallback={<PageLoader />}><NannyReferrals /></Suspense>} />
                  <Route path="profile" element={<Suspense fallback={<PageLoader />}><NannyProfile /></Suspense>} />
                  <Route path="privacy-policy" element={<Suspense fallback={<PageLoader />}><NannyPrivacyPolicy /></Suspense>} />
                  <Route path="terms-conditions" element={<Suspense fallback={<PageLoader />}><NannyTermsConditions /></Suspense>} />
                  <Route path="notifications" element={<Suspense fallback={<PageLoader />}><ClientNotifications /></Suspense>} />
                  <Route path="notifications-inbox" element={<Suspense fallback={<PageLoader />}><NotificationPanel /></Suspense>} />
                  <Route path="emails" element={<Suspense fallback={<PageLoader />}><NannyEmails /></Suspense>} />
                </Route>

                {/* Client Routes */}
                <Route path="/dashboard" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientDashboard /></Suspense>} />
                  <Route path="bookings/:bookingId" element={<Suspense fallback={<PageLoader />}><ClientBookingDetails /></Suspense>} />
                  <Route path="interviews" element={<Suspense fallback={<PageLoader />}><ClientInterviews /></Suspense>} />
                  <Route path="interviews" element={<Suspense fallback={<PageLoader />}><ClientInterviews /></Suspense>} />
                  <Route path="favorites" element={<Suspense fallback={<PageLoader />}><ClientFavorites /></Suspense>} />
                  <Route path="support" element={<Suspense fallback={<PageLoader />}><SupportCenter /></Suspense>} />
                </Route>

                {/* Support route for Clients (Direct Access) */}
                <Route path="/support" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><SupportCenter /></Suspense>} />
                </Route>
                <Route path="/client/calendar" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientCalendar /></Suspense>} />
                </Route>
                <Route path="/client/payment-settings" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientPaymentSettings /></Suspense>} />
                </Route>
                <Route path="/client/profile-settings" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientProfileSettings /></Suspense>} />
                </Route>
                <Route path="/client/notifications" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientNotifications /></Suspense>} />
                </Route>
                <Route path="/client/notifications-inbox" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><NotificationPanel /></Suspense>} />
                </Route>

                <Route path="/client/emails" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientEmails /></Suspense>} />
                </Route>

                <Route path="/client/referrals" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientReferrals /></Suspense>} />
                </Route>
                <Route path="/client/invoices" element={
                  <TenantRoute requiredRole="client">
                    <ClientLayout />
                  </TenantRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ClientInvoices /></Suspense>} />
                </Route>
                <Route path="/client-onboarding" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <NewClientOnboarding />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/service-prompt" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <ServicePrompt />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/short-term-booking" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <ShortTermBooking />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/emergency-booking-confirmation" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <EmergencyBookingConfirmation />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/living-arrangement" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <LivingArrangement />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/schedule-builder" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <ScheduleBuilder />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/nanny-preferences" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <NannyPreferences />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/trust-verification" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <TrustVerification />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/match-results" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <MatchResults />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/payment" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <PaymentScreen />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/eft-payment" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <EFTPaymentScreen />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                <Route path="/booking-confirmation" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <BookingConfirmation />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/review" element={
                  <ProtectedRoute>
                    <ClientProfileGate>
                      <Suspense fallback={<PageLoader />}>
                        <ReviewScreen />
                      </Suspense>
                    </ClientProfileGate>
                  </ProtectedRoute>
                } />
                {/* Redundant Support Route Removed */
/*               <Route path="/support" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SupportCenter />
                  </Suspense>
                </ProtectedRoute>
              } /> */}
                <Route path="/interview-scheduling" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <InterviewScheduling />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/nanny-profile/:nannyId" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <NannyProfileView />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/client-privacy-policy" element={
                  <TenantRoute requiredRole="client">
                    <Suspense fallback={<PageLoader />}>
                      <ClientPrivacyPolicy />
                    </Suspense>
                  </TenantRoute>
                } />
                <Route path="/client-terms-conditions" element={
                  <TenantRoute requiredRole="client">
                    <Suspense fallback={<PageLoader />}>
                      <ClientTermsConditions />
                    </Suspense>
                  </TenantRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </BookingProvider>
        </AuthProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default App;
