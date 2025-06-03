// backend/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/pulse_one.db'),
  logging: false
});

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
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  aiGeneratedTags: {
    type: DataTypes.JSON,
    defaultValue: []
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

module.exports = {
  sequelize,
  Document,
  Category,
  ProcessingJob,
  SystemSetting,
  initializeDatabase
};