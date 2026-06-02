const express = require('express');
const multer = require('multer');
const customersController = require('../controllers/customers.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      const err = new Error('Chỉ chấp nhận file jpg/png');
      err.status = 400;
      err.code = 'invalid_file_type';
      return cb(err);
    }
    cb(null, true);
  },
});

router.get('/me', requireAuth, requireRole('customer'), customersController.getMe);
router.patch('/me', requireAuth, requireRole('customer'), customersController.patchMe);
router.post('/me/avatar', requireAuth, requireRole('customer'), upload.single('avatar'), customersController.uploadAvatar);

module.exports = router;
