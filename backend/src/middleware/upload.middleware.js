const multer = require('multer');

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error('Chỉ chấp nhận ảnh JPG hoặc PNG (tối đa 2MB).');
      err.status = 400;
      err.code = 'invalid_file_type';
      return cb(err);
    }
    cb(null, true);
  },
}).single('avatar');

function handleAvatarUpload(req, res, next) {
  avatarUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.status = 400;
      err.message = 'Ảnh vượt quá 2MB.';
      err.code = 'file_too_large';
    }
    next(err);
  });
}

module.exports = { handleAvatarUpload };
