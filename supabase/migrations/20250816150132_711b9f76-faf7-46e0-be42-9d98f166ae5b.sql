-- Add comprehensive FAQ articles about booking modifications
INSERT INTO public.faq_articles (question, answer, category, keywords, is_active, auto_response_enabled) VALUES 
(
  'How do I modify my existing booking?',
  'You can modify your booking through your dashboard under "My Bookings". Click on the booking you want to change, then select "Request Modification". You can add or remove services, change schedules, or adjust other requirements. Most changes require admin approval and take 24-48 hours to process.',
  'bookings',
  ARRAY['modify', 'change', 'booking', 'dashboard', 'services', 'schedule', 'requirements'],
  true,
  true
),
(
  'What changes can I make to my booking?',
  'You can modify: 1) Additional services (cooking, driving, pet care, etc.), 2) Working hours and schedule, 3) Special requirements or instructions, 4) Number of children (with rate adjustment), 5) Duration of booking. Note: Major changes like location or nanny replacement may require a new booking.',
  'bookings',
  ARRAY['changes', 'modify', 'services', 'schedule', 'hours', 'children', 'location'],
  true,
  true
),
(
  'How long does it take to process booking modifications?',
  'Simple service additions are usually processed within 24 hours. Schedule changes and major modifications require both admin and nanny approval, taking 24-48 hours. Emergency modifications (same-day) may incur additional fees but can be processed within 2-4 hours during business hours.',
  'bookings',
  ARRAY['processing', 'time', 'approval', 'emergency', 'modifications', 'hours'],
  true,
  true
),
(
  'Are there fees for modifying my booking?',
  'Minor service additions have no modification fees - you just pay the adjusted rate. Schedule changes during the first 48 hours are free. Major modifications or emergency same-day changes may incur a R150 processing fee. Cancellations have separate fees depending on notice period.',
  'payments',
  ARRAY['fees', 'cost', 'modification', 'processing', 'cancellation', 'schedule'],
  true,
  true
),
(
  'Can I change my nanny after booking?',
  'Yes, but this requires a replacement request rather than a modification. Go to your booking and select "Request Replacement". Valid reasons include compatibility issues, performance concerns, or schedule conflicts. The first replacement is free; additional replacements may incur fees.',
  'replacement',
  ARRAY['change', 'nanny', 'replacement', 'compatibility', 'performance', 'schedule'],
  true,
  true
),
(
  'What if my nanny cannot accommodate my modification request?',
  'If your nanny cannot accommodate the changes (due to availability, skills, or preferences), we will: 1) Help negotiate alternative solutions, 2) Offer a suitable replacement nanny, 3) Provide options to adjust your requirements. You are not obligated to accept unsuitable arrangements.',
  'support',
  ARRAY['nanny', 'cannot', 'accommodate', 'alternative', 'replacement', 'negotiate'],
  true,
  true
);