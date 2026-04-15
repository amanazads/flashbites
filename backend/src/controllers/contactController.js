const { sendContactEmail } = require('../utils/emailService');
const ContactSubmission = require('../models/ContactSubmission');

exports.submitContactForm = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required fields.'
      });
    }

    // Persist first so we never lose submissions when email providers are down.
    const submission = await ContactSubmission.create({
      name,
      email,
      phone,
      subject,
      message,
      emailDelivery: { status: 'pending' }
    });

    const emailSent = await sendContactEmail({ name, email, phone, subject, message });
    if (emailSent) {
      await ContactSubmission.findByIdAndUpdate(submission._id, {
        $set: {
          'emailDelivery.status': 'sent',
          'emailDelivery.attemptedAt': new Date(),
          'emailDelivery.error': null
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Contact form submitted successfully!',
        emailDelivered: true
      });
    }

    await ContactSubmission.findByIdAndUpdate(submission._id, {
      $set: {
        'emailDelivery.status': 'failed',
        'emailDelivery.attemptedAt': new Date(),
        'emailDelivery.error': 'Email delivery returned false from sendContactEmail'
      }
    });

    console.warn('Contact submission saved but email delivery failed', {
      submissionId: submission._id,
      email,
      subject,
    });

    return res.status(200).json({
      success: true,
      message: 'Contact form received. Email notification is temporarily unavailable, but your request was saved.',
      emailDelivered: false
    });

  } catch (error) {
    console.error('Submit contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting form'
    });
  }
};
