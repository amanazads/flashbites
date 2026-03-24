const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const {
  updateProfile,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  saveFcmToken,
  submitAccountDeletionRequest,
  getMyDeletionRequest
} = require('../controllers/userController');
const {
  updateProfileValidator,
  addAddressValidator,
  updateAddressValidator,
  addressIdParamValidator,
  saveFcmTokenValidator,
  accountDeletionRequestValidator,
} = require('../validators/userValidators');

router.use(protect); // All routes require authentication

router.put('/profile', updateProfileValidator, validateRequest, updateProfile);
router.post('/addresses', addAddressValidator, validateRequest, addAddress);
router.get('/addresses', getAddresses);
router.put('/addresses/:id', updateAddressValidator, validateRequest, updateAddress);
router.delete('/addresses/:id', addressIdParamValidator, validateRequest, deleteAddress);
router.patch('/addresses/:id/default', addressIdParamValidator, validateRequest, setDefaultAddress);
router.post('/fcm-token', saveFcmTokenValidator, validateRequest, saveFcmToken);
router.post('/account-deletion-requests', accountDeletionRequestValidator, validateRequest, submitAccountDeletionRequest);
router.get('/account-deletion-requests', getMyDeletionRequest);
router.get('/account-deletion-requests/me', getMyDeletionRequest);

module.exports = router;