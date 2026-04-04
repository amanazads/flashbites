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
        email: process.env.MAILTRAP_FROM_EMAIL || 'hello@flashbites.in',
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
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.in>',
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
            <a href="https://flashbites.in" 
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
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.in>',
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
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.in>',
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

// Send order cancellation email with refund details
const sendOrderCancelledEmail = async ({
  email,
  name,
  orderRef,
  restaurantName,
  total,
  refundAmount,
  paymentMethod,
  cancellationReason
}) => {
  try {
    const isCod = paymentMethod === 'cod';
    const refundLine = isCod
      ? 'This was a Cash on Delivery order, so no refund is required.'
      : `Refund Amount: <b>₹${refundAmount.toFixed(2)}</b> (processed to your original payment method within 5-7 business days).`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Order Cancelled</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333;">Hi ${name || 'there'},</h2>
          <p style="color: #666; font-size: 16px;">Your order <b>#${orderRef}</b> from <b>${restaurantName || 'FlashBites'}</b> has been cancelled.</p>
          <div style="background-color: white; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #111827;"><b>Order Total:</b> ₹${total.toFixed(2)}</p>
            <p style="margin: 8px 0 0 0; color: #111827;"><b>Payment Method:</b> ${paymentMethod?.toUpperCase() || 'N/A'}</p>
            <p style="margin: 8px 0 0 0; color: #111827;">${refundLine}</p>
            ${cancellationReason ? `<p style="margin: 8px 0 0 0; color: #6b7280;"><b>Reason:</b> ${cancellationReason}</p>` : ''}
          </div>
          <p style="color: #999; font-size: 14px;">If you have any questions, reply to this email and we will help you.</p>
        </div>
      </div>
    `;

    const subject = `FlashBites - Order #${orderRef} Cancelled`;
    const textContent = `Your order #${orderRef} has been cancelled. ${isCod ? 'No refund is required for COD orders.' : `Refund Amount: ₹${refundAmount.toFixed(2)} (5-7 business days).`}`;

    if (process.env.MAILTRAP_API_TOKEN) {
      await sendMailtrapAPI(email, subject, htmlContent, textContent);
      return true;
    }

    if (!transporter) {
      console.warn('⚠️ Email service not configured, skipping cancellation email');
      return true;
    }

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.in>',
      to: email,
      subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Order cancellation email error:', error.message);
    return false;
  }
};

// Send contact form email
const sendContactEmail = async ({ name, email, phone, subject, message }) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; margin-bottom: 20px; border-bottom: 2px solid #E23744; padding-bottom: 10px;">New Contact Submission</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px;">
          <p style="margin: 0 0 10px 0;"><strong style="color: #374151;">Name:</strong> <span style="color: #111827;">${name}</span></p>
          <p style="margin: 0 0 10px 0;"><strong style="color: #374151;">Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
          <p style="margin: 0 0 10px 0;"><strong style="color: #374151;">Phone:</strong> <span style="color: #111827;">${phone || 'Not provided'}</span></p>
          <p style="margin: 0 0 10px 0;"><strong style="color: #374151;">Subject:</strong> <strong style="color: #E23744;">${subject}</strong></p>
        </div>
        <div style="margin-top: 20px;">
          <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px;">Message:</h3>
          <p style="background-color: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    `;

    const adminEmail = 'info.flashbites@gmail.com';
    const emailSubject = `[FlashBites Contact] ${subject} from ${name}`;
    const textMessage = `New Contact Form Submission from ${name} (${email}). Subject: ${subject}. Message: ${message}`;

    // Try Mailtrap API first
    if (process.env.MAILTRAP_API_TOKEN) {
      await sendMailtrapAPI(adminEmail, emailSubject, htmlContent, textMessage);
      console.log(`✅ Contact email sent successfully to ${adminEmail}`);
      return true;
    }

    // Fallback to SMTP
    if (!transporter) {
      console.warn('⚠️ Email service not configured. Could not send contact email.');
      return false;
    }

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL || 'FlashBites <noreply@flashbites.in>',
      to: adminEmail,
      replyTo: email,
      subject: emailSubject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Contact email sent via SMTP to ${adminEmail}`);
    return true;
  } catch (error) {
    console.error('Contact email error:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetSuccessEmail,
  sendContactEmail,
  sendOrderCancelledEmail
};
