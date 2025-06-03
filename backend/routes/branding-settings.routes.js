// backend/routes/branding-settings.routes.js
const express = require('express');
const router = express.Router();
const { BrandingSettings } = require('../models');

// Get current branding settings
router.get('/', async (req, res) => {
  try {
    let settings = await BrandingSettings.findOne({ where: { isActive: true } });
    
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
        id: settings.id,
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
        customCSS: settings.customCSS,
        isActive: settings.isActive,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branding settings',
      details: error.message
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

    // Validate required fields
    if (!primaryColor || !secondaryColor) {
      return res.status(400).json({
        success: false,
        error: 'Primary and secondary colors are required'
      });
    }

    // Validate color format
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(primaryColor) || !colorRegex.test(secondaryColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid color format. Colors must be in hex format (e.g., #FF0000)'
      });
    }

    if (accentColor && !colorRegex.test(accentColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid accent color format'
      });
    }

    if (backgroundColor && !colorRegex.test(backgroundColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid background color format'
      });
    }

    // Get current active settings
    let settings = await BrandingSettings.findOne({ where: { isActive: true } });
    
    const updateData = {
      companyName: companyName || settings?.companyName || 'Pulse One',
      industry: industry || settings?.industry || 'Technology',
      keyValues: keyValues || settings?.keyValues || 'Innovation, Integrity, Excellence',
      primaryColor,
      secondaryColor,
      accentColor: accentColor || settings?.accentColor || '#6B7280',
      backgroundColor: backgroundColor || settings?.backgroundColor || '#F9FAFB',
      communicationTone: communicationTone || settings?.communicationTone || 'professional',
      formalityLevel: formalityLevel || settings?.formalityLevel || 'formal',
      personality: personality || settings?.personality || 'helpful',
      logoUrl: logoUrl || settings?.logoUrl || null,
      faviconUrl: faviconUrl || settings?.faviconUrl || null,
      fontFamily: fontFamily || settings?.fontFamily || 'Inter',
      brandGradientDirection: brandGradientDirection || settings?.brandGradientDirection || 'to-right',
      enableGradients: enableGradients !== undefined ? enableGradients : (settings?.enableGradients || true),
      customCSS: customCSS || settings?.customCSS || null,
      isActive: true
    };

    if (settings) {
      // Update existing settings
      await settings.update(updateData);
    } else {
      // Create new settings
      settings = await BrandingSettings.create(updateData);
    }

    res.json({
      success: true,
      message: 'Branding settings updated successfully',
      data: {
        id: settings.id,
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
        customCSS: settings.customCSS,
        updatedAt: settings.updatedAt
      }
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
    let settings = await BrandingSettings.findOne({ where: { isActive: true } });
    
    const defaultSettings = {
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
    };

    if (settings) {
      await settings.update(defaultSettings);
    } else {
      settings = await BrandingSettings.create(defaultSettings);
    }

    res.json({
      success: true,
      message: 'Branding settings reset to default successfully',
      data: {
        id: settings.id,
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
        customCSS: settings.customCSS,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error resetting branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset branding settings',
      details: error.message
    });
  }
});

// Preview branding settings (without saving)
router.post('/preview', async (req, res) => {
  try {
    const {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      fontFamily,
      brandGradientDirection,
      enableGradients,
      customCSS
    } = req.body;

    // Create a temporary settings object for preview
    const previewSettings = {
      primaryColor: primaryColor || '#4B5563',
      secondaryColor: secondaryColor || '#374151',
      accentColor: accentColor || '#6B7280',
      backgroundColor: backgroundColor || '#F9FAFB',
      fontFamily: fontFamily || 'Inter',
      brandGradientDirection: brandGradientDirection || 'to-right',
      enableGradients: enableGradients !== undefined ? enableGradients : true,
      customCSS: customCSS || ''
    };

    // Generate CSS for preview
    const css = `
      :root {
        --primary-color: ${previewSettings.primaryColor};
        --secondary-color: ${previewSettings.secondaryColor};
        --accent-color: ${previewSettings.accentColor};
        --background-color: ${previewSettings.backgroundColor};
        --brand-primary: ${previewSettings.primaryColor};
        --brand-secondary: ${previewSettings.secondaryColor};
        --font-family: '${previewSettings.fontFamily}', system-ui, -apple-system, sans-serif;
      }
      
      .bg-brand-primary { background-color: ${previewSettings.primaryColor} !important; }
      .bg-brand-secondary { background-color: ${previewSettings.secondaryColor} !important; }
      .text-brand-primary { color: ${previewSettings.primaryColor} !important; }
      .text-brand-secondary { color: ${previewSettings.secondaryColor} !important; }
      .border-brand-primary { border-color: ${previewSettings.primaryColor} !important; }
      .border-brand-secondary { border-color: ${previewSettings.secondaryColor} !important; }
      
      ${previewSettings.enableGradients ? `
      .bg-brand-gradient {
        background: linear-gradient(${previewSettings.brandGradientDirection}, ${previewSettings.primaryColor}, ${previewSettings.secondaryColor}) !important;
      }
      ` : ''}
      
      ${previewSettings.customCSS || ''}
    `;

    res.json({
      success: true,
      data: {
        settings: previewSettings,
        css: css
      }
    });
  } catch (error) {
    console.error('Error generating branding preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate branding preview',
      details: error.message
    });
  }
});

module.exports = router;