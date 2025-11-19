-- Fix October 17 booking with correct unified service pricing
-- Cooking/Food Prep: R1,500/month (was incorrectly R1,800)
-- Backup Nanny Service: R100/month
-- Total additional services: R1,600/month
-- Total monthly cost: R8,000 base + R1,600 services = R9,600

UPDATE bookings SET 
  additional_services_cost = 1600.00,  -- R1,500 cooking + R100 backup nanny
  total_monthly_cost = 9600.00         -- R8,000 base + R1,600 services
WHERE id = '002458c3-10c1-40df-9896-bae792e6f025';

COMMENT ON TABLE bookings IS 'Updated pricing to reflect unified service pricing: Cooking/Food Prep R1,500/month, Backup Nanny R100/month';