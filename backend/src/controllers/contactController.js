const ContactSubmission = require('../models/ContactSubmission');
const { sendContactEmail } = require('../utils/emailService');

exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message, source } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required fields.'
      });
    }

    const submission = await ContactSubmission.create({
      name,
      email,
      phone,
      subject,
      message,
      source: source || 'contact-form',
      status: 'received',
      emailSent: false,
    });

    let emailSent = false;
    try {
      emailSent = await sendContactEmail({ name, email, phone, subject, message });
    } catch (emailError) {
      console.error('Contact email dispatch error:', emailError);
    }

    if (emailSent) {
      submission.emailSent = true;
      submission.status = 'emailed';
      await submission.save();
    }

    res.status(200).json({
      success: true,
      message: emailSent
        ? 'Contact form submitted successfully!'
        : 'Request received successfully. Our team will review it shortly.',
      data: {
        submissionId: submission._id,
        emailSent,
      }
    });

  } catch (error) {
    console.error('Submit contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting form'
    });
  }
};
