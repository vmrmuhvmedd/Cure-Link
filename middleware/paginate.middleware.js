module.exports = (model) => async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const sortBy = req.query.sort || 'createdAt';
  const order = req.query.order === 'desc' ? -1 : 1;
  const sortObj = { [sortBy]: order };

  try {
    // If search was already applied, use searchResults
    let data;
    let total;

    if (req.searchResults && Array.isArray(req.searchResults)) {
      // Pagination on already filtered/searched results
      const totalItems = req.searchResults.length;
      const startIndex = skip;
      const endIndex = skip + limit;
      data = req.searchResults.slice(startIndex, endIndex);
      total = totalItems;
    } else {
      // Normal pagination without search
      let baseQuery = req.baseQuery || model.find();
      
      // Populate pharmacy if needed
      baseQuery = baseQuery.populate('pharmacyId', 'pharmacyName location');

      const filter = baseQuery.getFilter ? baseQuery.getFilter() : {};
      
      [data, total] = await Promise.all([
        baseQuery.clone().skip(skip).limit(limit).sort(sortObj).exec(),
        model.countDocuments(filter)
      ]);
    }

    const totalPages = Math.ceil(total / limit);

    req.pagination = {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    next();
  } catch (err) {
    console.error('Pagination Middleware Error:', err);
    next(err);
  }
};