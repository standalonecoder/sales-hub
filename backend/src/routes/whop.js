import express from 'express';
import whopService from '../services/whopService.js';

const router = express.Router();

// GET /api/whop/closer-links - Get all closer links grouped by closer
router.get('/closer-links', async (req, res) => {
  try {
    console.log('[Whop API] Fetching closer links...');
    const groupedLinks = await whopService.getCloserLinksGrouped();

    res.json({
      success: true,
      data: groupedLinks,
      count: groupedLinks.length
    });
  } catch (error) {
    console.error('[Whop API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/whop/closer-links-by-product - Get closer links grouped by product
router.get('/closer-links-by-product', async (req, res) => {
  try {
    console.log('[Whop API] Fetching closer links by product...');
    const productData = await whopService.getCloserLinksGroupedByProduct();

    res.json({
      success: true,
      data: productData,
      count: productData.length
    });
  } catch (error) {
    console.error('[Whop API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/whop/closer-links/:email - Get links for specific closer
router.get('/closer-links/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[Whop API] Fetching links for closer: ${email}`);

    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout after 25 seconds')), 25000)
    );
    
    const linksPromise = whopService.getLinksForCloser(email);
    
    const links = await Promise.race([linksPromise, timeoutPromise]);

    res.json({
      success: true,
      data: links,
      count: links.length
    });
  } catch (error) {
    console.error('[Whop API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/whop/closer-links/:email - Delete all links for a closer
router.delete('/closer-links/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[Whop API] Deleting all links for closer: ${email}`);

    const result = await whopService.deleteLinksForCloser(email);

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} links for ${email}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('[Whop API] Delete error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;