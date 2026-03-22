const express = require('express');
const router = express.Router();
const { getPlatformSettings } = require('../controllers/settingsController');

router.get('/', getPlatformSettings);

module.exports = router;
