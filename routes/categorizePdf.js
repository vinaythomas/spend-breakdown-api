import express from 'express';
import { categorizePdfStatement } from '../services/claudeService.js';

const router = express.Router();

/**
 * POST /api/categorize-pdf
 * Extract and categorize transactions from PDF bank statement using Claude Vision
 */
router.post('/', async (req, res) => {
  try {
    const { pdf } = req.body;

    // Validation
    if (!pdf || typeof pdf !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'pdf (base64 string) is required'
      });
    }

    // Basic base64 validation (check if it looks like base64)
    if (!/^[A-Za-z0-9+/=]+$/.test(pdf)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'pdf must be a valid base64 encoded string'
      });
    }

    // Call Claude Vision service
    const result = await categorizePdfStatement(pdf);

    res.json(result);
  } catch (error) {
    console.error('PDF categorization error:', error);

    // Return 500 for server errors
    res.status(500).json({
      error: 'PDF categorization failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

export default router;
