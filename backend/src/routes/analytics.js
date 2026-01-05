import express from 'express';
import twilioService from '../services/twilioService.js';
import dbAnalytics from '../services/databaseAnalyticsService.js';

const router = express.Router();

// GET /api/analytics/overview - Get overall call statistics for all numbers
router.get('/overview', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    console.log(`[Analytics] Getting overview for last ${days} days from DATABASE`);
    
    const stats = await dbAnalytics.getOverview(parseInt(days));
    
    console.log(`[Analytics] ✅ Got stats from database`);
    
    res.json({
      success: true,
      data: stats,
      source: 'database'
    });
  } catch (error) {
    console.error('[Analytics] Error getting overview:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// GET /api/analytics/number/:phoneNumber - Get detailed stats for specific number
router.get('/number/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { days = 7 } = req.query;
    
    // URL decode the phone number
    const decodedNumber = decodeURIComponent(phoneNumber);
    
    console.log(`[Analytics] Getting stats for ${decodedNumber} from DATABASE`);
    
    // Use database for faster queries
    const calls = await dbAnalytics.getCallLogs({
      phoneNumber: decodedNumber,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      limit: 10000
    });
    
    const totalCalls = calls.length;
    const completedCalls = calls.filter(c => c.status === 'completed').length;
    const avgDuration = completedCalls > 0 
      ? Math.round(calls.reduce((sum, c) => sum + c.duration, 0) / completedCalls)
      : 0;
    
    res.json({
      success: true,
      data: {
        phoneNumber: decodedNumber,
        totalCalls,
        completedCalls,
        avgDuration,
        calls: calls.slice(0, 100) // Return last 100 for details
      },
      source: 'database'
    });
  } catch (error) {
    console.error('[Analytics] Error getting number stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/analytics/calls - Get raw call logs with filters
router.get('/calls', async (req, res) => {
  try {
    const { phoneNumber, startDate, endDate, limit = 1000, status, setter } = req.query;
    
    console.log(`[Analytics] Getting call logs from DATABASE`);
    
    const calls = await dbAnalytics.getCallLogs({
      phoneNumber: phoneNumber ? decodeURIComponent(phoneNumber) : null,
      startDate,
      endDate,
      limit: parseInt(limit),
      status,
      setter
    });
    
    res.json({
      success: true,
      count: calls.length,
      calls,
      source: 'database'
    });
  } catch (error) {
    console.error('[Analytics] Error getting calls:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/analytics/setters - Get setter performance analytics
router.get('/setters', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    console.log(`[Analytics] Getting setter performance for last ${days} days from DATABASE`);
    
    const stats = await dbAnalytics.getSetterPerformance(parseInt(days));
    
    console.log(`[Analytics] ✅ Got setter performance from database`);
    
    res.json({
      success: true,
      data: stats,
      source: 'database'
    });
  } catch (error) {
    console.error('[Analytics] Error getting setter performance:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;