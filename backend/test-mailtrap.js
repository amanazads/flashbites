require('dotenv').config();

const testEmail = process.argv[2] || 'vermarohit7839@gmail.com';
const testOTP = Math.floor(100000 + Math.random() * 900000).toString();

console.log('\n🧪 Testing Mailtrap API...');
console.log(`📧 Sending to: ${testEmail}`);
console.log(`🔢 Test OTP: ${testOTP}\n`);

const sendTestEmail = async () => {
  const response = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MAILTRAP_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: {
        email: process.env.MAILTRAP_FROM_EMAIL || 'hello@flashbites.shop',
        name: process.env.MAILTRAP_FROM_NAME || 'FlashBites'
      },
      to: [{ email: testEmail }],
      subject: 'FlashBites OTP Verification - Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f97316; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FlashBites</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Your Test OTP Code</h2>
            <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; border: 2px dashed #f97316;">
              <span style="font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 5px;">${testOTP}</span>
            </div>
            <p style="color: #666; font-size: 16px;">This is a test email from Mailtrap API.</p>
            <p style="color: #999; font-size: 14px;">If you received this, email service is working! 🎉</p>
          </div>
        </div>
      `,
      text: `Your FlashBites OTP is: ${testOTP}`,
      category: 'Integration Test'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailtrap API error: ${response.status} - ${error}`);
  }

  return await response.json();
};

sendTestEmail()
  .then((result) => {
    console.log('✅ Email sent successfully via Mailtrap API!');
    console.log('📬 Response:', JSON.stringify(result, null, 2));
    console.log(`🔢 OTP to verify: ${testOTP}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to send email:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  });
