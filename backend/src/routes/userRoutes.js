const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  updateProfile,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  saveFcmToken
} = require('../controllers/userController');

router.use(protect); // All routes require authentication

router.put('/profile', updateProfile);
router.post('/addresses', addAddress);
router.get('/addresses', getAddresses);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.patch('/addresses/:id/default', setDefaultAddress);
router.post('/fcm-token', saveFcmToken);

module.exports = router;