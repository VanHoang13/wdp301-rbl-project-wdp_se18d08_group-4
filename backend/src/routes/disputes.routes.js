const express = require('express');
const multer = require('multer');
const disputesController = require('../controllers/disputes.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      const err = new Error('Chỉ chấp nhận file ảnh.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).array('evidence', 5);

function handleEvidenceUpload(req, res, next) {
  evidenceUpload(req, res, (err) => {
    if (err) { err.status = err.status || 400; return next(err); }
    next();
  });
}

router.post('/', requireAuth, handleEvidenceUpload, disputesController.createDispute);
router.get('/my', requireAuth, disputesController.getMyDisputes);
router.get('/:id', requireAuth, disputesController.getDispute);

module.exports = router;
