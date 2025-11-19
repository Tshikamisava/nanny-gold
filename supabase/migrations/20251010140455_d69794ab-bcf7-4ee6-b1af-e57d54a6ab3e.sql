-- Phase 7: Database Cleanup - Fix duplicate bookings and correct pricing

-- Delete duplicate Oct 10 booking
DELETE FROM bookings WHERE id = '6153c07a-0d7b-401a-8f3c-4063828d1a21';

-- Fix Oct 17 booking with correct pricing for grand_estate home size
-- Base rate: R8,000 (grand_estate live-in + children/dependents surcharge)
-- Add-ons: R1,900 (R1,800 cooking + R100 backup nanny)
-- Total: R9,900
UPDATE bookings SET 
  base_rate = 8000.00,
  additional_services_cost = 1900.00,
  total_monthly_cost = 9900.00,
  home_size = 'grand_estate'
WHERE id = '002458c3-10c1-40df-9896-bae792e6f025';