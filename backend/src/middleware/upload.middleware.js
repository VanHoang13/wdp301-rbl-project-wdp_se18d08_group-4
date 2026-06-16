const multer = require('multer');

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const MARKETPLACE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
function isImageMime(mimetype) {
  return typeof mimetype === 'string' && mimetype.toLowerCase().startsWith('image/');
}

function makeImageUpload(field, maxBytes, sizeMessage) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!isImageMime(file.mimetype)) {
        const err = new Error('Chỉ chấp nhận file ảnh.');
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

const providerDocFields = [
  { name: 'cccd_front', maxCount: 1 },
  { name: 'cccd_back', maxCount: 1 },
  { name: 'vehicle_registration', maxCount: 1 },
  { name: 'driver_license', maxCount: 1 },
  { name: 'vehicle_photo', maxCount: 1 },
];

const providerDocsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MARKETPLACE_IMAGE_MAX_BYTES, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!isImageMime(file.mimetype)) {
      const err = new Error('Chỉ chấp nhận file ảnh.');
      err.status = 400;
      err.code = 'invalid_file_type';
      return cb(err);
    }
    cb(null, true);
  },
}).fields(providerDocFields);

const handleProviderDocsUpload = wrapUpload(providerDocsUpload, 'Ảnh vượt quá 5MB.');

const deliveryPhotoUpload = makeImageUpload('photo', MARKETPLACE_IMAGE_MAX_BYTES, 'Ảnh vượt quá 5MB.');
const handleDeliveryPhotoUpload = wrapUpload(deliveryPhotoUpload, 'Ảnh vượt quá 5MB.');

module.exports = { handleAvatarUpload, handleMarketplaceImageUpload, handleProviderDocsUpload, handleDeliveryPhotoUpload };
