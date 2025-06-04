// backend/models/index.js - Enhanced with Conversation Management
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/pulse_one.db'),
  logging: false
});

// Conversation model for context management
const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'system'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  context: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'conversations',
  timestamps: true
});

// Conversation Turn model for storing individual interactions
const ConversationTurn = sequelize.define('ConversationTurn', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Conversation,
      key: 'id'
    }
  },
  userMessage: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  assistantResponse: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sources: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  relevanceScore: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  processingTime: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'conversation_turns',
  timestamps: true
});

// Document model (existing, enhanced)
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
  // Enhanced fields for vector search
  embedding: {
    type: DataTypes.TEXT, // Store as JSON string for vector embeddings
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

// Enhanced Document Chunks model with vector support
const DocumentChunk = sequelize.define('DocumentChunk', {
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
  chunkIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  wordCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  startPosition: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  endPosition: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Enhanced fields for semantic search
  embedding: {
    type: DataTypes.TEXT, // Store as JSON string for vector embeddings
    allowNull: true
  },
  embeddingModel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  semanticSummary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  keyTerms: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  chunkType: {
    type: DataTypes.ENUM('text', 'table', 'list', 'header', 'footer'),
    defaultValue: 'text'
  },
  languageCode: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'en'
  },
  qualityScore: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0
  }
}, {
  tableName: 'document_chunks',
  timestamps: true,
  indexes: [
    { fields: ['documentId'] },
    { fields: ['content'] },
    { fields: ['chunkType'] },
    { fields: ['qualityScore'] }
  ]
});

// Category model (existing, enhanced)
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
  // Enhanced fields
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

// Processing Job model (existing)
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
    type: DataTypes.ENUM('text_extraction', 'categorization', 'tagging', 'embedding', 'ai_generation'),
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

// System Settings model (existing)
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

// Branding Settings model (existing)
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

// AI Generation History model for tracking document generation
const AiGenerationHistory = sequelize.define('AiGenerationHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  templateId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  templateTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'system'
  },
  legalFramework: {
    type: DataTypes.JSON,
    allowNull: false
  },
  targetAudience: {
    type: DataTypes.JSON,
    allowNull: false
  },
  context: {
    type: DataTypes.JSON,
    allowNull: false
  },
  outputConfig: {
    type: DataTypes.JSON,
    allowNull: false
  },
  generatedContent: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  wordCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tokenUsage: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  generationTime: {
    type: DataTypes.INTEGER, // milliseconds
    allowNull: true
  },
  qualityScore: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  userFeedback: {
    type: DataTypes.JSON,
    allowNull: true
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isBookmarked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'ai_generation_history',
  timestamps: true
});

// Define associations
Document.hasMany(DocumentChunk, { foreignKey: 'documentId', as: 'chunks' });
DocumentChunk.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

Document.hasMany(ProcessingJob, { foreignKey: 'documentId', as: 'processingJobs' });
ProcessingJob.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

Conversation.hasMany(ConversationTurn, { foreignKey: 'conversationId', as: 'turns' });
ConversationTurn.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// Initialize database
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Create tables with enhanced models
    await sequelize.sync({ alter: true });
    console.log('Database synchronized with enhanced models.');

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

// Initialize default categories
async function initializeDefaultCategories() {
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

module.exports = {
  sequelize,
  Document,
  Category,
  ProcessingJob,
  SystemSetting,
  BrandingSettings,
  DocumentChunk,
  Conversation,
  ConversationTurn,
  AiGenerationHistory,
  initializeDatabase
};