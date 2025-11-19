-- Add comprehensive FAQ articles for all platform services and features

-- Professional Development & Training FAQs
INSERT INTO faq_articles (question, answer, category, keywords, is_active, auto_response_enabled) VALUES
('What is professional development for nannies?', 'Professional development is ongoing training that helps nannies stay current with best practices in childcare. Our nannies complete mandatory training modules on topics like child safety, development stages, emergency procedures, and specialized care techniques. This ensures they provide the highest quality care for your family.', 'professional_development', ARRAY['training', 'development', 'education', 'courses', 'mandatory'], true, true),

('How often do nannies need to complete training?', 'Nannies must complete assigned professional development modules within 7 days of assignment. We regularly assign new training materials to ensure all nannies stay up-to-date with industry standards. Failure to complete mandatory training within the timeframe may result in temporary suspension from receiving new bookings.', 'professional_development', ARRAY['training', 'frequency', 'mandatory', 'timeline', 'suspension'], true, true),

('What happens if a nanny doesn''t complete their training?', 'If a nanny doesn''t complete mandatory training within 7 days, they are temporarily suspended from receiving new bookings until the training is completed. This policy ensures all our nannies maintain current qualifications and provide safe, quality care.', 'professional_development', ARRAY['training', 'suspension', 'non-compliance', 'mandatory'], true, true),

-- Additional Services FAQs
('What additional services do nannies provide?', 'Our nannies can provide various additional services including: cooking and meal preparation (R1,800/month), driving support and transportation (R1,800/month), diverse ability support for special needs children (R2,000/month), light housekeeping, pet care, homework help, and educational activities. Each service has specific rates and must be added during booking.', 'services', ARRAY['additional', 'services', 'cooking', 'driving', 'special needs', 'housekeeping', 'rates'], true, true),

('Can nannies cook meals for my family?', 'Yes! Many of our nannies offer cooking and meal preparation services. This includes preparing healthy meals for children, basic family meals, and snacks. The cooking service costs an additional R1,800 per month for long-term bookings or R15/hour for short-term bookings. You can add this service during booking or request it as a modification.', 'services', ARRAY['cooking', 'meals', 'food prep', 'kitchen', 'additional service'], true, true),

('Do nannies provide driving services?', 'Yes, many nannies can provide driving support including school pickups/drop-offs, activity transportation, and errands. This service requires the nanny to have a valid driver''s license and costs an additional R1,800/month for long-term bookings or R25/hour for short-term bookings. The service must be requested during booking.', 'services', ARRAY['driving', 'transportation', 'school pickup', 'license', 'car'], true, true),

('Can nannies care for children with special needs?', 'Absolutely! We have specially trained nannies who provide diverse ability support for children with special needs. These nannies have additional training in specialized care techniques, therapy support, and adaptive activities. This specialized service costs an additional R2,000/month due to the specialized skills required.', 'services', ARRAY['special needs', 'diverse ability', 'disabilities', 'specialized care', 'therapy'], true, true),

('Do nannies help with light housekeeping?', 'Yes, nannies can assist with light housekeeping tasks related to childcare such as children''s laundry, tidying play areas, cleaning up after meals and activities, and organizing children''s belongings. This is typically included in basic childcare. Extensive housekeeping may incur additional charges.', 'services', ARRAY['housekeeping', 'cleaning', 'laundry', 'tidying', 'organization'], true, true),

('Can nannies help with homework and educational activities?', 'Yes! Our nannies are equipped to help with homework supervision, educational play, reading activities, and age-appropriate learning games. Many have early childhood development (ECD) training which enhances their ability to support your child''s educational growth and development.', 'services', ARRAY['homework', 'education', 'learning', 'activities', 'development', 'ecd'], true, true),

-- Verification & Safety FAQs
('How are nannies verified and screened?', 'All nannies undergo a comprehensive verification process including: document verification (ID, qualifications, references), background checks, in-person interviews with our team, skills assessment, and ongoing professional development. Only nannies who pass all verification steps can receive bookings through our platform.', 'verification', ARRAY['screening', 'background check', 'verification', 'safety', 'documents'], true, true),

('What documents do nannies need to provide?', 'Nannies must provide: valid South African ID, proof of qualifications or certifications, recent police clearance certificate, professional references from previous employers, first aid certification (if available), and proof of address. All documents are verified by our admin team before approval.', 'verification', ARRAY['documents', 'requirements', 'id', 'qualifications', 'police clearance'], true, true),

('How long does nanny verification take?', 'The verification process typically takes 3-7 business days once all documents are submitted. This includes document review, reference checks, and scheduling an interview. We may request additional information or documentation during the process, which could extend the timeline.', 'verification', ARRAY['timeline', 'process', 'duration', 'approval'], true, true),

-- Live-in vs Live-out FAQs
('What''s the difference between live-in and live-out nannies?', 'Live-in nannies stay in your home and are available for extended hours, typically Monday-Friday with some weekend availability. Live-out nannies work set hours and return to their own homes daily. Live-in arrangements cost less per month (R4,000-R10,000) while live-out costs more (R4,800-R11,000) but offers more family privacy.', 'arrangements', ARRAY['live-in', 'live-out', 'accommodation', 'hours', 'cost'], true, true),

('What do I need to provide for a live-in nanny?', 'For live-in nannies, you need to provide: private bedroom with basic furnishings, access to bathroom facilities, meals or kitchen access, basic utilities (water, electricity), and a safe, comfortable living environment. The exact arrangements should be discussed and agreed upon before the nanny starts.', 'arrangements', ARRAY['live-in', 'accommodation', 'bedroom', 'meals', 'utilities'], true, true),

('Can I switch from live-in to live-out arrangement?', 'Yes, you can request to modify your living arrangement through the booking modification process. This change requires approval from both admin and the nanny, as it affects working hours, rates, and logistics. Rate adjustments will apply, and the change typically takes 24-48 hours to process.', 'arrangements', ARRAY['change', 'modify', 'live-in', 'live-out', 'switch'], true, true),

-- Emergency Services FAQs
('Do you provide emergency nanny services?', 'Yes! We offer emergency nanny services for urgent childcare needs. Emergency bookings have a higher rate (R80/hour, minimum 5 hours) and we aim to find available nannies within 2-4 hours during business hours. Use the emergency booking option in the app or contact our emergency hotline.', 'emergency', ARRAY['emergency', 'urgent', 'last minute', 'hotline', 'rates'], true, true),

('How quickly can you find an emergency nanny?', 'For emergency requests, we typically find and confirm a nanny within 2-4 hours during business hours (8 AM - 6 PM). Outside business hours, it may take longer. We recommend calling our emergency hotline for the fastest response to urgent childcare needs.', 'emergency', ARRAY['emergency', 'timing', 'fast', 'urgent', 'hours'], true, true),

-- Rates & Pricing FAQs
('How are nanny rates calculated?', 'Rates depend on several factors: booking type (short-term vs long-term), home size, living arrangement (live-in vs live-out), additional services, and booking duration. Short-term rates are hourly (R40-R120/hour), long-term rates are monthly (R4,000-R11,000), plus additional service fees and placement fees for long-term bookings.', 'pricing', ARRAY['rates', 'calculation', 'factors', 'pricing', 'cost'], true, true),

('What are placement fees and why do I pay them?', 'Placement fees (R2,500 for long-term bookings) cover the comprehensive matching process, nanny verification, background checks, interview coordination, and ongoing support. This one-time fee ensures you''re matched with a verified, suitable nanny and includes our satisfaction guarantee.', 'pricing', ARRAY['placement fee', 'matching', 'verification', 'cost'], true, true),

('Do rates differ for weekends?', 'Yes, weekend rates apply for bookings on Friday, Saturday, and Sunday. Weekend rates are R55/hour (vs R40/hour weekdays) for hourly bookings, and R350/day (vs R280/day weekdays) for gap coverage. Date night bookings (evenings) have a standard rate of R120/hour regardless of the day.', 'pricing', ARRAY['weekend', 'rates', 'friday', 'saturday', 'sunday', 'higher'], true, true),

-- Specialized Training FAQs
('Do nannies have early childhood development (ECD) training?', 'Many of our nannies have formal ECD training or equivalent experience. ECD-trained nannies understand child development stages, age-appropriate activities, and educational play. This specialized training adds R500/month to long-term bookings but significantly enhances your child''s developmental experience.', 'training', ARRAY['ecd', 'early childhood', 'development', 'education', 'training'], true, true),

('Are there nannies with Montessori training?', 'Yes! We have nannies with Montessori training who can provide specialized educational activities following Montessori principles. This includes hands-on learning, independence-building activities, and structured educational play. Montessori-trained nannies add R450/month to your booking cost.', 'training', ARRAY['montessori', 'education', 'training', 'activities', 'learning'], true, true),

-- Communication & Support FAQs
('How do I communicate with my nanny?', 'You can communicate with your nanny through our in-app chat system, which provides a secure, documented communication channel. For urgent matters during working hours, direct communication is also acceptable. All booking-related communications should go through the app for record-keeping.', 'communication', ARRAY['chat', 'messaging', 'contact', 'app', 'nanny'], true, true),

('What if I have issues with my nanny?', 'If you have concerns about your nanny, first try addressing minor issues directly. For serious concerns, contact our Admin Angel team immediately through the app or emergency hotline. We offer nanny replacement services and will work to resolve any issues quickly to ensure your family''s satisfaction.', 'support', ARRAY['issues', 'problems', 'complaints', 'admin angel', 'replacement'], true, true),

('How do I contact Admin Angel support?', 'You can reach our Admin Angel team through: the live chat feature in the app, the support center, by typing "admin angel" in any chat, calling our emergency hotline for urgent matters, or emailing care@nannygold.co.za. Our team is available during business hours and for emergencies.', 'support', ARRAY['admin angel', 'support', 'contact', 'chat', 'hotline', 'email'], true, true),

-- Interview Process FAQs
('Do I need to interview nannies before booking?', 'For long-term bookings, we highly recommend scheduling interviews with shortlisted nannies. This helps ensure compatibility and allows you to ask specific questions about experience and approach. You can schedule interviews through the app, and we can facilitate video or in-person meetings.', 'interviews', ARRAY['interview', 'meeting', 'long-term', 'compatibility', 'questions'], true, true),

('Can I interview multiple nannies?', 'Yes! You can interview multiple nannies before making your final selection. This helps you find the best fit for your family. We recommend interviewing 2-3 candidates to make an informed decision while respecting everyone''s time.', 'interviews', ARRAY['multiple', 'interview', 'selection', 'choice', 'candidates'], true, true),

-- Backup & Replacement FAQs
('What happens if my nanny gets sick?', 'If your regular nanny is unavailable due to illness, we can arrange backup nanny services. You''ll be notified and given the option to accept a replacement nanny or reschedule. Our backup service ensures minimal disruption to your childcare needs.', 'backup', ARRAY['sick', 'illness', 'backup', 'replacement', 'unavailable'], true, true),

('Can I get a permanent replacement nanny?', 'Yes, if you''re not satisfied with your current nanny or if they become permanently unavailable, we can arrange a replacement. The first replacement is included in your placement fee. We''ll work to find a nanny that better matches your needs and preferences.', 'replacement', ARRAY['permanent', 'replacement', 'unsatisfied', 'new nanny', 'change'], true, true);