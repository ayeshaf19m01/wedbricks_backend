require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { upload, uploadAvatar } = require('./config/multer');
const app = express();
const server = http.createServer(app);

// Controllers and Routes
const authController = require('./controllers/authController');
const contactRouter = require('./routes/contactRoutes');
const serviceRouter = require('./routes/serviceRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // ✅ added
const packageRoutes = require('./routes/packageRoutes');
// Socket setup
const { socketHandler } = require('./socket');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
// Initialize Socket.IO
socketHandler(server);

// Middleware
app.use(cors({
  origin: ['https://wed-bricks-l6pi-e08unxpgt-ayesha-s-projects-b9a7ba29.vercel.app/','http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI , {
  useNewUrlParser: true,
  
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Local Multer config to avoid name conflict
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/vendor-logos/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const localUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and GIF images are allowed!'));
    }
  }
});

// Auth routes
app.post('/api/signup', authController.userSignup);
app.post('/api/signin', authController.userLogin);
app.post('/api/vendor/signup', localUpload.single('logo'), authController.vendorSignup);
app.post('/api/vendor/signin', authController.vendorLogin);

// API Routes
app.use('/api/contact', contactRouter);
app.use('/api/services', serviceRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api', vendorRoutes);
app.use('/api', userRoutes);
app.use('/api/auth', passwordRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ added
app.use('/api/packages', packageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.message);
  console.error(err.stack);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : 'File upload error'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 8080;
// const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload directories:
  - Vendor logos: ${path.resolve('uploads/vendor-logos')}
  - User avatars: ${path.resolve('uploads/user-avatars')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('🔴 Server and MongoDB connection closed');
      process.exit(0);
    });
  });
});
