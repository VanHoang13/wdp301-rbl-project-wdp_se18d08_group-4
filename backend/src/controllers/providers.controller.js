const providersService = require('../services/providers.service');

async function browse(req, res, next) {
  try {
    const providers = await providersService.browseProviders({
      city: req.query.city,
      minRating: req.query.min_rating ? parseFloat(req.query.min_rating) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    res.json({ success: true, data: providers });
  } catch (error) {
    next(error);
  }
}

module.exports = { browse };
