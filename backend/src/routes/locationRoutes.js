const express = require('express');
const router = express.Router();
const {
  autocomplete,
  geocode,
  reverse
} = require('../controllers/locationController');

router.get('/autocomplete', autocomplete);
router.get('/geocode', geocode);
router.get('/reverse', reverse);

module.exports = router;
