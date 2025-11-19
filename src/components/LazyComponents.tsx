import { lazy } from 'react';

// Lazy load heavy admin components
export const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
export const AdminNannies = lazy(() => import('@/pages/admin/AdminNannies'));
export const AdminClientManagement = lazy(() => import('@/pages/admin/AdminClientManagement'));
export const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments'));
export const AdminSupport = lazy(() => import('@/pages/admin/AdminSupport'));
export const AdminVerification = lazy(() => import('@/pages/admin/AdminVerification'));
export const AdminUserManagement = lazy(() => import('@/pages/admin/AdminUserManagement').then(module => ({ default: module.AdminUserManagement })));
export const AdminBookingManagement = lazy(() => import('@/pages/admin/AdminBookingManagement'));
export const AdminNannyProfiles = lazy(() => import('@/pages/admin/AdminNannyProfiles'));
export const AdminNannyAvailability = lazy(() => import('@/pages/admin/AdminNannyAvailability'));
export const AdminProfessionalDevelopment = lazy(() => import('@/pages/admin/AdminProfessionalDevelopment').then(module => ({ default: module.AdminProfessionalDevelopment })));
export const AdminInterviews = lazy(() => import('@/pages/admin/AdminInterviews'));
export const AdminTools = lazy(() => import('@/pages/admin/AdminTools').then(module => ({ default: module.AdminTools })));

// Lazy load client components
export const ClientInterviews = lazy(() => import('@/pages/client/ClientInterviews'));
export const ClientCalendar = lazy(() => import('@/pages/client/ClientCalendar'));
export const ClientFavorites = lazy(() => import('@/pages/client/ClientFavorites'));
export const ClientNotifications = lazy(() => import('@/pages/client/ClientNotifications'));
export const ClientPaymentSettings = lazy(() => import('@/pages/client/ClientPaymentSettings'));
export const ClientProfileSettings = lazy(() => import('@/pages/client/ClientProfileSettings'));
export const ClientPrivacyPolicy = lazy(() => import('@/pages/client/ClientPrivacyPolicy'));
export const ClientTermsConditions = lazy(() => import('@/pages/client/ClientTermsConditions'));

// Lazy load nanny components
export const NannyBookings = lazy(() => import('@/pages/nanny/NannyBookings'));
export const NannyBookingsManagement = lazy(() => import('@/pages/nanny/NannyBookingsManagement'));
export const NannyCalendar = lazy(() => import('@/pages/nanny/NannyCalendar'));
export const NannyInterviews = lazy(() => import('@/pages/nanny/NannyInterviews'));
export const NannyProfile = lazy(() => import('@/pages/nanny/NannyProfile'));
export const NannyPaymentAdvice = lazy(() => import('@/pages/nanny/NannyPaymentAdvice'));
export const NannyProfessionalDevelopment = lazy(() => import('@/pages/nanny/NannyProfessionalDevelopment').then(module => ({ default: module.NannyProfessionalDevelopment })));
export const NannyPrivacyPolicy = lazy(() => import('@/pages/nanny/NannyPrivacyPolicy'));
export const NannyTermsConditions = lazy(() => import('@/pages/nanny/NannyTermsConditions'));

// Lazy load other heavy components
export const SupportCenter = lazy(() => import('@/pages/SupportCenter'));
export const InterviewScheduling = lazy(() => import('@/pages/InterviewScheduling'));
export const TrustVerification = lazy(() => import('@/pages/TrustVerification'));