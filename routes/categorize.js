import express from 'express';
import { categorizeTransactions } from '../services/claudeService.js';

const router = express.Router();

/**
 * POST /api/categorize
 * Categorize bank transactions using Claude AI
 */
router.post('/', async (req, res) => {
  try {
    const { transactions } = req.body;

    // Validation
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'transactions array is required'
      });
    }

    if (transactions.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'transactions array cannot be empty'
      });
    }

    if (transactions.length > 1000) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Maximum 1000 transactions allowed per request'
      });
    }

    // Validate each transaction has required fields
    for (const transaction of transactions) {
      if (!transaction.description || typeof transaction.amount !== 'number') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Each transaction must have description (string) and amount (number)'
        });
      }
    }

    // Call Claude service
    const result = await categorizeTransactions(transactions);

    res.json(result);
  } catch (error) {
    console.error('Categorization error:', error);

    // Return 500 for server errors
    res.status(500).json({
      error: 'Categorization failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

export default router;
