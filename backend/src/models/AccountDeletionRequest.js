const mongoose = require('mongoose');

const accountDeletionRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    default: null,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  details: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  adminNotes: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  expectedDeletionWindow: {
    type: String,
    default: '2-4 weeks'
  }
}, {
  timestamps: true
});

accountDeletionRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AccountDeletionRequest', accountDeletionRequestSchema);