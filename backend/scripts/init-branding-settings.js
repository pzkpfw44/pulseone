// backend/scripts/init-branding-settings.js
const { BrandingSettings, sequelize } = require('../models');

async function initializeBrandingSettings() {
  try {
    console.log('🎨 Initializing branding settings...');
    
    // Check if branding settings table exists
    await sequelize.authenticate();
    
    // Sync the BrandingSettings model
    await BrandingSettings.sync({ alter: true });
    console.log('✓ Branding settings table created/updated');
    
    // Check if there are any existing settings
    const existingSettings = await BrandingSettings.findOne({ where: { isActive: true } });
    
    if (!existingSettings) {
      // Create default charcoal branding settings for Pulse One
      const defaultSettings = await BrandingSettings.create({
        companyName: 'Pulse One',
        industry: 'Technology',
        keyValues: 'Innovation, Integrity, Excellence',
        primaryColor: '#4B5563', // charcoal-600
        secondaryColor: '#374151', // charcoal-700
        accentColor: '#6B7280', // charcoal-500
        backgroundColor: '#F9FAFB', // charcoal-50
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
      
      console.log('✓ Default charcoal branding settings created');
      console.log(`   Company: ${defaultSettings.companyName}`);
      console.log(`   Primary Color: ${defaultSettings.primaryColor}`);
      console.log(`   Secondary Color: ${defaultSettings.secondaryColor}`);
    } else {
      console.log('✓ Existing branding settings found');
      console.log(`   Company: ${existingSettings.companyName}`);
      console.log(`   Primary Color: ${existingSettings.primaryColor}`);
      console.log(`   Secondary Color: ${existingSettings.secondaryColor}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize branding settings:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeBrandingSettings()
    .then(() => {
      console.log('🎨 Branding settings initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Branding settings initialization failed:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeBrandingSettings
};