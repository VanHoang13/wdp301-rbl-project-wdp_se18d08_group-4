const express = require('express');
const providersController = require('../controllers/providers.controller');

const router = express.Router();

router.get('/browse', providersController.browse);

module.exports = router;
