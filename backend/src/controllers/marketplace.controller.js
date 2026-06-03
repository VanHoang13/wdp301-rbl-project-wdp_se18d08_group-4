const marketplaceService = require('../services/marketplace.service');

/** API-062 — POST /api/marketplace/listings */
async function createListing(req, res, next) {
  try {
    const data = await marketplaceService.createListing(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/** API-059 — GET /api/marketplace/listings */
async function browseListings(req, res, next) {
  try {
    const data = await marketplaceService.browseListings(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

/** API-060 — GET /api/marketplace/my-listings */
async function getMyListings(req, res, next) {
  try {
    const data = await marketplaceService.getMyListings(req.user.id, req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

module.exports = { createListing, browseListings, getMyListings };
