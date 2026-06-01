const adminService = require('../services/admin.service');

async function getCount(req, res, next) {
  try {
    const { table } = req.query;
    const count = await adminService.getTableCount(table);
    res.json({ success: true, data: { table, count } });
  } catch (err) {
    next(err);
  }
}

async function getOpenDisputes(req, res, next) {
  try {
    const rows = await adminService.getOpenDisputes();
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function getPendingProviders(req, res, next) {
  try {
    const rows = await adminService.getPendingProviders();
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCount,
  getOpenDisputes,
  getPendingProviders,
};
