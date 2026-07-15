import express from 'express';
import DailyOrderEntry from '../models/DailyOrderEntry.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const LOCK_WINDOW_DAYS = parseInt(process.env.LOCK_WINDOW_DAYS || '7', 10);

const isLocked = (dateString, userRole) => {
  if (userRole === 'admin' || userRole === 'manager') return false;

  const entryDate = new Date(dateString);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const targetDate = new Date(entryDate);
  targetDate.setUTCHours(0, 0, 0, 0);

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > LOCK_WINDOW_DAYS || diffDays < 0;
};

// Create or Upsert Daily Order/Collection Entry
router.post('/', authenticateToken, async (req, res) => {
  const { date, market, doctorsCost, otherCost, dailyOrder, dailyCollection, remarks } = req.body;
  const staffId = req.user.role === 'staff' ? req.user._id : req.body.staffId;

  if (!date || !market) {
    return res.status(400).json({ error: 'Missing required fields (date and market)' });
  }

  if (!staffId) {
    return res.status(400).json({ error: 'MPO Staff ID is required' });
  }

  if (isLocked(date, req.user.role)) {
    return res.status(403).json({ error: `Cannot submit entries older than ${LOCK_WINDOW_DAYS} days.` });
  }

  try {
    const entryDate = new Date(date);
    entryDate.setUTCHours(0, 0, 0, 0);

    const filter = { staffId, date: entryDate };
    const update = {
      market,
      doctorsCost: parseFloat(doctorsCost || 0),
      otherCost: parseFloat(otherCost || 0),
      dailyOrder: parseFloat(dailyOrder || 0),
      dailyCollection: parseFloat(dailyCollection || 0),
      remarks: remarks || '',
      mpoSignedOff: { name: req.user.name, at: new Date() }
    };

    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    const entry = await DailyOrderEntry.findOneAndUpdate(filter, update, options);

    res.json(entry);
  } catch (error) {
    console.error('Save Daily Order entry error:', error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// Retrieve Daily Order/Collection Entries
router.get('/', authenticateToken, async (req, res) => {
  const { staffId, from, to } = req.query;
  const targetStaffId = req.user.role === 'staff' ? req.user._id : staffId;

  if (!targetStaffId) {
    return res.status(400).json({ error: 'Staff ID is required' });
  }

  const query = { staffId: targetStaffId };

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  try {
    const entries = await DailyOrderEntry.find(query).sort({ date: 1 });
    res.json(entries);
  } catch (error) {
    console.error('Fetch Daily Order entries error:', error);
    res.status(500).json({ error: 'Failed to retrieve entries' });
  }
});

// Edit specific entry by ID
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { market, doctorsCost, otherCost, dailyOrder, dailyCollection, remarks } = req.body;

  try {
    const entry = await DailyOrderEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (req.user.role === 'staff' && entry.staffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this entry' });
    }

    if (isLocked(entry.date, req.user.role)) {
      return res.status(403).json({ error: `This entry is locked after ${LOCK_WINDOW_DAYS} days.` });
    }

    entry.market = market !== undefined ? market : entry.market;
    entry.doctorsCost = doctorsCost !== undefined ? parseFloat(doctorsCost || 0) : entry.doctorsCost;
    entry.otherCost = otherCost !== undefined ? parseFloat(otherCost || 0) : entry.otherCost;
    entry.dailyOrder = dailyOrder !== undefined ? parseFloat(dailyOrder || 0) : entry.dailyOrder;
    entry.dailyCollection = dailyCollection !== undefined ? parseFloat(dailyCollection || 0) : entry.dailyCollection;
    entry.remarks = remarks !== undefined ? remarks : entry.remarks;

    if (req.user.role === 'staff') {
      entry.mpoSignedOff = { name: req.user.name, at: new Date() };
    }

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Update Daily Order entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

export default router;
