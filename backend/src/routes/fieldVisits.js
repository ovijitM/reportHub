import express from 'express';
import FieldVisitEntry from '../models/FieldVisitEntry.js';
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

// Create or Upsert Field Visit Entry
router.post('/', authenticateToken, async (req, res) => {
  const {
    date, area, market,
    morningVisit, eveningVisit,
    gynecologistQty, medicineQty, pediatricQty, orthopaedicQty, skinVdQty, gpOthersQty,
    totalVisitQty
  } = req.body;
  
  const staffId = req.user.role === 'staff' ? req.user._id : req.body.staffId;

  if (!date || !area || !market) {
    return res.status(400).json({ error: 'Missing required fields' });
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

    // Sum details to see if they match the total input
    const gynecologist = parseInt(gynecologistQty || 0, 10);
    const medicine = parseInt(medicineQty || 0, 10);
    const pediatric = parseInt(pediatricQty || 0, 10);
    const orthopaedic = parseInt(orthopaedicQty || 0, 10);
    const skinVd = parseInt(skinVdQty || 0, 10);
    const gpOthers = parseInt(gpOthersQty || 0, 10);
    
    const computedTotal = gynecologist + medicine + pediatric + orthopaedic + skinVd + gpOthers;
    const reportedTotal = parseInt(totalVisitQty || computedTotal, 10);
    const totalVisitQtyOverridden = computedTotal !== reportedTotal;

    const filter = { staffId, date: entryDate };
    const update = {
      area,
      market,
      morningVisit: morningVisit !== undefined ? String(morningVisit).trim() : '',
      eveningVisit: eveningVisit !== undefined ? String(eveningVisit).trim() : '',
      gynecologistQty: gynecologist,
      medicineQty: medicine,
      pediatricQty: pediatric,
      orthopaedicQty: orthopaedic,
      skinVdQty: skinVd,
      gpOthersQty: gpOthers,
      totalVisitQty: reportedTotal,
      totalVisitQtyOverridden,
      mpoSignedOff: { name: req.user.name, at: new Date() }
    };

    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    const entry = await FieldVisitEntry.findOneAndUpdate(filter, update, options);

    res.json(entry);
  } catch (error) {
    console.error('Save Field Visit entry error:', error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// Retrieve Field Visit Entries
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
    const entries = await FieldVisitEntry.find(query).sort({ date: 1 });
    res.json(entries);
  } catch (error) {
    console.error('Fetch Field Visit entries error:', error);
    res.status(500).json({ error: 'Failed to retrieve entries' });
  }
});

// Edit specific entry by ID
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    area, market,
    morningVisit, eveningVisit,
    gynecologistQty, medicineQty, pediatricQty, orthopaedicQty, skinVdQty, gpOthersQty,
    totalVisitQty
  } = req.body;

  try {
    const entry = await FieldVisitEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (req.user.role === 'staff' && entry.staffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this entry' });
    }

    if (isLocked(entry.date, req.user.role)) {
      return res.status(403).json({ error: `This entry is locked after ${LOCK_WINDOW_DAYS} days.` });
    }

    entry.area = area !== undefined ? area : entry.area;
    entry.market = market !== undefined ? market : entry.market;
    if (morningVisit !== undefined) entry.morningVisit = String(morningVisit).trim();
    if (eveningVisit !== undefined) entry.eveningVisit = String(eveningVisit).trim();
    
    if (gynecologistQty !== undefined) entry.gynecologistQty = parseInt(gynecologistQty || 0, 10);
    if (medicineQty !== undefined) entry.medicineQty = parseInt(medicineQty || 0, 10);
    if (pediatricQty !== undefined) entry.pediatricQty = parseInt(pediatricQty || 0, 10);
    if (orthopaedicQty !== undefined) entry.orthopaedicQty = parseInt(orthopaedicQty || 0, 10);
    if (skinVdQty !== undefined) entry.skinVdQty = parseInt(skinVdQty || 0, 10);
    if (gpOthersQty !== undefined) entry.gpOthersQty = parseInt(gpOthersQty || 0, 10);

    const computedTotal = entry.gynecologistQty + entry.medicineQty + entry.pediatricQty + entry.orthopaedicQty + entry.skinVdQty + entry.gpOthersQty;
    if (totalVisitQty !== undefined) {
      entry.totalVisitQty = parseInt(totalVisitQty || 0, 10);
      entry.totalVisitQtyOverridden = computedTotal !== entry.totalVisitQty;
    } else {
      // Re-sum if specialty columns changed but total was not explicitly modified
      entry.totalVisitQty = computedTotal;
      entry.totalVisitQtyOverridden = false;
    }

    if (req.user.role === 'staff') {
      entry.mpoSignedOff = { name: req.user.name, at: new Date() };
    }

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Update Field Visit entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

export default router;
