-- Fix security definer functions by adding proper search_path
-- This fixes the security vulnerability that's preventing the edge function from working

-- Update all SECURITY DEFINER functions to have proper search_path
ALTER FUNCTION public.create_dev_client_profile(uuid) SET search_path = 'public';
ALTER FUNCTION public.is_admin(uuid) SET search_path = 'public';
ALTER FUNCTION public.update_children_count() SET search_path = 'public';
ALTER FUNCTION public.phone_exists(text) SET search_path = 'public';
ALTER FUNCTION public.is_super_admin(uuid) SET search_path = 'public';
ALTER FUNCTION public.update_verification_step(uuid, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.auto_assign_support_ticket() SET search_path = 'public';
ALTER FUNCTION public.get_admin_permissions(uuid) SET search_path = 'public';
ALTER FUNCTION public.create_dev_nanny_profile(uuid, text, text) SET search_path = 'public';
ALTER FUNCTION public.create_dev_admin_role(uuid) SET search_path = 'public';
ALTER FUNCTION public.notify_nanny_verification_update() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.schedule_interview_after_verification() SET search_path = 'public';
ALTER FUNCTION public.update_interviews_updated_at() SET search_path = 'public';
ALTER FUNCTION public.log_profile_change() SET search_path = 'public';
ALTER FUNCTION public.check_nanny_training_compliance(uuid) SET search_path = 'public';
ALTER FUNCTION public.log_role_changes() SET search_path = 'public';
ALTER FUNCTION public.seed_system_admin(text) SET search_path = 'public';
ALTER FUNCTION public.check_booking_conflicts(uuid, date, date, time, time) SET search_path = 'public';
ALTER FUNCTION public.generate_invoice_number() SET search_path = 'public';
ALTER FUNCTION public.generate_advice_number() SET search_path = 'public';
ALTER FUNCTION public.update_nanny_compliance_status() SET search_path = 'public';
ALTER FUNCTION public.trigger_update_nanny_compliance() SET search_path = 'public';
ALTER FUNCTION public.calculate_booking_revenue(uuid, numeric, text, numeric) SET search_path = 'public';
ALTER FUNCTION public.get_nanny_availability(uuid, date, date) SET search_path = 'public';
ALTER FUNCTION public.setup_super_admin(text) SET search_path = 'public';
ALTER FUNCTION public.update_nanny_rating() SET search_path = 'public';
ALTER FUNCTION public.notify_admins_of_profile_submission() SET search_path = 'public';
ALTER FUNCTION public.get_chat_messages(uuid) SET search_path = 'public';
ALTER FUNCTION public.check_security_status() SET search_path = 'public';
ALTER FUNCTION public.send_chat_message(uuid, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.security_validation_report() SET search_path = 'public';
ALTER FUNCTION public.assign_material_to_all_nannies(uuid, timestamp with time zone) SET search_path = 'public';
ALTER FUNCTION public.update_nanny_pd_compliance() SET search_path = 'public';
ALTER FUNCTION public.update_assignment_status() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.notify_nanny_payment_advice() SET search_path = 'public';
ALTER FUNCTION public.calculate_booking_revenue(uuid, numeric, text, numeric, integer) SET search_path = 'public';
ALTER FUNCTION public.set_default_payment_method() SET search_path = 'public';
ALTER FUNCTION public.notify_client_invoice() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_otps() SET search_path = 'public';
ALTER FUNCTION public.auto_accept_backup_nanny() SET search_path = 'public';
ALTER FUNCTION public.handle_booking_rejection() SET search_path = 'public';