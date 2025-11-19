-- Insert comprehensive FAQ articles for the nanny app chatbot
INSERT INTO public.faq_articles (question, answer, category, keywords, is_active, auto_response_enabled, view_count) VALUES
('How does the nanny matching process work?', 'We match you with nannies based on your preferences like location, experience, and availability. After submitting your request, you''ll get nanny profiles to review and choose from.', 'Matching Process', ARRAY['matching', 'process', 'nanny', 'profiles', 'preferences', 'location', 'experience', 'availability'], true, true, 0),

('What services do your nannies provide?', 'Our nannies offer childcare including feeding, playing, tutoring, light housekeeping related to your child, and bedtime routines. Services may vary by nanny.', 'Services', ARRAY['services', 'childcare', 'feeding', 'playing', 'tutoring', 'housekeeping', 'bedtime', 'routines'], true, true, 0),

('How are nannies vetted?', 'All nannies undergo background checks, reference verification, and skills assessments for safe and quality care.', 'Safety & Vetting', ARRAY['vetting', 'background', 'checks', 'verification', 'references', 'safety', 'screening', 'assessment'], true, true, 0),

('What are placement fees?', 'Placement fees cover the cost of matching and administration. Exact fees depend on your profile and are provided during booking. The minimum however, is R2 500.', 'Pricing', ARRAY['placement', 'fees', 'cost', 'matching', 'administration', 'minimum', 'R2500', 'pricing'], true, true, 0),

('How do I pay for nanny services?', 'You can pay securely via the app using credit/debit cards or other payment methods. Payment can be hourly or monthly based on your arrangement.', 'Payment', ARRAY['payment', 'pay', 'credit', 'debit', 'cards', 'methods', 'hourly', 'monthly', 'secure'], true, true, 0),

('Can I change or cancel a booking?', 'Yes, for short term bookings, you can modify or cancel bookings up to 24 hours before through the app. Late cancellations may incur fees as per your agreement.', 'Booking Management', ARRAY['cancel', 'change', 'modify', 'booking', '24 hours', 'fees', 'cancellation', 'late'], true, true, 0),

('What if I am not satisfied with my nanny?', 'We offer a 90-day satisfaction guarantee. If unhappy, contact us for a replacement or refund if applicable.', 'Satisfaction', ARRAY['satisfaction', 'guarantee', '90-day', 'unhappy', 'replacement', 'refund', 'not satisfied'], true, true, 0),

('Can I swap out my nanny?', 'Yes, contact us if you want a new nanny within your satisfaction period. We''ll help without extra placement fees.', 'Satisfaction', ARRAY['swap', 'change', 'new nanny', 'satisfaction period', 'replacement', 'no extra fees'], true, true, 0),

('What happens if I want to terminate the long term service?', 'You can terminate anytime via the app or support. Notice periods or fees may apply as per your contract.', 'Termination', ARRAY['terminate', 'end', 'long term', 'service', 'contract', 'notice', 'period', 'fees'], true, true, 0),

('How do I contact emergency support?', 'Use the "Emergency Hotlines" button in the app for urgent childcare emergencies.', 'Emergency Support', ARRAY['emergency', 'support', 'hotline', 'urgent', 'childcare', 'contact'], true, true, 0),

('Is live chat support available?', 'Yes, chat with our support team anytime using the Live Chat feature in the app. If our AI cannot resolve your issue, you will be connected with a human support agent.', 'Support', ARRAY['live chat', 'support', 'team', 'AI', 'human', 'agent', 'available'], true, true, 0),

('How often are nanny profiles updated?', 'Profiles are updated regularly to show current availability, experience, and reviews.', 'Profiles', ARRAY['profiles', 'updated', 'regularly', 'availability', 'experience', 'reviews', 'current'], true, true, 0),

('Can I book a nanny for special occasions?', 'Yes, book nannies for one-time events, part-time, or full-time engagements through the app.', 'Booking Types', ARRAY['special occasions', 'events', 'one-time', 'part-time', 'full-time', 'engagements', 'book'], true, true, 0),

('Are the nannies insured?', 'Yes, all nannies have required insurance to ensure your child''s safety.', 'Insurance', ARRAY['insurance', 'insured', 'safety', 'required', 'child safety'], true, true, 0),

('What if there is an issue during a nanny''s shift?', 'Contact our support team immediately via chat or emergency hotline for quick help.', 'Issues & Support', ARRAY['issue', 'shift', 'during', 'problem', 'support', 'chat', 'emergency', 'help'], true, true, 0),

('Can I provide special instructions to the nanny?', 'Yes, there''s a section during booking to add notes or requirements for the nanny.', 'Instructions', ARRAY['special instructions', 'notes', 'requirements', 'booking', 'section', 'instructions'], true, true, 0);