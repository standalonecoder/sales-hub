import express from 'express';
import salesAnalytics from '../services/salesAnalyticsService.js';

const router = express.Router();

// GET /api/sales/overview - Get sales overview
router.get('/overview', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    console.log(`[Sales API] Getting overview for last ${days} days`);
    
    const stats = await salesAnalytics.getSalesOverview(parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Sales API] Error getting overview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/sales/top-closers - Get top performing closers
router.get('/top-closers', async (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;
    
    console.log(`[Sales API] Getting top closers for last ${days} days`);
    
    const topClosers = await salesAnalytics.getTopClosers(parseInt(days), parseInt(limit));
    
    res.json({
      success: true,
      data: topClosers
    });
  } catch (error) {
    console.error('[Sales API] Error getting top closers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;