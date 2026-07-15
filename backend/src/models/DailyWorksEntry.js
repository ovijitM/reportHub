import mongoose from 'mongoose';

const dailyWorksEntrySchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  morningMarket: {
    type: String,
    required: true,
    trim: true
  },
  afternoonMarket: {
    type: String,
    required: true,
    trim: true
  },
  doctorVisitQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  rxProductSurvey: {
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
dailyWorksEntrySchema.index({ staffId: 1, date: 1 }, { unique: true });

const DailyWorksEntry = mongoose.model('DailyWorksEntry', dailyWorksEntrySchema);
export default DailyWorksEntry;
