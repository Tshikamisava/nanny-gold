-- First, let's create some sample profiles for our nannies
INSERT INTO public.profiles (id, user_type, first_name, last_name, email, phone, location) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'nanny', 'Sarah', 'Johnson', 'sarah.johnson@example.com', '+27123456789', 'Johannesburg'),
('550e8400-e29b-41d4-a716-446655440002', 'nanny', 'Maria', 'Ndlovu', 'maria.ndlovu@example.com', '+27123456790', 'Cape Town'),
('550e8400-e29b-41d4-a716-446655440003', 'nanny', 'Nomsa', 'Mthembu', 'nomsa.mthembu@example.com', '+27123456791', 'Durban'),
('550e8400-e29b-41d4-a716-446655440004', 'nanny', 'Thandi', 'Pule', 'thandi.pule@example.com', '+27123456792', 'Pretoria');

-- Now create the nanny records
INSERT INTO public.nannies (id, experience_level, hourly_rate, monthly_rate, rating, total_reviews, is_available, bio, languages, skills, certifications) VALUES
('550e8400-e29b-41d4-a716-446655440001', '3-6', 80, 5200, 4.9, 23, true, 'Experienced childcare professional with a passion for early childhood development. Specializes in creating engaging, educational activities.', '["English", "Afrikaans"]', '["First Aid", "Early Childhood Development", "Creative Play"]', '["First Aid Certification", "ECD Level 4"]'),
('550e8400-e29b-41d4-a716-446655440002', '6+', 100, 6500, 4.8, 31, true, 'Senior nanny with over 8 years of experience. Expert in special needs care and bilingual education.', '["English", "Zulu", "Xhosa"]', '["Special Needs Care", "Montessori Method", "Music Therapy"]', '["Advanced First Aid", "Special Needs Training", "Montessori Certification"]'),
('550e8400-e29b-41d4-a716-446655440003', '3-6', 75, 4800, 4.7, 18, true, 'Loving and dedicated nanny who believes in nurturing each child''s unique potential. Great with toddlers and school-age children.', '["English", "Zulu"]', '["Toddler Care", "Homework Help", "Outdoor Activities"]', '["First Aid Certification", "Swimming Instructor"]'),
('550e8400-e29b-41d4-a716-446655440004', '1-3', 65, 4200, 4.6, 12, true, 'Energetic and caring nanny who loves working with children. Excellent at creating structured yet fun daily routines.', '["English", "Afrikaans", "Sotho"]', '["Creative Arts", "Sports Coaching", "Meal Preparation"]', '["First Aid Certification", "Sports Coaching Level 1"]');

-- Create nanny services for each nanny
INSERT INTO public.nanny_services (nanny_id, pet_care, cooking, special_needs, ecd_training, montessori) VALUES
('550e8400-e29b-41d4-a716-446655440001', false, true, false, true, false),
('550e8400-e29b-41d4-a716-446655440002', true, true, true, true, true),
('550e8400-e29b-41d4-a716-446655440003', false, true, false, false, false),
('550e8400-e29b-41d4-a716-446655440004', true, false, false, true, false);

-- Create availability schedules for each nanny
INSERT INTO public.nanny_availability (nanny_id, available_dates, schedule) VALUES
('550e8400-e29b-41d4-a716-446655440001', '["2024-01-01", "2024-01-02", "2024-01-03"]', '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}'),
('550e8400-e29b-41d4-a716-446655440002', '["2024-01-01", "2024-01-02", "2024-01-03"]', '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true, "sunday": false}'),
('550e8400-e29b-41d4-a716-446655440003', '["2024-01-01", "2024-01-02", "2024-01-03"]', '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}'),
('550e8400-e29b-41d4-a716-446655440004', '["2024-01-01", "2024-01-02", "2024-01-03"]', '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true, "sunday": true}');