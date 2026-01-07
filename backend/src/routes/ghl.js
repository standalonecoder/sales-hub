import express from 'express';
import ghlService from '../services/ghlService.js';

const router = express.Router();

// GET /api/ghl/users
// Fetch users directly from GHL API (no database)
router.get('/users', async (req, res) => {
  try {
    // Fetch fresh data from GHL API
    const apiUsers = await ghlService.getUsers();
    
    // Format users for frontend
    const formattedUsers = apiUsers.map(user => ({
      id: user.id || user.userId || user._id,
      ghlUserId: user.id || user.userId || user._id,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      email: user.email || null,
      role: user.role || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      // Add timestamp for sorting (use current time since we don't have createdAt)
      lastSyncedAt: new Date().toISOString()
    }));
    
    return res.json({ 
      success: true, 
      users: formattedUsers, 
      source: 'ghl-api',
      count: formattedUsers.length
    });
  } catch (error) {
    console.error('GET /api/ghl/users error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'Failed to fetch users from GHL API'
    });
  }
});

// POST /api/ghl/sync/users
// This endpoint is now deprecated since we're not using a database
// But keeping it for backwards compatibility - just returns current users
router.post('/sync/users', async (req, res) => {
  try {
    const apiUsers = await ghlService.getUsers();
    
    res.json({
      success: true,
      message: 'Users fetched from GHL API (database sync disabled)',
      totals: {
        fromApi: apiUsers.length,
        added: 0,
        updated: 0,
      },
      note: 'Database operations have been disabled. Using API-only mode.'
    });
  } catch (error) {
    console.error('POST /api/ghl/sync/users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ghl/phone-numbers
router.get('/phone-numbers', async (req, res) => {
  try {
    const numbers = await ghlService.getPhoneNumbers();
    res.json({ success: true, numbers });
  } catch (error) {
    console.error('GET /api/ghl/phone-numbers error:', error);

    // Fallback: return mock data so UI still works
    const mockNumbers = [
      {
        phoneNumber: '+12025550123',
        friendlyName: 'GHL Mock Number 1',
        assignedUserName: 'Demo Staff 1',
      },
      {
        phoneNumber: '+13055550123',
        friendlyName: 'GHL Mock Number 2',
        assignedUserName: 'Demo Staff 2',
      },
    ];

    res.json({
      success: false,
      error: error.message,
      numbers: mockNumbers,
      source: 'mock-fallback',
    });
  }
});

// DEBUG endpoint to see full GHL data structure
router.get('/phone-numbers/debug', async (req, res) => {
  try {
    const numbers = await ghlService.getPhoneNumbers();
    // Return first number with full details to inspect structure
    res.json({ 
      success: true, 
      totalNumbers: numbers.length,
      sampleNumber: numbers[0], // Full data structure of first number
      allNumbers: numbers // All numbers with full details
    });
  } catch (error) {
    console.error('GET /api/ghl/phone-numbers/debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;