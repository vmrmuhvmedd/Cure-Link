const User = require('../models/user.model');

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

module.exports = (model) => async (req, res, next) => {
  try {
    let baseQuery = req.baseQuery || model.find();

    let filter = {};
    if (baseQuery && typeof baseQuery.getFilter === 'function') {
      filter = baseQuery.getFilter();
    } else if (!req.baseQuery) {
      baseQuery = model.find();
    }

    // Text search - فقط إذا كان موجود
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter = {
        ...filter,
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      };
      baseQuery = model.find(filter);
    } else if (Object.keys(filter).length > 0) {
      baseQuery = model.find(filter);
    }

    // Populate pharmacy data
    baseQuery = baseQuery.populate('pharmacyId', 'pharmacyName location');

    // Get user location for geolocation search (from query params or authenticated user)
    let userLat = null;
    let userLon = null;
    
    if (req.query.latitude && req.query.longitude) {
      userLat = parseFloat(req.query.latitude);
      userLon = parseFloat(req.query.longitude);
    } else if (req.user && req.user.location) {
      userLat = req.user.location.latitude;
      userLon = req.user.location.longitude;
    }

    // Execute query
    let data = await baseQuery.exec();

    // Calculate distances and sort by distance if user location is provided
    if (userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon)) {
      data = data.map(item => {
        let distance = null;
        if (item.pharmacyId && item.pharmacyId.location) {
          const pharmacyLat = item.pharmacyId.location.latitude;
          const pharmacyLon = item.pharmacyId.location.longitude;
          distance = calculateDistance(userLat, userLon, pharmacyLat, pharmacyLon);
        }
        return {
          ...item.toObject(),
          distance: distance ? parseFloat(distance.toFixed(2)) : null
        };
      });

      // Sort by distance (closest first)
      data.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    // Store search results in req.searchResults
    req.searchResults = data;
    req.baseQuery = model.find(Object.keys(filter).length > 0 ? filter : {});

    next();
  } catch (err) {
    console.error('Search Middleware Error:', err);
    next(err);
  }
};

