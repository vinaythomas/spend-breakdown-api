import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import categorizeRouter from './routes/categorize.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categorize', categorizeRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Spend Breakdown API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🤖 Claude API Key configured: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
});
