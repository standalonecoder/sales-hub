import express from 'express';
import * as calendlyService from '../services/calendlyService.js';

const router = express.Router();

router.get('/user', async (req, res) => {
  try {
    const user = await calendlyService.getCurrentUser();
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/organization', async (req, res) => {
  try {
    const org = await calendlyService.getOrganization();
    res.json({ organization: org });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/members', async (req, res) => {
  try {
    const members = await calendlyService.getOrganizationMembers();
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    await calendlyService.getCurrentUser();
    res.json({ status: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

export default router;