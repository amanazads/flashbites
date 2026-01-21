const nodemailer = require('nodemailer');

// Send email via Mailtrap API
const sendMailtrapAPI = async (to, subject, html, text = '') => {
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
      to: [{ email: to }],
      subject: subject,
      html: html,
      text: text,
      category: 'Application Email'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailtrap API error: ${response.status} - ${error}`);
  }

  return await response.json();
};

// Create transporter with Mailtrap SMTP (fallback)
const createTransporter = () => {
  if (!process.env.MAILTRAP_HOST || !process.env.MAILTRAP_PORT || !process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
    console.warn('⚠️ Mailtrap SMTP credentials not configured, using API');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS
    }
  });

  console.log('✅ Mailtrap email service initialized');
  return transporter;
};

const transporter = createTransporter();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email using Mailtrap API or SMTP
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  // Always log OTP for development/debugging
  console.log(`📧 Sending OTP to ${email}: ${otp} (${purpose})`);
  
  try {
    const subject = purpose === 'verification' 
      ? 'FlashBites - Email Verification OTP'
      : 'FlashBites - Password Reset OTP';
    
    const message = purpose === 'verification'
      ? `Your OTP for email verification is: <b>${otp}</b>. This OTP will expire in 10 minutes.`
      : `Your OTP for password reset is: <b>${otp}</b>. This OTP will expire in 10 minutes.`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f97316; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">FlashBites</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333;">OTP Verification</h2>
          <p style="color: #666; font-size: 16px;">${message}</p>
          <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; border: 2px dashed #f97316;">
            <span style="font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 5px;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      </div>
    `;

    // Try Mailtrap API first
    if (process.env.MAILTRAP_API_TOKEN) {
      await sendMailtrapAPI(email, subject, htmlContent, message);
      console.log(`✅ OTP email sent successfully via Mailtrap API to ${email}`);
      return true;
    }

    // Fallback to SMTP if API not configured
    if (!transporter) {
      console.warn('⚠️ Email service not configured. OTP logged above.');
      return true;
    }

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.shop>',
      to: email,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully via SMTP to ${email}`);
    return true;
    
  } catch (error) {
    console.error('❌ Email error:', error.message);
    console.log(`📧 OTP for ${email}: ${otp} - Check console logs`);
    return true; // Still return true to not block user flow
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f97316; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to FlashBites!</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333;">Hello ${name}!</h2>
          <p style="color: #666; font-size: 16px;">Thank you for joining FlashBites. We're excited to have you on board!</p>
          <p style="color: #666; font-size: 16px;">Start exploring delicious food from the best restaurants near you.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://flashbites.shop" 
               style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Ordering
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">Happy eating! 🍕🍔🍜</p>
        </div>
      </div>
    `;

    // Try Mailtrap API first
    if (process.env.MAILTRAP_API_TOKEN) {
      await sendMailtrapAPI(email, 'Welcome to FlashBites!', htmlContent, `Hello ${name}! Welcome to FlashBites.`);
      console.log(`✅ Welcome email sent to ${email}`);
      return true;
    }

    // Fallback to SMTP
    if (!transporter) {
      console.warn('⚠️ Email service not configured, skipping welcome email');
      return true;
    }

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.shop>',
      to: email,
      subject: 'Welcome to FlashBites!',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

// Send password reset success email
const sendPasswordResetSuccessEmail = async (email, name) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Password Reset Successful</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333;">Hello ${name}!</h2>
          <p style="color: #666; font-size: 16px;">Your password has been successfully reset.</p>
          <p style="color: #666; font-size: 16px;">You can now log in with your new password.</p>
          <p style="color: #dc2626; font-size: 14px; margin-top: 20px;">If you didn't make this change, please contact our support team immediately.</p>
        </div>
      </div>
    `;

    // Try Mailtrap API first
    if (process.env.MAILTRAP_API_TOKEN) {
      await sendMailtrapAPI(email, 'Password Reset Successful', htmlContent, `Hello ${name}! Your password has been successfully reset.`);
      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    }

    // Fallback to SMTP
    if (!transporter) {
      console.warn('⚠️ Email service not configured, skipping password reset email');
      return true;
    }

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.shop>',
      to: email,
      subject: 'Password Reset Successful',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Password reset success email error:', error);
    return false;
  }
};

// Generic send email function for custom messages
const sendEmail = async (to, subject, html, text = '') => {
  console.log(`📧 Sending email to ${to}: ${subject}`);
  
  try {
    // Try Mailtrap API first
    if (process.env.MAILTRAP_API_TOKEN) {
      await sendMailtrapAPI(to, subject, html, text);
      console.log(`✅ Email sent successfully via Mailtrap API to ${to}`);
      return true;
    }

    // Fallback to SMTP
    if (!transporter) {
      console.warn('⚠️ Email service not configured. Email content logged.');
      console.log(`Subject: ${subject}`);
      console.log(`HTML: ${html.substring(0, 200)}...`);
      return true; // Still return true to not block user flow
    }

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.shop>',
      to: to,
      subject: subject,
      html: html,
      text: text
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully via SMTP to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    console.log(`📧 Email for ${to} (${subject}) - Check console logs`);
    return true; // Still return true to not block user flow
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetSuccessEmail,
  sendEmail
};
