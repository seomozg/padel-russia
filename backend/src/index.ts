import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { courtsRouter } from './modules/courts/courts.routes';
import { articlesRouter } from './modules/articles/articles.routes';
import { reviewsRouter } from './modules/reviews/reviews.routes';
import { mapsRouter } from './modules/maps/maps.routes';
import { redisClient } from './config/redis';

const app = express();
const PORT = process.env.PORT || 3001;

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'public', 'images', 'courts');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'], // Vite dev servers
  credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/courts', courtsRouter);
app.use('/articles', articlesRouter);
app.use('/reviews', reviewsRouter);
app.use('/maps', mapsRouter);

// Upload routes
app.post('/upload/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = `/images/courts/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Connect to Redis if enabled
  const redisEnabled = process.env.REDIS_ENABLED === 'true';
  if (redisEnabled) {
    try {
      await redisClient.connect();
      console.log('✅ Connected to Redis');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
    }
  } else {
    console.log('ℹ️ Redis disabled by configuration');
  }
});
