/**
 * SCAFFOLD — Team implement BE-008, BE-009, BE-010.
 */
const { httpError } = require('./auth.helpers');

/** BE-008 — GET /api/customers/me */
async function getProfile(_userId) {
  throw httpError(501, 'BE-008: implement getProfile() trong customers.service.js', 'not_implemented');
}

/** BE-009 — PATCH /api/customers/me */
async function updateProfile(_userId, _body) {
  throw httpError(501, 'BE-009: implement updateProfile() trong customers.service.js', 'not_implemented');
}

module.exports = { getProfile, updateProfile };
