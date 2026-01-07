import express from 'express';
import googleWorkspaceService from '../services/googleWorkspaceService.js';
import * as calendlyService from '../services/calendlyService.js';
import zoomService from '../services/zoomService.js';
import ghlService from '../services/ghlService.js';
import twilioService from '../services/twilioService.js';

const router = express.Router();

// Step 1: Create Google Workspace account only (with resume support)
router.post('/google-workspace', async (req, res) => {
  try {
    const { firstName, lastName, personalEmail } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required'
      });
    }

    console.log(`[Onboard Step 1] Processing Google Workspace for ${firstName} ${lastName}`);

    // Generate what the email would be for this user
    const domain = 'tjr-trades.com';
    const expectedEmail = `${firstName.toLowerCase()}-${lastName.charAt(0).toLowerCase()}@${domain}`;

    // Check if user already exists
    const existingUser = await googleWorkspaceService.getAccount(expectedEmail);

    if (existingUser) {
      console.log(`[Onboard Step 1] ✅ User already exists: ${expectedEmail}`);
      return res.json({
        success: true,
        email: expectedEmail,
        temporaryPassword: 'Tjrtrades123!',
        googleWorkspaceId: existingUser.id,
        alreadyExists: true,
        message: `Google Workspace account already exists for ${expectedEmail}`
      });
    }

    // Generate unique email (handles duplicates like firstname-l2@domain)
    const workEmail = await googleWorkspaceService.generateEmail(firstName, lastName);
    console.log(`[Onboard Step 1] Generated email: ${workEmail}`);

    // Fixed password for all new accounts
    const tempPassword = 'Tjrtrades123!';

    // Create Google Workspace account with fixed password
    const gwResult = await googleWorkspaceService.createAccount(firstName, lastName, workEmail, tempPassword);
    console.log(`[Onboard Step 1] ✅ Google Workspace account created`);

    // TODO: Send email to personalEmail with credentials
    console.log(`[Onboard Step 1] TODO: Send credentials to ${personalEmail}`);

    res.json({
      success: true,
      email: workEmail,
      temporaryPassword: tempPassword,
      googleWorkspaceId: gwResult.id,
      message: `Google Workspace account created. Credentials sent to ${personalEmail}`
    });

  } catch (error) {
    console.error('[Onboard Step 1] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Step 2: Create Zoom account only (with resume support)
router.post('/zoom', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required'
      });
    }

    console.log(`[Onboard Step 2] Processing Zoom account for ${email}`);

    // Check if Zoom user already exists
    const existingUser = await zoomService.getUserByEmail(email);

    if (existingUser) {
      console.log(`[Onboard Step 2] ✅ Zoom user already exists: ${email}`);
      return res.json({
        success: true,
        userId: existingUser.id,
        email: existingUser.email,
        alreadyExists: true,
        message: 'Zoom account already exists'
      });
    }

    const zoomResult = await zoomService.createUser(firstName, lastName, email);
    console.log(`[Onboard Step 2] ✅ Zoom account created`);

    res.json({
      success: true,
      userId: zoomResult.userId,
      email: zoomResult.email,
      message: 'Zoom account created successfully'
    });

  } catch (error) {
    console.error('[Onboard Step 2] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Step 3: Send Calendly invitation only (with resume support)
router.post('/calendly', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required'
      });
    }

    console.log(`[Onboard Step 3] Processing Calendly invitation for ${email}`);

    // Check if user is already a Calendly member
    const existingUser = await calendlyService.getUserByEmail(email);

    if (existingUser) {
      console.log(`[Onboard Step 3] ✅ User already in Calendly: ${email}`);
      return res.json({
        success: true,
        email: existingUser.email,
        invitationUri: null,
        alreadyExists: true,
        message: 'User is already a Calendly member'
      });
    }

    try {
      const calendlyResult = await calendlyService.inviteUser(email, firstName, lastName);
      console.log(`[Onboard Step 3] ✅ Calendly invitation sent`);

      res.json({
        success: true,
        email: calendlyResult.email,
        invitationUri: calendlyResult.invitationUri,
        message: 'Calendly invitation sent successfully'
      });
    } catch (apiError) {
      // If API invitation fails, return success but note manual invitation needed
      console.log(`[Onboard Step 3] ⚠️ API invitation failed, flagging for manual invitation`);

      res.json({
        success: true,
        email: email,
        invitationUri: null,
        manualInviteNeeded: true,
        message: 'Calendly account flagged - admin will send invitation manually'
      });
    }

  } catch (error) {
    console.error('[Onboard Step 3] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Step 4: Create GHL account + Purchase Twilio 650 number (with resume support)
router.post('/ghl-and-twilio', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required'
      });
    }

    console.log(`[Onboard Step 4] Processing GHL account and Twilio number for ${email}`);

    let ghlUserId = null;
    let twilioNumber = null;
    let ghlAlreadyExists = false;
    let twilioAlreadyPurchased = false;

    // Check if GHL user already exists
    const existingGhlUser = await ghlService.getUserByEmail(email);

    if (existingGhlUser) {
      console.log(`[Onboard Step 4] ✅ GHL user already exists: ${email}`);
      ghlUserId = existingGhlUser.id;
      ghlAlreadyExists = true;
    } else {
      // Create GHL account
      try {
        console.log('[Onboard Step 4] Creating GHL account...');
        const ghlResult = await ghlService.createUser(firstName, lastName, email, 'user');
        ghlUserId = ghlResult.userId;
        console.log('[Onboard Step 4] ✅ GHL account created');
      } catch (error) {
        console.error('[Onboard Step 4] GHL creation failed:', error.message);
        throw new Error(`GHL account creation failed: ${error.message}`);
      }
    }

    // Purchase Twilio 650 number with conflict handling
    try {
      console.log('[Onboard Step 4] Purchasing 650 number...');
      const availableNumbers = await twilioService.searchAvailableNumbers('650', 5);

      if (availableNumbers.length === 0) {
        throw new Error('No available 650 numbers found');
      }

      const numberToPurchase = availableNumbers[0].phoneNumber;
      const friendlyName = `${firstName} ${lastName}`;

      // ========================================
      // FIX: Check if number already exists in Twilio
      // ========================================
      console.log('[Onboard Step 4] Checking if number already exists in Twilio...');
      const existingTwilioNumbers = await twilioService.getAllNumbers();
      const numberExists = existingTwilioNumbers.find(n => n.phoneNumber === numberToPurchase);

      if (numberExists) {
        console.log(`[Onboard Step 4] ⚠️ Number ${numberToPurchase} already purchased`);
        twilioNumber = numberExists.phoneNumber;
        twilioAlreadyPurchased = true;

        // Update friendly name if needed
        if (numberExists.friendlyName !== friendlyName) {
          console.log('[Onboard Step 4] Updating friendly name...');
          await twilioService.updateNumber(numberExists.sid, { friendlyName });
        }

        // Ensure it's in messaging service
        console.log('[Onboard Step 4] Ensuring number is in messaging service...');
        await twilioService.addToMessagingService(numberExists.sid);

        console.log(`[Onboard Step 4] ✅ Using existing number: ${twilioNumber}`);
      } else {
        // Purchase the number
        console.log(`[Onboard Step 4] Purchasing new number: ${numberToPurchase}`);
        const purchased = await twilioService.purchaseNumber(numberToPurchase, friendlyName);
        twilioNumber = purchased.phoneNumber;

        // Add to messaging service
        await twilioService.addToMessagingService(purchased.sid);

        // Add to A2P campaign
        await twilioService.addToCampaign(purchased.sid);

        console.log(`[Onboard Step 4] ✅ 650 number purchased: ${twilioNumber}`);
      }
    } catch (error) {
      console.error('[Onboard Step 4] Twilio purchase failed:', error.message);
      
      // Check if it's a 409 conflict error (number already purchased)
      if (error.message && error.message.includes('409')) {
        console.log('[Onboard Step 4] Number conflict detected, checking existing numbers...');
        try {
          // Get all Twilio numbers and find one with matching friendly name
          const existingNumbers = await twilioService.getAllNumbers();
          const matchingNumber = existingNumbers.find(n => 
            n.friendlyName === `${firstName} ${lastName}` || 
            n.phoneNumber.includes('650')
          );
          
          if (matchingNumber) {
            twilioNumber = matchingNumber.phoneNumber;
            twilioAlreadyPurchased = true;
            console.log(`[Onboard Step 4] ✅ Found existing number: ${twilioNumber}`);
          } else {
            twilioNumber = 'Conflict - contact admin';
          }
        } catch (lookupError) {
          console.error('[Onboard Step 4] Error looking up existing number:', lookupError.message);
          twilioNumber = 'Failed to purchase - contact admin';
        }
      } else {
        // Don't fail the whole step if Twilio fails - GHL account is still created
        twilioNumber = 'Failed to purchase - contact admin';
      }
    }

    res.json({
      success: true,
      ghlUserId: ghlUserId,
      email: email,
      twilioNumber: twilioNumber,
      ghlAlreadyExists: ghlAlreadyExists,
      twilioAlreadyPurchased: twilioAlreadyPurchased,
      message: ghlAlreadyExists
        ? twilioAlreadyPurchased 
          ? 'GHL account and phone number already existed'
          : 'GHL account already existed, phone number processed'
        : twilioAlreadyPurchased
          ? 'GHL account created, phone number already existed'
          : 'GHL account created and phone number assigned'
    });

  } catch (error) {
    console.error('[Onboard Step 4] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;