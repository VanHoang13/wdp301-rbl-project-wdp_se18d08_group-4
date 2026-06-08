const multer = require('multer');

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const MARKETPLACE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

function makeImageUpload(field, maxBytes, sizeMessage) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        const err = new Error('Chỉ chấp nhận ảnh JPG hoặc PNG.');
        err.status = 400;
        err.code = 'invalid_file_type';
        return cb(err);
      }
      cb(null, true);
    },
  }).single(field);
}

const avatarUpload = makeImageUpload('avatar', AVATAR_MAX_BYTES, 'Ảnh vượt quá 2MB.');
const marketplaceImageUpload = makeImageUpload('image', MARKETPLACE_IMAGE_MAX_BYTES, 'Ảnh vượt quá 5MB.');

function wrapUpload(upload, sizeMessage) {
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        err.status = 400;
        err.message = sizeMessage;
        err.code = 'file_too_large';
      }
      next(err);
    });
  };
}

const handleAvatarUpload = wrapUpload(avatarUpload, 'Ảnh vượt quá 2MB.');
const handleMarketplaceImageUpload = wrapUpload(marketplaceImageUpload, 'Ảnh vượt quá 5MB.');

module.exports = { handleAvatarUpload, handleMarketplaceImageUpload };
