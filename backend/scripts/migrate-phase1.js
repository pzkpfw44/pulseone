// backend/scripts/migrate-phase1.js
// Run this script with: node scripts/migrate-phase1.js

const { sequelize } = require('../models');

async function migrateToPhase1() {
  try {
    console.log('🚀 Starting Phase 1 database migration...');
    
    // Check if columns already exist
    const [results] = await sequelize.query(`
      PRAGMA table_info(ai_generation_history);
    `);
    
    const columnNames = results.map(row => row.name);
    const hasTemplateSpecificData = columnNames.includes('templateSpecificData');
    const hasConsultantFeatures = columnNames.includes('consultantFeatures');
    
    if (hasTemplateSpecificData && hasConsultantFeatures) {
      console.log('✅ Phase 1 columns already exist. Migration not needed.');
      return;
    }
    
    // Add missing columns
    if (!hasTemplateSpecificData) {
      console.log('📝 Adding templateSpecificData column...');
      await sequelize.query(`
        ALTER TABLE ai_generation_history 
        ADD COLUMN templateSpecificData TEXT;
      `);
    }
    
    if (!hasConsultantFeatures) {
      console.log('📝 Adding consultantFeatures column...');
      await sequelize.query(`
        ALTER TABLE ai_generation_history 
        ADD COLUMN consultantFeatures TEXT;
      `);
    }
    
    // Update existing records
    console.log('🔄 Updating existing records...');
    await sequelize.query(`
      UPDATE ai_generation_history 
      SET 
        templateSpecificData = COALESCE(templateSpecificData, '{}'), 
        consultantFeatures = COALESCE(consultantFeatures, '{}');
    `);
    
    console.log('✅ Phase 1 migration completed successfully!');
    
    // Verify the migration
    const [updatedResults] = await sequelize.query(`
      PRAGMA table_info(ai_generation_history);
    `);
    console.log('📋 Updated table structure:');
    updatedResults.forEach(row => {
      if (row.name.includes('templateSpecificData') || row.name.includes('consultantFeatures')) {
        console.log(`   ✓ ${row.name} (${row.type})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
migrateToPhase1()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });