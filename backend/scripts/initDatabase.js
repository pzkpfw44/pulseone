// backend/scripts/initDatabase.js
const path = require('path');
const fs = require('fs').promises;
const { sequelize, initializeDatabase } = require('../models');

async function setupDirectories() {
  const directories = [
    path.join(__dirname, '../data'),
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../temp')
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error);
    }
  }
}

async function setupDatabase() {
  try {
    console.log('🗄️  Initializing database...');
    
    // Initialize database and models
    await initializeDatabase();
    
    // Verify tables exist
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('✓ Database tables created:', tables);
    
    // Check if we need to seed initial data
    const { Category, SystemSetting } = require('../models');
    
    const categoryCount = await Category.count();
    console.log(`✓ Found ${categoryCount} categories`);
    
    // Add initial system settings
    await SystemSetting.findOrCreate({
      where: { key: 'knowledge_feed_settings' },
      defaults: {
        key: 'knowledge_feed_settings',
        value: {
          maxFileSize: 104857600, // 100MB
          warningFileSize: 52428800, // 50MB
          enableAiCategorization: true,
          maxDynamicCategories: 7,
          autoProcessing: true
        },
        category: 'knowledge_feed'
      }
    });

    await SystemSetting.findOrCreate({
      where: { key: 'ai_configuration' },
      defaults: {
        key: 'ai_configuration',
        value: {
          fluxApiKey: '',
          model: 'DeepSeek R1 Distill Qwen 32B',
          temperature: 0.7,
          maxTokens: 2000,
          enableSafetyFilters: true,
          enableBiasDetection: true,
          enableContentModeration: true
        },
        category: 'ai'
      }
    });

    await SystemSetting.findOrCreate({
      where: { key: 'processing_settings' },
      defaults: {
        key: 'processing_settings',
        value: {
          queueConcurrency: 3,
          processingTimeout: 300000, // 5 minutes
          retryAttempts: 3,
          enableParallelProcessing: true
        },
        category: 'processing'
      }
    });

    console.log('✓ System settings initialized');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function verifySetup() {
  try {
    console.log('🔍 Verifying setup...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
    
    // Check required models
    const { Document, Category, ProcessingJob, SystemSetting } = require('../models');
    
    const models = [
      { name: 'Document', model: Document },
      { name: 'Category', model: Category },
      { name: 'ProcessingJob', model: ProcessingJob },
      { name: 'SystemSetting', model: SystemSetting }
    ];

    for (const { name, model } of models) {
      const count = await model.count();
      console.log(`✓ ${name} model working (${count} records)`);
    }
    
    // Check directories
    const directories = [
      path.join(__dirname, '../data'),
      path.join(__dirname, '../uploads'),
      path.join(__dirname, '../logs')
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
        console.log(`✓ Directory accessible: ${dir}`);
      } catch (error) {
        console.log(`⚠️  Directory not accessible: ${dir}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Setup verification failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Pulse One database initialization...\n');
  
  try {
    await setupDirectories();
    console.log('');
    
    await setupDatabase();
    console.log('');
    
    await verifySetup();
    console.log('');
    
    console.log('✅ Pulse One database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env file with your configuration');
    console.log('2. Start the server with: npm run dev');
    console.log('3. Upload your first document in the Knowledge Feed');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run initialization if called directly
if (require.main === module) {
  main();
}

module.exports = {
  setupDirectories,
  setupDatabase,
  verifySetup
};