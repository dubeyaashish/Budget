exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  };
  
  /**
   * Middleware to check if user belongs to specified department
   */
  exports.belongsToDepartment = (departmentIdParam) => {
    return async (req, res, next) => {
      try {
        const userId = req.user.id;
        const departmentId = req.params[departmentIdParam] || req.body[departmentIdParam];
  
        // This would need to query the budget_department_users table
        // Implementation depends on your database model
        // For now, we'll just check if user is admin or simply pass through
        if (req.user.role === 'admin') {
          return next();
        }
        
        // TODO: Implement actual department membership check
        // Example:
        // const userDepartment = await departmentUserModel.getUserDepartment(userId, departmentId);
        // if (!userDepartment) {
        //   return res.status(403).json({ message: 'Access denied. You do not belong to this department.' });
        // }
  
        next();
      } catch (error) {
        console.error('Error in departmentMiddleware:', error);
        res.status(500).json({ message: 'Server error checking department membership.' });
      }
    };
  };