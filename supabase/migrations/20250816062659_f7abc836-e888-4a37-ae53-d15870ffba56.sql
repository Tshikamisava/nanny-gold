-- Update the support_tickets category constraint to match FAQ categories
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;

-- Add new constraint with the actual FAQ categories from the JSON data
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_category_check 
CHECK (category IN (
  'general', 
  'bookings', 
  'coverage', 
  'emergency', 
  'nanny_matching', 
  'payments', 
  'preferences', 
  'profiles', 
  'replacement', 
  'safety', 
  'services', 
  'special_needs', 
  'support', 
  'technical', 
  'dispute', 
  'bespoke_arrangement'
));