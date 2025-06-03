// backend/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/pulse_one.db'),
  logging: false
});

// Initialize database
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Create tables
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    // Initialize default categories
    await initializeDefaultCategories();
    console.log('Default categories initialized.');

    // Initialize default branding settings
    await initializeDefaultBrandingSettings();
    console.log('Default branding settings initialized.');

  } catch (error) {
    console.error('Unable to connect to database:', error);
  }
}

// Add this new function
async function initializeDefaultBrandingSettings() {
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
  userTags: {
    type: DataTypes.JSON,
    defaultValue: []
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
  }
}, {
  tableName: 'documents',
  timestamps: true
});

// Category model for dynamic categorization
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
  }
}, {
  tableName: 'categories',
  timestamps: true
});

// Processing Job model for queue management
const ProcessingJob = sequelize.define('ProcessingJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Document,
      key: 'id'
    }
  },
  jobType: {
    type: DataTypes.ENUM('text_extraction', 'categorization', 'tagging', 'embedding'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
    defaultValue: 'queued'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  result: {
    type: DataTypes.JSON,
    allowNull: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'processing_jobs',
  timestamps: true
});

// System Settings model
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

// Define associations
Document.hasMany(ProcessingJob, { foreignKey: 'documentId', as: 'processingJobs' });
ProcessingJob.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

// Initialize database
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Create tables
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    // Initialize default categories
    await initializeDefaultCategories();
    console.log('Default categories initialized.');

  } catch (error) {
    console.error('Unable to connect to database:', error);
  }
}

// Initialize default categories
async function initializeDefaultCategories() {
  const defaultCategories = [
    { name: 'policies_procedures', type: 'static', description: 'Company policies and procedures' },
    { name: 'job_frameworks', type: 'static', description: 'Job descriptions and frameworks' },
    { name: 'training_materials', type: 'static', description: 'Training and learning resources' },
    { name: 'compliance_documents', type: 'static', description: 'Compliance and regulatory documents' },
    { name: 'legacy_assessment_data', type: 'static', description: 'Historical assessment information' },
    { name: 'legacy_survey_data', type: 'static', description: 'Historical survey data' },
    { name: 'organizational_guidelines', type: 'static', description: 'Organizational guidelines and standards' }
  ];

  for (const category of defaultCategories) {
    await Category.findOrCreate({
      where: { name: category.name },
      defaults: category
    });
  }
}

// Add this to your existing backend/models/index.js file

// Branding Settings model (add this after your other models)
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
    defaultValue: '#4B5563', // charcoal-600
    validate: {
      is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    }
  },
  secondaryColor: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#374151', // charcoal-700
    validate: {
      is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    }
  },
  accentColor: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#6B7280', // charcoal-500
    validate: {
      is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    }
  },
  backgroundColor: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#F9FAFB', // charcoal-50
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

// Add this to your existing module.exports
module.exports = {
  sequelize,
  Document,
  Category,
  ProcessingJob,
  SystemSetting,
  BrandingSettings,
  initializeDatabase
};