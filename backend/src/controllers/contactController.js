const { sendContactEmail } = require('../utils/emailService');

exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required fields.'
      });
    }

    // Send email
    const emailSent = await sendContactEmail({ name, email, phone, subject, message });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send contact message. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact form submitted successfully!'
    });

  } catch (error) {
    console.error('Submit contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting form'
    });
  }
};
