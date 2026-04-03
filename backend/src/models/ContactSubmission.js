const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      default: 'contact-form',
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'emailed'],
      default: 'pending',
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
