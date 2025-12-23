import { sendNannyGoldEmail } from './src/services/emailService';

// Test email functionality
async function testEmailFunctionality() {
  try {
    console.log('🧪 Testing email functionality...');

    // Test sending an email
    const result = await sendNannyGoldEmail({
      to: ['test@example.com'], // Replace with your actual email for testing
      from: 'care',
      subject: 'Test Email from NannyGold',
      html: '<p>This is a test email to verify the email functionality is working correctly.</p><p>If you receive this email, the system is working properly!</p>',
    });

    console.log('✅ Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Email test failed:', error);
    return false;
  }
}

// Run the test
testEmailFunctionality();