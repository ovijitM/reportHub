import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Market from '../models/Market.js';
import StaffMonthlyConfig from '../models/StaffMonthlyConfig.js';
import DailyWorksEntry from '../models/DailyWorksEntry.js';
import DailyOrderEntry from '../models/DailyOrderEntry.js';
import FieldVisitEntry from '../models/FieldVisitEntry.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getCache, setCache, delCache, delCachePattern } from '../services/cache.js';

const router = express.Router();

// Secure all routes here with authentication
router.use(authenticateToken);

// Middleware for manager/admin restricted endpoints
const requireManagerOrAdmin = requireRole(['manager', 'admin']);

// 1. GET all agents (staff role)
router.get('/agents', requireManagerOrAdmin, async (req, res) => {
  try {
    const cacheKey = 'agents:all';
    const cachedAgents = await getCache(cacheKey);
    if (cachedAgents) {
      return res.json(cachedAgents);
    }

    const agents = await User.find({ role: 'staff' }).sort({ name: 1 });
    await setCache(cacheKey, agents, 3600);
    res.json(agents);
  } catch (error) {
    console.error('Fetch agents error:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// 2. POST create a new agent
router.post('/agents', requireManagerOrAdmin, async (req, res) => {
  const { name, phone, password, role } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone, and password are required' });
  }

  try {
    const existingUser = await User.findOne({ phone: phone.trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      phone: phone.trim(),
      passwordHash,
      role: role || 'staff'
    });

    await newUser.save();
    await delCache('agents:all');
    await delCachePattern('overview:*');
    res.status(201).json({
      id: newUser._id,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role,
      isActive: newUser.isActive
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// 3. PUT update an agent profile
router.put('/agents/:id', requireManagerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, isActive, password } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) {
      const existingUser = await User.findOne({ phone: phone.trim(), _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }
      user.phone = phone.trim();
    }
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();
    await delCache('agents:all');
    await delCachePattern('overview:*');
    res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// 3a. DELETE an agent account and cascade delete their related records
router.delete('/agents/:id', requireManagerOrAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'staff') {
      return res.status(400).json({ error: 'Only MPO agent accounts can be deleted' });
    }

    // Cascade delete related documents
    await DailyWorksEntry.deleteMany({ staffId: id });
    await DailyOrderEntry.deleteMany({ staffId: id });
    await FieldVisitEntry.deleteMany({ staffId: id });
    await StaffMonthlyConfig.deleteMany({ staffId: id });

    // Finally delete the user
    await User.findByIdAndDelete(id);

    // Clear caches
    await delCache('agents:all');
    await delCachePattern('overview:*');

    res.json({ message: 'Agent account and all related data deleted successfully' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ error: 'Failed to delete agent account' });
  }
});

// 4. GET or PUT Staff Monthly Config
router.get('/staff-monthly-config/:staffId/:month/:year', async (req, res) => {
  const { staffId, month, year } = req.params;

  // Security: Staff can only fetch their own monthly configuration
  if (req.user.role === 'staff' && req.user.id !== staffId) {
    return res.status(403).json({ error: 'Access forbidden: Cannot view another agent\'s configuration' });
  }

  try {
    let config = await StaffMonthlyConfig.findOne({
      staffId,
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    });
    
    res.json(config || null);
  } catch (error) {
    console.error('Fetch monthly config error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly config' });
  }
});

router.put('/staff-monthly-config/:staffId/:month/:year', requireManagerOrAdmin, async (req, res) => {
  const { staffId, month, year } = req.params;
  const {
    area, region, supervisingManagerId,
    marketList, headQuarterDA, exQuarterDA,
    perMonthSalary, targetAmount
  } = req.body;

  if (!area || !region || !supervisingManagerId) {
    return res.status(400).json({ error: 'Area, region, and Supervising Manager are required' });
  }

  try {
    const filter = {
      staffId,
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    };

    const update = {
      area: area.trim(),
      region: region.trim(),
      supervisingManagerId,
      marketList: marketList || [],
      headQuarterDA: parseFloat(headQuarterDA || 0),
      exQuarterDA: parseFloat(exQuarterDA || 0),
      perMonthSalary: parseFloat(perMonthSalary || 0),
      targetAmount: parseFloat(targetAmount || 0)
    };

    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    const config = await StaffMonthlyConfig.findOneAndUpdate(filter, update, options);
    await delCache(`overview:${month}:${year}`);

    res.json(config);
  } catch (error) {
    console.error('Save monthly config error:', error);
    res.status(500).json({ error: 'Failed to save monthly config' });
  }
});

// 5. GET/POST shared master market list
router.get('/markets', async (req, res) => {
  try {
    const cacheKey = 'markets:all';
    const cachedMarkets = await getCache(cacheKey);
    if (cachedMarkets) {
      return res.json(cachedMarkets);
    }

    const markets = await Market.find().sort({ name: 1 });
    await setCache(cacheKey, markets, 3600);
    res.json(markets);
  } catch (error) {
    console.error('Fetch markets error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

router.post('/markets', requireManagerOrAdmin, async (req, res) => {
  const { name, area } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Market name is required' });
  }

  try {
    const existing = await Market.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Market already exists in master list' });
    }

    const market = new Market({ 
      name: name.trim(),
      area: area ? area.trim() : ''
    });
    await market.save();
    await delCache('markets:all');
    res.status(201).json(market);
  } catch (error) {
    console.error('Create market error:', error);
    res.status(500).json({ error: 'Failed to add market' });
  }
});

// 5a. PUT update an existing market (rename or change parent area)
router.put('/markets/:id', requireManagerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, area } = req.body;

  try {
    const market = await Market.findById(id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    if (name) market.name = name.trim();
    if (area !== undefined) market.area = area.trim();

    await market.save();
    await delCache('markets:all');
    res.json(market);
  } catch (error) {
    console.error('Update market error:', error);
    res.status(500).json({ error: 'Failed to update market' });
  }
});

// 5b. DELETE an existing market from the master database
router.delete('/markets/:id', requireManagerOrAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const market = await Market.findByIdAndDelete(id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    await delCache('markets:all');
    res.json({ message: 'Market deleted successfully' });
  } catch (error) {
    console.error('Delete market error:', error);
    res.status(500).json({ error: 'Failed to delete market' });
  }
});


// 6. GET Bulk Target vs Actual Overview
router.get('/overview', requireManagerOrAdmin, async (req, res) => {
  const month = parseInt(req.query.month || new Date().getMonth() + 1, 10);
  const year = parseInt(req.query.year || new Date().getFullYear(), 10);

  try {
    const cacheKey = `overview:${month}:${year}`;
    const cachedOverview = await getCache(cacheKey);
    if (cachedOverview) {
      return res.json(cachedOverview);
    }

    // 1. Get all active staff
    const agents = await User.find({ role: 'staff', isActive: true });

    // 2. Fetch monthly configs and calculate collections per agent
    const overviewData = await Promise.all(agents.map(async (agent) => {
      // Find config
      const config = await StaffMonthlyConfig.findOne({
        staffId: agent._id,
        month,
        year
      });

      // Find all DailyOrderEntries for this agent in this month
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
      const endOfMonth = new Date(Date.UTC(year, month, 1));

      const orders = await DailyOrderEntry.find({
        staffId: agent._id,
        date: { $gte: startOfMonth, $lt: endOfMonth }
      });

      const totalCollection = orders.reduce((sum, item) => sum + item.dailyCollection, 0);
      const totalOrder = orders.reduce((sum, item) => sum + item.dailyOrder, 0);

      // Check submission status: find missing days
      const daysInMonth = new Date(year, month, 0).getDate();
      const submittedDates = new Set(orders.map(o => new Date(o.date).getUTCDate()));
      const missingDays = [];

      // Determine today's date if filtering for current month
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const limitDay = (year === currentYear && month === currentMonth) ? today.getDate() : daysInMonth;

      for (let day = 1; day <= limitDay; day++) {
        if (!submittedDates.has(day)) {
          missingDays.push(day);
        }
      }

      return {
        agentId: agent._id,
        agentName: agent.name,
        area: config ? config.area : 'Not Configured',
        region: config ? config.region : 'Not Configured',
        targetAmount: config ? config.targetAmount : 0,
        totalCollection,
        totalOrder,
        missingDaysCount: missingDays.length,
        missingDays
      };
    }));

    await setCache(cacheKey, overviewData, 3600);
    res.json(overviewData);
  } catch (error) {
    console.error('Overview aggregation error:', error);
    res.status(500).json({ error: 'Failed to compile overview details' });
  }
});

// 7. PUT Review Manager stamp
router.put('/review/:entryType/:entryId', requireManagerOrAdmin, async (req, res) => {
  const { entryType, entryId } = req.params;

  let model;
  if (entryType === 'daily-works') model = DailyWorksEntry;
  else if (entryType === 'daily-orders') model = DailyOrderEntry;
  else if (entryType === 'field-visits') model = FieldVisitEntry;
  else {
    return res.status(400).json({ error: 'Invalid entry type specified' });
  }

  try {
    const entry = await model.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    entry.managerSignedOff = {
      name: req.user.name,
      at: new Date()
    };

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Review stamp signature error:', error);
    res.status(500).json({ error: 'Failed to save manager review signature' });
  }
});

export default router;
