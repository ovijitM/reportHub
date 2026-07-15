import mongoose from 'mongoose';

const staffMonthlyConfigSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    required: true,
    trim: true
  },
  supervisingManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  marketList: [{
    type: String,
    trim: true
  }],
  headQuarterDA: {
    type: Number,
    default: 0
  },
  exQuarterDA: {
    type: Number,
    default: 0
  },
  perMonthSalary: {
    type: Number,
    default: 0
  },
  targetAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Enforce unique config per staff member per month
staffMonthlyConfigSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

const StaffMonthlyConfig = mongoose.model('StaffMonthlyConfig', staffMonthlyConfigSchema);
export default StaffMonthlyConfig;
