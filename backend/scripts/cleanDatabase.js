// backend/scripts/cleanDatabase.js

const { sequelize } = require('../models');

async function cleanDatabase() {
  try {
    console.log('🧹 Cleaning up database backup tables...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection: OK');
    
    // Drop backup tables that are causing issues
    const backupTables = [
      'documents_backup',
      'categories_backup', 
      'processing_jobs_backup',
      'document_chunks_backup',
      'system_settings_backup',
      'branding_settings_backup'
    ];
    
    for (const tableName of backupTables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS ${tableName}`);
        console.log(`🗑️  Dropped backup table: ${tableName}`);
      } catch (error) {
        console.log(`ℹ️  Table ${tableName} didn't exist (OK)`);
      }
    }
    
    console.log('✅ Database cleanup completed successfully!');
    console.log('🚀 You can now restart your server');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
}

cleanDatabase();