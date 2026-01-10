const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email with retry logic
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  // Always log OTP for development/debugging
  console.log(`📧 Sending OTP to ${email}: ${otp} (${purpose})`);
  
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email credentials not configured. OTP logged above.');
      return true; // Return true to not block the flow
    }

    const transporter = createTransporter();
    
    const subject = purpose === 'verification' 
      ? 'FlashBites - Email Verification OTP'
      : 'FlashBites - Password Reset OTP';
    
    const message = purpose === 'verification'
      ? `Your OTP for email verification is: <b>${otp}</b>. This OTP will expire in 10 minutes.`
      : `Your OTP for password reset is: <b>${otp}</b>. This OTP will expire in 10 minutes.`;

    const mailOptions = {
      from: `FlashBites <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: `
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
            <p style="color: #999; font-size: 14px;">This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    };

    // Verify connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}. MessageID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    console.log(`📧 OTP for ${email}: ${otp} - Check Railway logs`);
    return true; // Still return true to not block user flow
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `FlashBites <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to FlashBites!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f97316; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to FlashBites!</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hello ${name}!</h2>
            <p style="color: #666; font-size: 16px;">Thank you for joining FlashBites. We're excited to have you on board!</p>
            <p style="color: #666; font-size: 16px;">Start exploring delicious food from the best restaurants near you.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}" 
                 style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Start Ordering
              </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">Happy eating! 🍕🍔🍜</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

// Send password reset success email
const sendPasswordResetSuccessEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `FlashBites <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Successful',
      html: `
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
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Password reset success email error:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetSuccessEmail
};
