// backend/routes/branding-settings.routes.js
const express = require('express');
const router = express.Router();
const { BrandingSettings } = require('../models');

// Get current branding settings
router.get('/', async (req, res) => {
  try {
    let settings = await BrandingSettings.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    if (!settings) {
      // Create default settings if none exist
      settings = await BrandingSettings.create({
        companyName: 'Pulse One',
        industry: 'Technology',
        keyValues: 'Innovation, Integrity, Excellence',
        primaryColor: '#4B5563',
        secondaryColor: '#374151',
        accentColor: '#6B7280',
        backgroundColor: '#F9FAFB',
        communicationTone: 'professional',
        formalityLevel: 'formal',
        personality: 'helpful',
        fontFamily: 'Inter',
        brandGradientDirection: 'to-right',
        enableGradients: true,
        isActive: true
      });
    }

    res.json({
      success: true,
      data: {
        companyName: settings.companyName,
        industry: settings.industry,
        keyValues: settings.keyValues,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        backgroundColor: settings.backgroundColor,
        communicationTone: settings.communicationTone,
        formalityLevel: settings.formalityLevel,
        personality: settings.personality,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        fontFamily: settings.fontFamily,
        brandGradientDirection: settings.brandGradientDirection,
        enableGradients: settings.enableGradients,
        customCSS: settings.customCSS
      },
      lastUpdated: settings.updatedAt
    });

  } catch (error) {
    console.error('Error fetching branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branding settings'
    });
  }
});

// Update branding settings
router.put('/', async (req, res) => {
  try {
    const {
      companyName,
      industry,
      keyValues,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      communicationTone,
      formalityLevel,
      personality,
      logoUrl,
      faviconUrl,
      fontFamily,
      brandGradientDirection,
      enableGradients,
      customCSS
    } = req.body;

    // Validate color formats
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid primary color format. Use hex format like #4B5563'
      });
    }

    if (secondaryColor && !colorRegex.test(secondaryColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid secondary color format. Use hex format like #374151'
      });
    }

    if (accentColor && !colorRegex.test(accentColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid accent color format. Use hex format like #6B7280'
      });
    }

    if (backgroundColor && !colorRegex.test(backgroundColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid background color format. Use hex format like #F9FAFB'
      });
    }

    // Get current active settings
    let settings = await BrandingSettings.findOne({
      where: { isActive: true }
    });

    if (settings) {
      // Update existing settings
      await settings.update({
        companyName: companyName !== undefined ? companyName : settings.companyName,
        industry: industry !== undefined ? industry : settings.industry,
        keyValues: keyValues !== undefined ? keyValues : settings.keyValues,
        primaryColor: primaryColor !== undefined ? primaryColor : settings.primaryColor,
        secondaryColor: secondaryColor !== undefined ? secondaryColor : settings.secondaryColor,
        accentColor: accentColor !== undefined ? accentColor : settings.accentColor,
        backgroundColor: backgroundColor !== undefined ? backgroundColor : settings.backgroundColor,
        communicationTone: communicationTone !== undefined ? communicationTone : settings.communicationTone,
        formalityLevel: formalityLevel !== undefined ? formalityLevel : settings.formalityLevel,
        personality: personality !== undefined ? personality : settings.personality,
        logoUrl: logoUrl !== undefined ? logoUrl : settings.logoUrl,
        faviconUrl: faviconUrl !== undefined ? faviconUrl : settings.faviconUrl,
        fontFamily: fontFamily !== undefined ? fontFamily : settings.fontFamily,
        brandGradientDirection: brandGradientDirection !== undefined ? brandGradientDirection : settings.brandGradientDirection,
        enableGradients: enableGradients !== undefined ? enableGradients : settings.enableGradients,
        customCSS: customCSS !== undefined ? customCSS : settings.customCSS
      });
    } else {
      // Create new settings
      settings = await BrandingSettings.create({
        companyName: companyName || 'Pulse One',
        industry: industry || 'Technology',
        keyValues: keyValues || 'Innovation, Integrity, Excellence',
        primaryColor: primaryColor || '#4B5563',
        secondaryColor: secondaryColor || '#374151',
        accentColor: accentColor || '#6B7280',
        backgroundColor: backgroundColor || '#F9FAFB',
        communicationTone: communicationTone || 'professional',
        formalityLevel: formalityLevel || 'formal',
        personality: personality || 'helpful',
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        fontFamily: fontFamily || 'Inter',
        brandGradientDirection: brandGradientDirection || 'to-right',
        enableGradients: enableGradients !== undefined ? enableGradients : true,
        customCSS: customCSS || null,
        isActive: true
      });
    }

    res.json({
      success: true,
      message: 'Branding settings updated successfully',
      data: {
        companyName: settings.companyName,
        industry: settings.industry,
        keyValues: settings.keyValues,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        backgroundColor: settings.backgroundColor,
        communicationTone: settings.communicationTone,
        formalityLevel: settings.formalityLevel,
        personality: settings.personality,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        fontFamily: settings.fontFamily,
        brandGradientDirection: settings.brandGradientDirection,
        enableGradients: settings.enableGradients,
        customCSS: settings.customCSS
      },
      updatedAt: settings.updatedAt
    });

  } catch (error) {
    console.error('Error updating branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update branding settings',
      details: error.message
    });
  }
});

// Reset branding settings to default
router.post('/reset', async (req, res) => {
  try {
    // Deactivate current settings
    await BrandingSettings.update(
      { isActive: false },
      { where: { isActive: true } }
    );

    // Create new default settings
    const defaultSettings = await BrandingSettings.create({
      companyName: 'Pulse One',
      industry: 'Technology',
      keyValues: 'Innovation, Integrity, Excellence',
      primaryColor: '#4B5563',
      secondaryColor: '#374151',
      accentColor: '#6B7280',
      backgroundColor: '#F9FAFB',
      communicationTone: 'professional',
      formalityLevel: 'formal',
      personality: 'helpful',
      logoUrl: null,
      faviconUrl: null,
      fontFamily: 'Inter',
      brandGradientDirection: 'to-right',
      enableGradients: true,
      customCSS: null,
      isActive: true
    });

    res.json({
      success: true,
      message: 'Branding settings reset to default successfully',
      data: {
        companyName: defaultSettings.companyName,
        industry: defaultSettings.industry,
        keyValues: defaultSettings.keyValues,
        primaryColor: defaultSettings.primaryColor,
        secondaryColor: defaultSettings.secondaryColor,
        accentColor: defaultSettings.accentColor,
        backgroundColor: defaultSettings.backgroundColor,
        communicationTone: defaultSettings.communicationTone,
        formalityLevel: defaultSettings.formalityLevel,
        personality: defaultSettings.personality,
        logoUrl: defaultSettings.logoUrl,
        faviconUrl: defaultSettings.faviconUrl,
        fontFamily: defaultSettings.fontFamily,
        brandGradientDirection: defaultSettings.brandGradientDirection,
        enableGradients: defaultSettings.enableGradients,
        customCSS: defaultSettings.customCSS
      }
    });

  } catch (error) {
    console.error('Error resetting branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset branding settings'
    });
  }
});

// Preview branding settings (temporary application)
router.post('/preview', async (req, res) => {
  try {
    const {
      companyName,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      fontFamily,
      brandGradientDirection,
      enableGradients
    } = req.body;

    // Validate preview data (same validation as update)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid primary color format for preview'
      });
    }

    if (secondaryColor && !colorRegex.test(secondaryColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid secondary color format for preview'
      });
    }

    // Generate preview CSS variables
    const previewCSS = generatePreviewCSS({
      companyName,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      fontFamily,
      brandGradientDirection,
      enableGradients
    });

    res.json({
      success: true,
      message: 'Preview data validated',
      previewCSS,
      previewData: {
        companyName: companyName || 'Pulse One',
        primaryColor: primaryColor || '#4B5563',
        secondaryColor: secondaryColor || '#374151',
        accentColor: accentColor || '#6B7280',
        backgroundColor: backgroundColor || '#F9FAFB',
        fontFamily: fontFamily || 'Inter',
        brandGradientDirection: brandGradientDirection || 'to-right',
        enableGradients: enableGradients !== undefined ? enableGradients : true
      }
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview'
    });
  }
});

// Get branding history
router.get('/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const history = await BrandingSettings.findAll({
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      attributes: [
        'id', 'companyName', 'primaryColor', 'secondaryColor', 
        'isActive', 'createdAt', 'updatedAt'
      ]
    });

    const formattedHistory = history.map(settings => ({
      id: settings.id,
      companyName: settings.companyName,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      isActive: settings.isActive,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      isCurrentVersion: settings.isActive
    }));

    res.json({
      success: true,
      history: formattedHistory,
      count: formattedHistory.length
    });

  } catch (error) {
    console.error('Error fetching branding history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branding history'
    });
  }
});

// Export branding settings
router.get('/export', async (req, res) => {
  try {
    const settings = await BrandingSettings.findOne({
      where: { isActive: true }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'No active branding settings found'
      });
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      brandingSettings: {
        companyName: settings.companyName,
        industry: settings.industry,
        keyValues: settings.keyValues,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        backgroundColor: settings.backgroundColor,
        communicationTone: settings.communicationTone,
        formalityLevel: settings.formalityLevel,
        personality: settings.personality,
        fontFamily: settings.fontFamily,
        brandGradientDirection: settings.brandGradientDirection,
        enableGradients: settings.enableGradients,
        customCSS: settings.customCSS
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=pulse-one-branding.json');
    res.json(exportData);

  } catch (error) {
    console.error('Error exporting branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export branding settings'
    });
  }
});

// Import branding settings
router.post('/import', async (req, res) => {
  try {
    const { brandingSettings } = req.body;

    if (!brandingSettings) {
      return res.status(400).json({
        success: false,
        error: 'No branding settings data provided'
      });
    }

    // Validate imported data
    const requiredFields = ['companyName', 'primaryColor', 'secondaryColor'];
    const missingFields = requiredFields.filter(field => !brandingSettings[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate color formats
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const colorFields = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor'];
    
    for (const field of colorFields) {
      if (brandingSettings[field] && !colorRegex.test(brandingSettings[field])) {
        return res.status(400).json({
          success: false,
          error: `Invalid ${field} format. Use hex format like #4B5563`
        });
      }
    }

    // Deactivate current settings
    await BrandingSettings.update(
      { isActive: false },
      { where: { isActive: true } }
    );

    // Create new settings from import
    const importedSettings = await BrandingSettings.create({
      ...brandingSettings,
      isActive: true
    });

    res.json({
      success: true,
      message: 'Branding settings imported successfully',
      data: {
        companyName: importedSettings.companyName,
        industry: importedSettings.industry,
        keyValues: importedSettings.keyValues,
        primaryColor: importedSettings.primaryColor,
        secondaryColor: importedSettings.secondaryColor,
        accentColor: importedSettings.accentColor,
        backgroundColor: importedSettings.backgroundColor,
        communicationTone: importedSettings.communicationTone,
        formalityLevel: importedSettings.formalityLevel,
        personality: importedSettings.personality,
        fontFamily: importedSettings.fontFamily,
        brandGradientDirection: importedSettings.brandGradientDirection,
        enableGradients: importedSettings.enableGradients,
        customCSS: importedSettings.customCSS
      }
    });

  } catch (error) {
    console.error('Error importing branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import branding settings',
      details: error.message
    });
  }
});

// Helper function to generate preview CSS
function generatePreviewCSS(settings) {
  return `
    :root {
      --primary-color: ${settings.primaryColor || '#4B5563'};
      --secondary-color: ${settings.secondaryColor || '#374151'};
      --accent-color: ${settings.accentColor || '#6B7280'};
      --background-color: ${settings.backgroundColor || '#F9FAFB'};
      --brand-primary: ${settings.primaryColor || '#4B5563'};
      --brand-secondary: ${settings.secondaryColor || '#374151'};
      --font-family: ${settings.fontFamily || 'Inter'}, system-ui, -apple-system, sans-serif;
    }
    
    ${settings.enableGradients ? `
    .bg-brand-gradient {
      background: linear-gradient(${settings.brandGradientDirection || 'to-right'}, var(--primary-color), var(--secondary-color)) !important;
    }
    ` : ''}
  `.trim();
}

module.exports = router;