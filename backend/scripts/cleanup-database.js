// backend/scripts/cleanup-database.js
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Create a fresh sequelize instance for this script
const dbPath = path.join(__dirname, '../data/pulse_one.db');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

async function cleanupAndRebuildDatabase() {
  try {
    console.log('🧹 Starting database cleanup and rebuild...');
    console.log('📋 Database location:', dbPath);
    
    // Check if database file exists
    if (fs.existsSync(dbPath)) {
      console.log('📁 Database file found, checking for backup tables...');
      
      try {
        // Connect and inspect the database
        await sequelize.authenticate();
        
        // Check for backup tables and drop them
        const [results] = await sequelize.query(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name LIKE '%_backup%';
        `);
        
        if (results.length > 0) {
          console.log('🗑️  Found backup tables:', results.map(r => r.name));
          
          // Disable foreign keys
          await sequelize.query('PRAGMA foreign_keys = OFF;');
          
          // Drop all backup tables
          for (const table of results) {
            console.log(`   Dropping backup table: ${table.name}`);
            await sequelize.query(`DROP TABLE IF EXISTS \`${table.name}\`;`);
          }
          
          // Re-enable foreign keys
          await sequelize.query('PRAGMA foreign_keys = ON;');
          console.log('✅ Backup tables cleaned up');
        }
        
        // Check current tables
        const [currentTables] = await sequelize.query(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%';
        `);
        console.log('📊 Current tables:', currentTables.map(t => t.name));
        
        // Close connection before backing up
        await sequelize.close();
        
      } catch (inspectionError) {
        console.log('⚠️  Database appears corrupted, will recreate');
        await sequelize.close();
      }
    }
    
    // Backup and recreate (safest option)
    await backupAndRecreate();
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

async function backupAndRecreate() {
  try {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = dbPath.replace('.db', `_backup_${timestamp}.db`);
    
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log('💾 Database backed up to:', backupPath);
      
      // Remove original
      fs.unlinkSync(dbPath);
      console.log('🗑️  Original database removed');
    }
    
    // Recreate database with fresh schema
    console.log('🏗️  Creating fresh database...');
    
    // Create a new sequelize instance for the fresh database
    const freshSequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false
    });
    
    // Connect to new database
    await freshSequelize.authenticate();
    console.log('🔌 Connected to new database');
    
    // Import and define models for the fresh database
    const models = await createModels(freshSequelize);
    
    // Force sync to create all tables fresh
    await freshSequelize.sync({ force: true });
    console.log('✅ Database schema created successfully');
    
    // Initialize default data
    await initializeDefaultCategories(models.Category);
    console.log('📂 Default categories initialized');
    
    await initializeDefaultBrandingSettings(models.BrandingSettings);
    console.log('🎨 Default branding settings initialized');
    
    // Close the connection
    await freshSequelize.close();
    
    console.log('🎉 Database cleanup and rebuild completed successfully!');
    console.log('💡 Your old data has been backed up to:', backupPath);
    
  } catch (error) {
    console.error('❌ Backup and recreate failed:', error);
    throw error;
  }
}

// Define models for this script
async function createModels(sequelize) {
  const { DataTypes } = require('sequelize');
  
  // Document model
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isLegacy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('uploaded', 'processing', 'processed', 'error'),
      defaultValue: 'uploaded'
    },
    processingStage: {
      type: DataTypes.STRING,
      defaultValue: 'uploaded'
    },
    processingMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'pattern-based'
    },
    processingReasoning: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    useAiProcessing: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    userTags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    aiGeneratedTags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    uploadedBy: {
      type: DataTypes.STRING,
      defaultValue: 'system'
    },
    embedding: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    embeddingModel: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'text-embedding-ada-002'
    },
    lastEmbeddingUpdate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'documents',
    timestamps: true
  });

  // Category model
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.ENUM('static', 'dynamic'),
      defaultValue: 'static'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    aiSuggested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    embedding: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    synonyms: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    relatedCategories: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'categories',
    timestamps: true
  });

  // BrandingSettings model
  const BrandingSettings = sequelize.define('BrandingSettings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Pulse One'
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Technology'
    },
    keyValues: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'Innovation, Integrity, Excellence'
    },
    primaryColor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '#4B5563',
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    secondaryColor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '#374151',
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    accentColor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#6B7280',
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    backgroundColor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#F9FAFB',
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    communicationTone: {
      type: DataTypes.ENUM('professional', 'friendly', 'casual', 'formal'),
      defaultValue: 'professional'
    },
    formalityLevel: {
      type: DataTypes.ENUM('very_formal', 'formal', 'neutral', 'informal', 'very_informal'),
      defaultValue: 'formal'
    },
    personality: {
      type: DataTypes.ENUM('helpful', 'enthusiastic', 'direct', 'empathetic', 'authoritative'),
      defaultValue: 'helpful'
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    faviconUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fontFamily: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Inter'
    },
    brandGradientDirection: {
      type: DataTypes.ENUM('to-right', 'to-left', 'to-bottom', 'to-top'),
      defaultValue: 'to-right'
    },
    enableGradients: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    customCSS: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'branding_settings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['isActive'],
        where: { isActive: true }
      }
    ]
  });

  // SystemSetting model
  const SystemSetting = sequelize.define('SystemSetting', {
    key: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    value: {
      type: DataTypes.JSON,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'general'
    }
  }, {
    tableName: 'system_settings',
    timestamps: true
  });

  // Other models would go here...
  // For now, we'll just include the essential ones

  return {
    Document,
    Category,
    BrandingSettings,
    SystemSetting
  };
}

// Initialize default categories
async function initializeDefaultCategories(Category) {
  const defaultCategories = [
    { 
      name: 'policies_procedures', 
      type: 'static', 
      description: 'Company policies and procedures',
      synonyms: ['policy', 'procedure', 'guideline', 'rule']
    },
    { 
      name: 'job_frameworks', 
      type: 'static', 
      description: 'Job descriptions and frameworks',
      synonyms: ['job description', 'role', 'position', 'framework']
    },
    { 
      name: 'training_materials', 
      type: 'static', 
      description: 'Training and learning resources',
      synonyms: ['training', 'learning', 'education', 'development']
    },
    { 
      name: 'compliance_documents', 
      type: 'static', 
      description: 'Compliance and regulatory documents',
      synonyms: ['compliance', 'regulation', 'legal', 'audit']
    },
    { 
      name: 'legacy_assessment_data', 
      type: 'static', 
      description: 'Historical assessment information',
      synonyms: ['assessment', 'evaluation', 'legacy', 'historical']
    },
    { 
      name: 'legacy_survey_data', 
      type: 'static', 
      description: 'Historical survey data',
      synonyms: ['survey', 'questionnaire', 'feedback', 'legacy']
    },
    { 
      name: 'organizational_guidelines', 
      type: 'static', 
      description: 'Organizational guidelines and standards',
      synonyms: ['organizational', 'guideline', 'standard', 'process']
    }
  ];

  for (const category of defaultCategories) {
    await Category.findOrCreate({
      where: { name: category.name },
      defaults: category
    });
  }
}

// Initialize default branding settings
async function initializeDefaultBrandingSettings(BrandingSettings) {
  const existingSettings = await BrandingSettings.findOne({ where: { isActive: true } });
  
  if (!existingSettings) {
    await BrandingSettings.create({
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
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupAndRebuildDatabase()
    .then(() => {
      console.log('✨ Cleanup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupAndRebuildDatabase };