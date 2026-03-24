const express = require('express');
const router = express.Router();
const {
  autocomplete,
  reverse
} = require('../controllers/locationController');

router.get('/autocomplete', autocomplete);
router.get('/reverse', reverse);

module.exports = router;
