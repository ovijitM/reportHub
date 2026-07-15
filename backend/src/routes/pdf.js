import express from 'express';
import User from '../models/User.js';
import StaffMonthlyConfig from '../models/StaffMonthlyConfig.js';
import DailyWorksEntry from '../models/DailyWorksEntry.js';
import DailyOrderEntry from '../models/DailyOrderEntry.js';
import FieldVisitEntry from '../models/FieldVisitEntry.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  generateDailyWorksPDF,
  generateDailyOrdersPDF,
  generateFieldVisitsPDF
} from '../services/pdfGenerator.js';

const router = express.Router();

// Middleware to authorize PDF access
const authorizePDFAccess = (req, res, next) => {
  const { staffId } = req.params;
  if (req.user.role === 'staff' && req.user._id.toString() !== staffId) {
    return res.status(403).json({ error: 'Not authorized to download other MPOs sheets' });
  }
  next();
};

router.use(authenticateToken);

// GET Daily Works Sheet 1 PDF
router.get('/daily-works/:staffId/:month/:year', authorizePDFAccess, async (req, res) => {
  const { staffId, month, year } = req.params;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  try {
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const config = await StaffMonthlyConfig.findOne({ staffId, month: m, year: y });

    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 1));

    const entries = await DailyWorksEntry.find({
      staffId,
      date: { $gte: startOfMonth, $lt: endOfMonth }
    });

    const pdfBuffer = await generateDailyWorksPDF(staff, config, m, y, entries);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Daily_Works_${staff.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate Daily Works PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET Daily Order / Collection Sheet 2 PDF
router.get('/daily-orders/:staffId/:month/:year', authorizePDFAccess, async (req, res) => {
  const { staffId, month, year } = req.params;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  try {
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const config = await StaffMonthlyConfig.findOne({ staffId, month: m, year: y });

    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 1));

    const entries = await DailyOrderEntry.find({
      staffId,
      date: { $gte: startOfMonth, $lt: endOfMonth }
    });

    const pdfBuffer = await generateDailyOrdersPDF(staff, config, m, y, entries);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Order_Collection_${staff.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate Daily Orders PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET Field Visit Sheet 3 PDF
router.get('/field-visits/:staffId/:month/:year', authorizePDFAccess, async (req, res) => {
  const { staffId, month, year } = req.params;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  try {
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const config = await StaffMonthlyConfig.findOne({ staffId, month: m, year: y });

    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 1));

    const entries = await FieldVisitEntry.find({
      staffId,
      date: { $gte: startOfMonth, $lt: endOfMonth }
    });

    const pdfBuffer = await generateFieldVisitsPDF(staff, config, m, y, entries);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Field_Visits_${staff.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate Field Visits PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
