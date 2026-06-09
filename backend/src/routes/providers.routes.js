const express = require('express');
const providersController = require('../controllers/providers.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { handleProviderDocsUpload } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/browse', providersController.browse);

router.post(
  '/me/documents',
  requireAuth,
  requireRole('provider'),
  handleProviderDocsUpload,
  providersController.uploadDocuments,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('customer'),
  providersController.getById,
);

module.exports = router;
