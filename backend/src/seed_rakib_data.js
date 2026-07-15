import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Models
import User from './models/User.js';
import StaffMonthlyConfig from './models/StaffMonthlyConfig.js';
import DailyWorksEntry from './models/DailyWorksEntry.js';
import DailyOrderEntry from './models/DailyOrderEntry.js';
import FieldVisitEntry from './models/FieldVisitEntry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/allen-pharma';

const seedRakibData = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    // 1. Fetch user ID for Rakib Sarkar (demo staff)
    const staff = await User.findOne({ phone: '01800000000' });
    if (!staff) {
      throw new Error('MPO staff user "Rakib Sarkar" (01800000000) not found. Run dev server first to seed.');
    }

    const admin = await User.findOne({ role: 'admin' });
    const adminId = admin ? admin._id : staff._id; // fallback

    console.log(`Found MPO: ${staff.name} (${staff._id})`);

    // 2. Upsert Staff Monthly Config for July 2026
    const month = 7;
    const year = 2026;

    const monthlyConfig = {
      staffId: staff._id,
      month,
      year,
      area: 'Nasirnagar',
      region: 'Sylhet',
      supervisingManagerId: adminId,
      marketList: ['Nasirnagar', 'Choin', 'Fandauk', 'Sarail', 'Sonail', 'B.Bonia'],
      headQuarterDA: 225,
      exQuarterDA: 250,
      perMonthSalary: 22000,
      targetAmount: 180000
    };

    await StaffMonthlyConfig.findOneAndUpdate(
      { staffId: staff._id, month, year },
      monthlyConfig,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Sheet 2 monthly config (Salary, D/A, Target) updated successfully.');

    // Clear existing daily entries for Rakib for July 2026
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 1));

    await DailyWorksEntry.deleteMany({ staffId: staff._id, date: { $gte: startOfMonth, $lt: endOfMonth } });
    await DailyOrderEntry.deleteMany({ staffId: staff._id, date: { $gte: startOfMonth, $lt: endOfMonth } });
    await FieldVisitEntry.deleteMany({ staffId: staff._id, date: { $gte: startOfMonth, $lt: endOfMonth } });
    console.log('Cleared existing logs for July 2026 to prevent duplicate constraints.');

    // 3. Seed Sheet 1: Daily Works
    const sheet1Data = [
      { date: 1, morning: 'Nasirnagar', afternoon: 'Nasirnagar', qty: 9 },
      { date: 2, morning: 'Nasirnagar', afternoon: 'Nasirnagar', qty: 10 },
      { date: 3, morning: 'Nasirnagar', afternoon: 'B.Bonia', qty: 6 },
      { date: 4, morning: 'Nasirnagar', afternoon: 'Nasirnagar', qty: 5 },
      { date: 5, morning: 'Sonail', afternoon: 'Nasirnagar', qty: 6 },
      { date: 6, morning: 'Nasirnagar', afternoon: 'Nasirnagar', qty: 7 },
      { date: 7, morning: 'Nasirnagar', afternoon: 'Nasirnagar', qty: 7 }
    ];

    const s1Entries = sheet1Data.map(item => ({
      staffId: staff._id,
      date: new Date(Date.UTC(year, month - 1, item.date)),
      morningMarket: item.morning,
      afternoonMarket: item.afternoon,
      doctorVisitQuantity: item.qty,
      rxProductSurvey: '',
      mpoSignedOff: { name: staff.name, at: new Date() }
    }));
    await DailyWorksEntry.insertMany(s1Entries);
    console.log(`Seeded ${s1Entries.length} Sheet 1 (Daily Works) entries.`);

    // 4. Seed Sheet 2: Daily Order / Collection
    const sheet2Data = [
      { date: 1, market: 'Nasirnagar', docsCost: 0, otherCost: 0, order: 3780, collection: 1000 },
      { date: 2, market: 'Nasirnagar+Choin', docsCost: 0, otherCost: 80, order: 5300, collection: 2000 },
      { date: 3, market: 'Nasirnagar', docsCost: 0, otherCost: 220, order: 2760, collection: 1000 },
      { date: 4, market: 'Nasi+B.Bonia', docsCost: 0, otherCost: 120, order: 3200, collection: 1000 },
      { date: 5, market: 'Sonail+Nasirnagar', docsCost: 10000, otherCost: 0, order: 4780, collection: 2000 },
      { date: 6, market: 'Nasirnagar', docsCost: 0, otherCost: 0, order: 6300, collection: 500 },
      { date: 7, market: 'Nasirnagar', docsCost: 0, otherCost: 0, order: 7980, collection: 1000 },
      { date: 8, market: '', docsCost: 0, otherCost: 0, order: 0, collection: 0 } // blank date
    ];

    const s2Entries = sheet2Data.map(item => ({
      staffId: staff._id,
      date: new Date(Date.UTC(year, month - 1, item.date)),
      market: item.market || 'Nasirnagar', // fallback to default area
      doctorsCost: item.docsCost,
      otherCost: item.otherCost,
      dailyOrder: item.order,
      dailyCollection: item.collection,
      remarks: item.date === 8 ? 'Blank date entry' : '',
      mpoSignedOff: { name: staff.name, at: new Date() }
    }));
    await DailyOrderEntry.insertMany(s2Entries);
    console.log(`Seeded ${s2Entries.length} Sheet 2 (Orders & Collections) entries.`);

    // 5. Seed Sheet 3: Field Works Visit
    const sheet3Data = [
      { date: 1, market: 'Nasirnagar', morn: 'Nasi', even: 'Nasi', gyn: 3, med: 1, ped: 1, ortho: 0, skin: 2, gp: 2, total: 9 },
      { date: 2, market: 'Nasi+Choin', morn: 'Nasirnagar', even: 'Choin', gyn: 4, med: 1, ped: 1, ortho: 0, skin: 3, gp: 1, total: 10 },
      { date: 3, market: 'Nasirnagar', morn: 'Nasin', even: 'Nasin', gyn: 3, med: 1, ped: 1, ortho: 0, skin: 1, gp: 1, total: 6 },
      { date: 4, market: 'Nasirnagar', morn: 'Nasi', even: 'B.Bonia', gyn: 3, med: 0, ped: 0, ortho: 1, skin: 1, gp: 2, total: 6 },
      { date: 5, market: 'Sonail+Nasi', morn: 'Sonail', even: 'Nasi', gyn: 3, med: 0, ped: 0, ortho: 1, skin: 0, gp: 0, total: 5 },
      { date: 6, market: 'Nasirnagar', morn: 'Nasi', even: 'Nasi', gyn: 3, med: 1, ped: 0, ortho: 1, skin: 2, gp: 0, total: 7 },
      { date: 7, market: 'Nasirnagar', morn: 'Nasi', even: 'Nasi', gyn: 3, med: 0, ped: 1, ortho: 1, skin: 2, gp: 0, total: 7 }
    ];

    const s3Entries = sheet3Data.map(item => {
      const sum = item.gyn + item.med + item.ped + item.ortho + item.skin + item.gp;
      return {
        staffId: staff._id,
        date: new Date(Date.UTC(year, month - 1, item.date)),
        area: 'Nasirnagar',
        market: item.market,
        morningVisit: item.morn,
        eveningVisit: item.even,
        gynecologistQty: item.gyn,
        medicineQty: item.med,
        pediatricQty: item.ped,
        orthopaedicQty: item.ortho,
        skinVdQty: item.skin,
        gpOthersQty: item.gp,
        totalVisitQty: item.total,
        totalVisitQtyOverridden: sum !== item.total,
        mpoSignedOff: { name: staff.name, at: new Date() }
      };
    });
    await FieldVisitEntry.insertMany(s3Entries);
    console.log(`Seeded ${s3Entries.length} Sheet 3 (Field Doctor Visits) entries.`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding database error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
};

seedRakibData();
