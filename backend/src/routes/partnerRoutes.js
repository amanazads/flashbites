const express = require('express');
const router = express.Router();
const {
  submitApplication,
  getAllPartnerApplications,
  getPartnerById,
  approvePartner,
  rejectPartner,
  deletePartner,
  updatePartnerStatus,
} = require('../controllers/partnerController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');
const uploadPartnerDocs = require('../middleware/uploadPartnerDocs');

// Public route - Submit partner application
router.post(
  '/apply',
  uploadPartnerDocs.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'drivingLicense', maxCount: 1 },
    { name: 'aadharCard', maxCount: 1 },
  ]),
  submitApplication
);

// Admin routes - all require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getAllPartnerApplications);
router.get('/:id', getPartnerById);
router.put('/:id/approve', approvePartner);
router.put('/:id/reject', rejectPartner);
router.put('/:id/status', updatePartnerStatus);
router.delete('/:id', deletePartner);

module.exports = router;
