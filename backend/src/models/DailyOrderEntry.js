import mongoose from 'mongoose';

const dailyOrderEntrySchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  market: {
    type: String,
    required: true,
    trim: true
  },
  doctorsCost: {
    type: Number,
    default: 0,
    min: 0
  },
  otherCost: {
    type: Number,
    default: 0,
    min: 0
  },
  dailyOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  dailyCollection: {
    type: Number,
    default: 0,
    min: 0
  },
  remarks: {
    type: String,
    default: '',
    trim: true
  },
  mpoSignedOff: {
    name: String,
    at: Date
  },
  managerSignedOff: {
    name: String,
    at: Date
  }
}, {
  timestamps: true
});

// Enforce unique entry per staff member per date
dailyOrderEntrySchema.index({ staffId: 1, date: 1 }, { unique: true });

const DailyOrderEntry = mongoose.model('DailyOrderEntry', dailyOrderEntrySchema);
export default DailyOrderEntry;
