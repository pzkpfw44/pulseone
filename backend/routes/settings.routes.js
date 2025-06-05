// backend/routes/settings.routes.js
const express = require('express');
const router = express.Router();

// General settings endpoints
router.get('/', async (req, res) => {
  try {
    const { SystemSetting } = require('../models');
    
    const settings = await SystemSetting.findAll({
      where: { category: 'general' }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json({
      success: true,
      settings: settingsObj
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

// Update general settings
router.put('/', async (req, res) => {
  try {
    const { SystemSetting } = require('../models');
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      await SystemSetting.upsert({
        key,
        value,
        category: 'general'
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// System status endpoint
router.get('/status', async (req, res) => {
  try {
    const { Document, DocumentChunk, Conversation } = require('../models');
    
    const stats = {
      totalDocuments: await Document.count(),
      processedDocuments: await Document.count({ where: { status: 'processed' } }),
      totalChunks: await DocumentChunk.count(),
      totalConversations: await Conversation.count(),
      systemHealth: 'operational'
    };

    res.json({
      success: true,
      status: stats
    });

  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system status'
    });
  }
});

module.exports = router;