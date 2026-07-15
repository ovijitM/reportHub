import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  area: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Market = mongoose.model('Market', marketSchema);
export default Market;
