const express = require('express');
const router = express.Router();

const {
  getNotifications, markAsRead, deleteNotification, clearNotifications, getFeatureReleases
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');
const { isCareerPathEnabled } = require('../middleware/featureGate');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

/*
 * This router sits ahead of the Career Path lock (see ../index.js), because
 * the rewards module's notices live in the same collection. Rather than the
 * lock's 403, a student who cannot open Career Path is answered with only the
 * notices that are not Career Path's: `req.careerOpen` is false and the
 * controller scopes every read and write to type 'reward'.
 */
const careerAccess = async (req, res, next) => {
  try {
    req.careerOpen = (await isCareerPathEnabled())
      // The demo cards see every section (services/fullAccess.js).
      || (await require('../../services/fullAccess').fullAccessFromRequest(req));
    next();
  } catch (error) {
    next(error);
  }
};

router.route('/')
  .get(protect, careerAccess, getNotifications)
  .delete(protect, careerAccess, clearNotifications);
// Declared ahead of '/:id' so "features" is never read as an id.
router.get('/features', protect, careerAccess, getFeatureReleases);
router.route('/:id/read')
  .put(protect, careerAccess, markAsRead);
router.route('/:id')
  .delete(protect, careerAccess, deleteNotification);

module.exports = router;
