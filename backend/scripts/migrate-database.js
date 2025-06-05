// backend/scripts/migrate-database.js
const { sequelize } = require('../models');

async function migrateDatabaseSafely() {
  try {
    console.log('Starting safe database migration...');
    
    // Check if we're using SQLite
    if (sequelize.getDialect() === 'sqlite') {
      // Disable foreign key constraints
      await sequelize.query('PRAGMA foreign_keys = OFF;');
      console.log('Foreign key constraints disabled');
    }
    
    // Perform the sync
    await sequelize.sync({ alter: true });
    console.log('Database schema updated successfully');
    
    // Re-enable foreign key constraints
    if (sequelize.getDialect() === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = ON;');
      console.log('Foreign key constraints re-enabled');
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    
    // Ensure foreign keys are re-enabled even on error
    if (sequelize.getDialect() === 'sqlite') {
      try {
        await sequelize.query('PRAGMA foreign_keys = ON;');
      } catch (pragmaError) {
        console.error('Error re-enabling foreign keys:', pragmaError);
      }
    }
    
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDatabaseSafely()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabaseSafely };