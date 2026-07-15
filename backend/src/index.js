import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Models
import User from './models/User.js';

// Routers
import authRouter from './routes/auth.js';
import dailyWorksRouter from './routes/dailyWorks.js';
import dailyOrdersRouter from './routes/dailyOrders.js';
import fieldVisitsRouter from './routes/fieldVisits.js';
import adminRouter from './routes/admin.js';
import pdfRouter from './routes/pdf.js';
import { connectRedis } from './services/cache.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/allen-pharma';

app.use(cors());
app.use(express.json());

// API Route Mounts
app.use('/api/auth', authRouter);
app.use('/api/daily-works', dailyWorksRouter);
app.use('/api/daily-orders', dailyOrdersRouter);
app.use('/api/field-visits', fieldVisitsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/pdf', pdfRouter);

// Serve Frontend Static Files in Production
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

// Fallback all non-API GET requests to Index.html for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Seed admin function
const seedAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('No admin users found. Seeding default admin...');

      const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '01700000000';
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'adminpassword';
      const adminName = process.env.DEFAULT_ADMIN_NAME || 'Default Admin';

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      const adminUser = new User({
        name: adminName,
        phone: adminPhone,
        role: 'admin',
        passwordHash,
        isActive: true
      });

      await adminUser.save();
      console.log(`Default admin created successfully!`);
      console.log(`Phone: ${adminPhone}`);
      console.log(`Password: ${adminPassword}`);
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

// Database connection & Server Boot
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await seedAdmin();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
