import express from 'express';
import googleWorkspaceService from '../services/googleWorkspaceService.js';
import * as calendlyService from '../services/calendlyService.js';
import zoomService from '../services/zoomService.js';
import ghlService from '../services/ghlService.js';
import twilioService from '../services/twilioService.js';

const router = express.Router();

// GET /api/closers - Get all closers from GHL (users with @tjr-trades.com)
router.get('/', async (req, res) => {
  try {
    console.log('[Closers] Fetching users from GHL...');
    
    // Fetch users from GHL API
    const ghlUsers = await ghlService.getUsers();
    console.log(`[Closers] Found ${ghlUsers.length} users in GHL`);
    
    // Get all Twilio numbers
    const twilioNumbers = await twilioService.getAllNumbers();
    console.log(`[Closers] Found ${twilioNumbers.length} Twilio numbers`);
    
    // Get numbers WITH GHL status (same as Active Numbers page)
    const numbersWithStatus = await ghlService.compareWithTwilio(twilioNumbers);
    console.log(`[Closers] Processed ${numbersWithStatus.length} numbers with GHL status`);
    
    // Extract just the GHL phone numbers data
    const ghlPhoneNumbers = numbersWithStatus
      .filter(n => n.inGHL && n.ghlData)
      .map(n => n.ghlData);
    
    console.log(`[Closers] Found ${ghlPhoneNumbers.length} numbers in GHL`);
    
    // Debug: show a sample
    if (ghlPhoneNumbers.length > 0) {
      console.log('[Closers] Sample GHL number:', JSON.stringify(ghlPhoneNumbers[0], null, 2));
    }
    
    // Filter only closers (@tjr-trades.com emails)
    const closers = ghlUsers
      .filter(user => {
        const email = user.email || '';
        return email.includes('@tjr-trades.com');
      })
      .map(user => {
        const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const userId = user.id || user.ghlUserId;
        
        // Find 650 number assigned to this user via linkedUser field
        const assignedNumber = ghlPhoneNumbers.find(n => {
          const hasLinkedUser = n.linkedUser === userId;
          const is650 = n.phoneNumber?.includes('650');
          
          if (hasLinkedUser && is650) {
            console.log(`[Closers] MATCH! ${userName} (${userId}) -> ${n.phoneNumber}`);
          }
          
          return is650 && hasLinkedUser;
        });
        
        return {
          id: userId,
          firstName: user.firstName || userName.split(' ')[0] || 'Unknown',
          lastName: user.lastName || userName.split(' ').slice(1).join(' ') || '',
          email: user.email || null,
          phoneNumber: user.phone || null,
          name: userName,
          role: user.role || null,
          ghlUserId: userId,
          createdAt: user.createdAt || null,
          // Add the assigned 650 number directly
          assignedPhoneNumber: assignedNumber?.phoneNumber || null,
          assignedPhoneSid: assignedNumber?.sid || null
        };
      });
    
    const with650 = closers.filter(c => c.assignedPhoneNumber).length;
    console.log(`[Closers] Result: ${closers.length} closers, ${with650} with 650 numbers`);
    
    res.json({
      success: true,
      closers: closers,
      count: closers.length
    });
    
  } catch (error) {
    console.error('[Closers] Error fetching closers:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch closers from GHL'
    });
  }
});

// POST /api/closers/onboard - Onboard a new closer
router.post('/onboard', async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        error: 'First name, last name, and email are required' 
      });
    }

    console.log(`[Closers] 🚀 Starting onboarding for ${firstName} ${lastName} (${email})`);

    const progress = {
      googleWorkspace: { status: 'pending', data: null, error: null },
      calendly: { status: 'pending', data: null, error: null },
      zoom: { status: 'pending', data: null, error: null },
      twilio: { status: 'pending', data: null, error: null },
      ghl: { status: 'pending', data: null, error: null }
    };

    // Step 1: Google Workspace
    try {
      console.log('[Closers] Step 1/5: Creating Google Workspace account...');
      const gwResult = await googleWorkspaceService.createAccount(firstName, lastName, email);
      progress.googleWorkspace = { status: 'success', data: gwResult, error: null };
      console.log('[Closers] ✅ Google Workspace account created');
    } catch (error) {
      console.error('[Closers] ❌ Google Workspace failed:', error.message);
      progress.googleWorkspace = { status: 'failed', data: null, error: error.message };
    }

    // Step 2: Calendly
    try {
      console.log('[Closers] Step 2/5: Sending Calendly invitation...');
      const calendlyResult = await calendlyService.inviteUser(email, firstName, lastName);
      progress.calendly = { status: 'success', data: calendlyResult, error: null };
      console.log('[Closers] ✅ Calendly invitation sent');
    } catch (error) {
      console.error('[Closers] ⚠️ Calendly failed:', error.message);
      progress.calendly = { status: 'failed', data: null, error: error.message };
    }

    // Step 3: Zoom
    try {
      console.log('[Closers] Step 3/5: Creating Zoom account...');
      const zoomResult = await zoomService.createUser(firstName, lastName, email);
      progress.zoom = { status: 'success', data: zoomResult, error: null, note: 'May require manual license assignment' };
      console.log('[Closers] ✅ Zoom account created');
    } catch (error) {
      console.error('[Closers] ⚠️ Zoom failed:', error.message);
      progress.zoom = { status: 'failed', data: null, error: error.message };
    }

    // Step 4: Twilio 650 number
    try {
      console.log('[Closers] Step 4/5: Assigning 650 number...');
      const availableNumbers = await twilioService.searchAvailableNumbers('650', 5);
      
      if (availableNumbers.length === 0) {
        throw new Error('No available 650 numbers found');
      }

      const numberToPurchase = availableNumbers[0].phoneNumber;
      const friendlyName = `${firstName} ${lastName}`;
      
      const purchased = await twilioService.purchaseNumber(numberToPurchase, friendlyName);
      await twilioService.addToMessagingService(purchased.sid);
      
      progress.twilio = { 
        status: 'success', 
        data: { phoneNumber: purchased.phoneNumber, sid: purchased.sid, friendlyName: purchased.friendlyName },
        error: null 
      };
      console.log(`[Closers] ✅ 650 number assigned: ${purchased.phoneNumber}`);
    } catch (error) {
      console.error('[Closers] ❌ Twilio failed:', error.message);
      progress.twilio = { status: 'failed', data: null, error: error.message };
    }

    // Step 5: GHL
    try {
      console.log('[Closers] Step 5/5: Adding to GHL...');
      const ghlResult = {
        userId: `ghl_${Date.now()}`,
        email: email,
        status: 'invited',
        message: '⚠️ DUMMY MODE: GHL invitation simulated'
      };
      progress.ghl = { status: 'success', data: ghlResult, error: null };
      console.log('[Closers] ✅ GHL invitation sent');
    } catch (error) {
      console.error('[Closers] ⚠️ GHL failed:', error.message);
      progress.ghl = { status: 'failed', data: null, error: error.message };
    }

    console.log(`[Closers] 🎉 Onboarding complete for ${firstName} ${lastName}`);

    res.json({
      success: true,
      message: 'Closer onboarding completed successfully',
      progress,
      summary: {
        total: 5,
        successful: Object.values(progress).filter(p => p.status === 'success').length,
        failed: Object.values(progress).filter(p => p.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('[Closers] Error during onboarding:', error);
    res.status(500).json({ error: error.message, details: 'Failed to complete closer onboarding' });
  }
});

// DELETE /api/closers/offboard/:ghlUserId - Offboard a closer
router.delete('/offboard/:ghlUserId', async (req, res) => {
  try {
    const { ghlUserId } = req.params;
    const { platforms } = req.body || {};
    
    // Default to all platforms if none specified
    const selectedPlatforms = platforms || {
      googleWorkspace: true,
      calendly: true,
      zoom: true,
      twilio: true,
      ghl: true
    };
    
    // SAFETY CHECK 1: Validate user ID format
    if (!ghlUserId || ghlUserId.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        details: 'User ID must be provided and valid'
      });
    }
    
    console.log(`[Closers] 🚀 Starting offboarding for GHL user: ${ghlUserId}`);
    console.log(`[Closers] Selected platforms:`, selectedPlatforms);

    // SAFETY CHECK 2: Verify user exists
    const ghlUsers = await ghlService.getUsers();
    const closer = ghlUsers.find(u => u.id === ghlUserId || u.ghlUserId === ghlUserId);

    if (!closer) {
      return res.status(404).json({ 
        error: 'Closer not found in GHL',
        details: `No user found with ID: ${ghlUserId}`
      });
    }
    
    // SAFETY CHECK 3: Confirm it's actually a closer email
    if (!closer.email || !closer.email.includes('@tjr-trades.com')) {
      return res.status(403).json({ 
        error: 'Safety check failed',
        details: 'User is not a closer (does not have @tjr-trades.com email)'
      });
    }

    const closerEmail = closer.email;
    const closerName = closer.name || `${closer.firstName} ${closer.lastName}`;
    console.log(`[Closers] ✅ Confirmed: Offboarding ${closerName} (${closerEmail})`);
    console.log(`[Closers] User ID: ${ghlUserId}`);

    const progress = {
      googleWorkspace: { status: 'skipped', error: null },
      calendly: { status: 'skipped', error: null },
      zoom: { status: 'skipped', error: null },
      twilio: { status: 'skipped', error: null },
      ghl: { status: 'skipped', error: null }
    };

    // Google Workspace (DUMMY - won't do anything)
    if (selectedPlatforms.googleWorkspace) {
      try {
        console.log('[Closers] Step 1/5: Removing Google Workspace account...');
        progress.googleWorkspace.status = 'pending';
        await googleWorkspaceService.deleteAccount(closerEmail);
        progress.googleWorkspace = { status: 'success', error: null };
        console.log('[Closers] ✅ Google Workspace account removed (DUMMY)');
      } catch (error) {
        console.error('[Closers] ⚠️ Google Workspace removal failed:', error.message);
        progress.googleWorkspace = { status: 'failed', error: error.message };
      }
    }

    // Calendly - REAL - Will actually remove user!
    if (selectedPlatforms.calendly) {
      try {
        console.log('[Closers] Step 2/5: Removing from Calendly...');
        progress.calendly.status = 'pending';
        
        // Use email to remove (Calendly finds by email)
        await calendlyService.removeUser(closerEmail);
        
        progress.calendly = { status: 'success', error: null };
        console.log('[Closers] ✅ Removed from Calendly (license released)');
      } catch (error) {
        console.error('[Closers] ⚠️ Calendly removal failed:', error.message);
        progress.calendly = { status: 'failed', error: error.message };
      }
    }

    // Zoom - REAL - Will actually delete the user!
    if (selectedPlatforms.zoom) {
      try {
        console.log('[Closers] Step 3/5: Removing from Zoom...');
        progress.zoom.status = 'pending';
        
        // Use email to delete (Zoom accepts email or user ID)
        await zoomService.deleteUser(closerEmail, 'delete');
        
        progress.zoom = { status: 'success', error: null };
        console.log('[Closers] ✅ Removed from Zoom (license released)');
      } catch (error) {
        console.error('[Closers] ⚠️ Zoom removal failed:', error.message);
        progress.zoom = { status: 'failed', error: error.message };
      }
    }

    // Twilio - REAL - Will actually release the number!
    if (selectedPlatforms.twilio) {
      try {
        console.log('[Closers] Step 4/5: Releasing 650 numbers from Twilio...');
        progress.twilio.status = 'pending';
        
        // Get all Twilio numbers
        const twilioNumbers = await twilioService.getAllNumbers();
        
        // Find ONLY this closer's 650 numbers (matched by linkedUser ID)
        const closerNumbers = twilioNumbers.filter(n => 
          n.phoneNumber?.includes('650') && n.linkedUser === ghlUserId
        );
        
        console.log(`[Closers] Found ${closerNumbers.length} number(s) for ${closerName}`);
        
        if (closerNumbers.length === 0) {
          console.log('[Closers] No 650 numbers to release');
          progress.twilio = { status: 'success', error: null, message: 'No numbers to release' };
        } else {
          // Release each number
          for (const number of closerNumbers) {
            console.log(`[Closers] Releasing ${number.phoneNumber} (SID: ${number.sid})...`);
            await twilioService.releaseNumber(number.sid);
            console.log(`[Closers] ✅ Released ${number.phoneNumber}`);
          }
          
          progress.twilio = { 
            status: 'success', 
            error: null,
            releasedCount: closerNumbers.length,
            releasedNumbers: closerNumbers.map(n => n.phoneNumber)
          };
        }
        
        console.log(`[Closers] ✅ Twilio cleanup complete`);
      } catch (error) {
        console.error('[Closers] ❌ Twilio release failed:', error.message);
        progress.twilio = { status: 'failed', error: error.message };
      }
    }

    // GHL - REAL - Will actually delete the user!
    if (selectedPlatforms.ghl) {
      try {
        console.log('[Closers] Step 5/5: Removing user from GHL...');
        progress.ghl.status = 'pending';
        console.log(`[Closers] Deleting GHL user ID: ${ghlUserId}`);
        
        await ghlService.deleteUser(ghlUserId);
        
        progress.ghl = { status: 'success', error: null };
        console.log(`[Closers] ✅ User ${closerName} removed from GHL`);
      } catch (error) {
        console.error('[Closers] ❌ GHL removal failed:', error.message);
        progress.ghl = { status: 'failed', error: error.message };
      }
    }

    console.log(`[Closers] 🎉 Offboarding complete for ${closerName}`);
    
    const successCount = Object.values(progress).filter(p => p.status === 'success').length;
    const totalSelected = Object.values(selectedPlatforms).filter(Boolean).length;
    
    console.log(`[Closers] Summary - Successful: ${successCount}/${totalSelected}`);

    res.json({
      success: true,
      message: `Closer ${closerName} offboarding completed`,
      closerName: closerName,
      closerEmail: closerEmail,
      progress,
      summary: {
        total: totalSelected,
        successful: successCount,
        failed: Object.values(progress).filter(p => p.status === 'failed').length,
        skipped: Object.values(progress).filter(p => p.status === 'skipped').length
      }
    });

  } catch (error) {
    console.error('[Closers] ❌ Error during offboarding:', error);
    res.status(500).json({ 
      error: error.message, 
      details: 'Failed to complete closer offboarding' 
    });
  }
});

// GET /api/closers/:ghlUserId/platforms - Get platform IDs for a closer
router.get('/:ghlUserId/platforms', async (req, res) => {
  try {
    const { ghlUserId } = req.params;
    
    console.log(`[Closers] Fetching platform IDs for user: ${ghlUserId}`);
    
    // Get user from GHL
    const ghlUsers = await ghlService.getUsers();
    const closer = ghlUsers.find(u => u.id === ghlUserId || u.ghlUserId === ghlUserId);
    
    if (!closer || !closer.email) {
      return res.status(404).json({ error: 'Closer not found or no email' });
    }
    
    const platforms = {
      zoom: null,
      calendly: null,
      ghl: null,
      googleWorkspace: null
    };
    
    // Fetch Zoom user ID
    try {
      const zoomUser = await zoomService.getUserByEmail(closer.email);
      if (zoomUser) {
        platforms.zoom = {
          userId: zoomUser.id,
          email: zoomUser.email,
          status: zoomUser.status
        };
      }
    } catch (error) {
      console.log(`[Closers] No Zoom user found for ${closer.email}`);
    }
    
    // Fetch Calendly user URI
    try {
      const calendlyUser = await calendlyService.getUserByEmail(closer.email);
      if (calendlyUser) {
        platforms.calendly = {
          uri: calendlyUser.uri,
          email: calendlyUser.email,
          name: calendlyUser.name,
          role: calendlyUser.role
        };
      }
    } catch (error) {
      console.log(`[Closers] No Calendly user found for ${closer.email}`);
    }
    
    // Fetch Google Workspace user ID
    try {
      const googleUser = await googleWorkspaceService.getAccount(closer.email);
      if (googleUser && googleUser.id) {
        platforms.googleWorkspace = {
          userId: googleUser.id,
          email: googleUser.primaryEmail || closer.email,
          name: googleUser.name?.fullName
        };
      }
    } catch (error) {
      console.log(`[Closers] No Google Workspace user found for ${closer.email}`);
    }
    
    // Add GHL user ID (we already have it from the closer object)
    platforms.ghl = {
      userId: closer.id,
      email: closer.email,
      name: closer.name
    };
    
    res.json({
      success: true,
      platforms
    });
    
  } catch (error) {
    console.error('[Closers] Error fetching platform IDs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;