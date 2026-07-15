import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'jupiter_allen_pharma_secret_key_2026';

// User login endpoint
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  try {
    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    // Sign JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Session validation endpoint
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    phone: req.user.phone,
    role: req.user.role
  });
});

export default router;
