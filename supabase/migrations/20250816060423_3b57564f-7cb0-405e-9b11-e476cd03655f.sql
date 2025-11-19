-- Clear existing FAQ articles and insert new ones
DELETE FROM public.faq_articles;

-- Insert updated FAQ articles
INSERT INTO public.faq_articles (question, answer, category, keywords, is_active, auto_response_enabled) VALUES
('How does nanny matching work?', 'We match you with nannies based on your preferences like location, experience, and availability. After submitting your request, you''ll get nanny profiles to review and choose from.', 'nanny_matching', ARRAY['matching', 'process', 'find', 'select', 'profiles'], true, true),

('What services do the nannies provide?', 'Our nannies offer childcare including feeding, playing, tutoring, light housekeeping related to your child, and bedtime routines. Services may vary by nanny.', 'services', ARRAY['services', 'tutoring', 'play', 'bedtime', 'housework', 'tasks'], true, true),

('How are nannies screened?', 'All nannies undergo background checks, reference verification, and skills assessments for safe and quality care.', 'safety', ARRAY['screened', 'background', 'verify', 'references', 'safe', 'checked'], true, true),

('What are placement fees?', 'Placement fees cover the cost of matching and administration. Exact fees depend on your location and needs and are provided during booking.', 'payments', ARRAY['placement', 'fees', 'cost', 'pay'], true, true),

('How do I pay for nanny services?', 'You can pay securely via the app using credit/debit cards or other payment methods. Payment can be hourly or monthly based on your arrangement.', 'payments', ARRAY['pay', 'payment', 'card', 'monthly', 'processed'], true, true),

('Can I cancel my nanny booking?', 'For short-term bookings: you can cancel or modify up to 24 hours before through the app. Late cancellations may incur fees. For long-term bookings: yes, you can cancel, but the placement fee is non-refundable.', 'bookings', ARRAY['cancel', 'change', 'modify', 'cancellation', 'policy'], true, true),

('Can I add other services for my nanny?', 'Yes, you can modify your active booking on your dashboard to add or remove services. Changes take effect immediately, and your monthly service fee is adjusted accordingly in the following month.', 'services', ARRAY['add', 'services', 'driving', 'change', 'duties', 'adjust'], true, true),

('What if I don''t like my nanny?', 'We offer a 90-day satisfaction guarantee. If you''re unhappy, contact us for a replacement nanny or a refund where applicable.', 'support', ARRAY['unsatisfied', 'unhappy', 'swap', 'refund', 'replacement'], true, true),

('How do I end nanny services?', 'You can terminate nanny services anytime via the app or support. Notice periods or fees may apply depending on your contract.', 'bookings', ARRAY['end', 'terminate', 'stop', 'cancel', 'contract'], true, true),

('How do I contact emergency support?', 'Use the "Emergency Hotlines" button in the app for urgent childcare emergencies.', 'emergency', ARRAY['emergency', 'hotline', 'urgent', 'support'], true, true),

('Do you have live chat?', 'Yes, you can chat with our support team anytime using the Live Chat feature in the app.', 'support', ARRAY['live', 'chat', 'agent', 'support'], true, true),

('How often are nanny profiles updated?', 'Profiles are updated regularly to show current availability, experience, and reviews.', 'profiles', ARRAY['updated', 'current', 'refresh', 'availability'], true, true),

('Can I book a nanny for special events?', 'Yes, you can book nannies for one-time events, part-time, or full-time engagements through the app.', 'bookings', ARRAY['special', 'events', 'parties', 'one-time'], true, true),

('What if there''s an issue during a nanny''s shift?', 'If there''s an issue during a nanny''s shift, contact our support team immediately via chat or the emergency hotline for quick help.', 'support', ARRAY['issue', 'shift', 'problem', 'report'], true, true),

('Can I leave instructions for the nanny?', 'Yes, there''s a section during booking to add notes or special requirements for the nanny.', 'bookings', ARRAY['instructions', 'notes', 'special', 'requirements'], true, true),

('Can I try a nanny before committing long-term?', 'Yes, you can book trial sessions to see if the nanny is a good fit before confirming a long-term placement.', 'bookings', ARRAY['trial', 'test', 'try'], true, true),

('Can I request a nanny who speaks a specific language?', 'Yes, you can filter nannies by languages spoken in your booking preferences.', 'preferences', ARRAY['language', 'foreign', 'filter', 'spoken'], true, true),

('Do your nannies have experience with special needs children?', 'Some nannies are trained to care for children with special needs. You can request this during booking and we''ll match you accordingly.', 'special_needs', ARRAY['special', 'needs', 'disabilities', 'trained'], true, true),

('Do you offer overnight nanny services?', 'Yes, many of our nannies are available for overnight care. This can be requested in your booking preferences.', 'services', ARRAY['overnight', 'night', 'care'], true, true),

('Can I see a nanny''s references?', 'Yes, verified references are included in nanny profiles for your review.', 'profiles', ARRAY['references', 'background', 'check'], true, true),

('Do you provide nannies in my city?', 'Yes, our service covers multiple regions. Enter your location in the app to see available nannies nearby.', 'coverage', ARRAY['city', 'area', 'regions', 'local', 'location'], true, true),

('What if my nanny resigns unexpectedly?', 'If a nanny resigns or is unavailable, we''ll provide a replacement quickly at no extra placement fee during your active contract.', 'replacement', ARRAY['resigns', 'replacement', 'substitute', 'unavailable'], true, true);