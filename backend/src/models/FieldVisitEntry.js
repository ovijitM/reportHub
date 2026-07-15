import mongoose from 'mongoose';

const fieldVisitEntrySchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  market: {
    type: String,
    required: true,
    trim: true
  },
  morningVisit: {
    type: String,
    default: '',
    trim: true
  },
  eveningVisit: {
    type: String,
    default: '',
    trim: true
  },
  gynecologistQty: {
    type: Number,
    default: 0,
    min: 0
  },
  medicineQty: {
    type: Number,
    default: 0,
    min: 0
  },
  pediatricQty: {
    type: Number,
    default: 0,
    min: 0
  },
  orthopaedicQty: {
    type: Number,
    default: 0,
    min: 0
  },
  skinVdQty: {
    type: Number,
    default: 0,
    min: 0
  },
  gpOthersQty: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVisitQty: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVisitQtyOverridden: {
    type: Boolean,
    default: false
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
fieldVisitEntrySchema.index({ staffId: 1, date: 1 }, { unique: true });

const FieldVisitEntry = mongoose.model('FieldVisitEntry', fieldVisitEntrySchema);
export default FieldVisitEntry;
