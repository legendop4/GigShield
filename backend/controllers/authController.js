const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @desc   Register a new user
 * @route  POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;

    // Validate input
    if (!name || !phone || !email) {
      const err = new Error('Please provide name, phone, and email');
      err.statusCode = 400;
      throw err;
    }

    // Check phone uniqueness
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      const err = new Error('User with this phone number already exists');
      err.statusCode = 409;
      throw err;
    }

    // Check email uniqueness
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      const err = new Error('User with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    // Create user
    const user = await User.create({
      name,
      phone,
      email,
    });

    if (user) {
      res.status(201).json({
        success: true,
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      const err = new Error('Invalid user data');
      err.statusCode = 400;
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Login user
 * @route  POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      const err = new Error('Please provide a phone number');
      err.statusCode = 400;
      throw err;
    }

    // Find user by phone
    const user = await User.findOne({ phone });

    if (user) {
      res.json({
        success: true,
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }
  } catch (err) {
    next(err);
  }
};
