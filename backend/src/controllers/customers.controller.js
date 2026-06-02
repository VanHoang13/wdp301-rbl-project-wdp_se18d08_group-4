const customersService = require('../services/customers.service');
const { httpError } = require('../services/auth.helpers');

async function getMe(req, res, next) {
  try {
    const data = await customersService.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchMe(req, res, next) {
  try {
    const data = await customersService.updateProfile(req.user.id, req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return next(httpError(400, 'Không có file được upload', 'missing_file'));
    }
    const data = await customersService.uploadAvatar(
      req.user.id,
      req.file.buffer,
      req.file.mimetype,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMe, patchMe, uploadAvatar };
