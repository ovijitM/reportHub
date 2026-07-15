import express from 'express';
import DailyWorksEntry from '../models/DailyWorksEntry.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const LOCK_WINDOW_DAYS = parseInt(process.env.LOCK_WINDOW_DAYS || '7', 10);

// Helper function to check if date falls outside the backfill window
const isLocked = (dateString, userRole) => {
  if (userRole === 'admin' || userRole === 'manager') return false;

  const entryDate = new Date(dateString);
  // Normalize dates to midnight to prevent hourly discrepancies
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const targetDate = new Date(entryDate);
  targetDate.setUTCHours(0, 0, 0, 0);

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > LOCK_WINDOW_DAYS || diffDays < 0; // block future dates too
};

// Create or Upsert Daily Works Entry
router.post('/', authenticateToken, async (req, res) => {
  const { date, morningMarket, afternoonMarket, doctorVisitQuantity, rxProductSurvey } = req.body;
  const staffId = req.user.role === 'staff' ? req.user._id : req.body.staffId;

  if (!date || !morningMarket || !afternoonMarket || doctorVisitQuantity === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!staffId) {
    return res.status(400).json({ error: 'MPO Staff ID is required' });
  }

  // Enforce lock window on submission
  if (isLocked(date, req.user.role)) {
    return res.status(403).json({ error: `Cannot submit entries older than ${LOCK_WINDOW_DAYS} days.` });
  }

  try {
    // Normalize date to midnight UTC
    const entryDate = new Date(date);
    entryDate.setUTCHours(0, 0, 0, 0);

    const filter = { staffId, date: entryDate };
    const update = {
      morningMarket,
      afternoonMarket,
      doctorVisitQuantity: parseInt(doctorVisitQuantity, 10),
      rxProductSurvey: rxProductSurvey || '',
      mpoSignedOff: { name: req.user.name, at: new Date() }
    };

    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    const entry = await DailyWorksEntry.findOneAndUpdate(filter, update, options);

    res.json(entry);
  } catch (error) {
    console.error('Save Daily Works entry error:', error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// Retrieve Daily Works Entries
router.get('/', authenticateToken, async (req, res) => {
  const { staffId, from, to } = req.query;

  // MPO can only view their own entries
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
    const entries = await DailyWorksEntry.find(query).sort({ date: 1 });
    res.json(entries);
  } catch (error) {
    console.error('Fetch Daily Works entries error:', error);
    res.status(500).json({ error: 'Failed to retrieve entries' });
  }
});

// Edit specific entry by ID
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { morningMarket, afternoonMarket, doctorVisitQuantity, rxProductSurvey } = req.body;

  try {
    const entry = await DailyWorksEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Authorization check
    if (req.user.role === 'staff' && entry.staffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this entry' });
    }

    // Enforce lock window
    if (isLocked(entry.date, req.user.role)) {
      return res.status(403).json({ error: `This entry is locked after ${LOCK_WINDOW_DAYS} days.` });
    }

    entry.morningMarket = morningMarket !== undefined ? morningMarket : entry.morningMarket;
    entry.afternoonMarket = afternoonMarket !== undefined ? afternoonMarket : entry.afternoonMarket;
    entry.doctorVisitQuantity = doctorVisitQuantity !== undefined ? parseInt(doctorVisitQuantity, 10) : entry.doctorVisitQuantity;
    entry.rxProductSurvey = rxProductSurvey !== undefined ? rxProductSurvey : entry.rxProductSurvey;
    
    if (req.user.role === 'staff') {
      entry.mpoSignedOff = { name: req.user.name, at: new Date() };
    }

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Update Daily Works entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

export default router;
