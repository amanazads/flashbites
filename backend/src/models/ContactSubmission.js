const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 30,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40000,
    },
    emailDelivery: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
      },
      attemptedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
