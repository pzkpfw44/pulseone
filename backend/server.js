// backend/server.js - Enhanced with AI Configuration
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database initialization
const { initializeDatabase, SystemSetting } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically (for development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database and AI configuration
async function initializeServer() {
  try {
    await initializeDatabase();
    
    // Initialize AI configuration from environment variables if not exists
    await initializeAiConfiguration();
    
    console.log('✅ Server initialization complete');
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
  }
}

// Initialize AI configuration with environment variables
async function initializeAiConfiguration() {
  try {
    const existingConfig = await SystemSetting.findOne({
      where: { key: 'ai_configuration' }
    });

    if (!existingConfig && process.env.FLUX_AI_API_KEY) {
      await SystemSetting.create({
        key: 'ai_configuration',
        value: {
          fluxApiKey: process.env.FLUX_AI_API_KEY,
          model: process.env.FLUX_AI_MODEL || 'DeepSeek R1 Distill Qwen 32B',
          temperature: parseFloat(process.env.DEFAULT_AI_TEMPERATURE) || 0.7,
          maxTokens: parseInt(process.env.DEFAULT_AI_MAX_TOKENS) || 2000,
          enableSafetyFilters: process.env.ENABLE_AI_SAFETY_FILTERS !== 'false',
          enableBiasDetection: process.env.ENABLE_AI_BIAS_DETECTION !== 'false',
          enableContentModeration: process.env.ENABLE_AI_CONTENT_MODERATION !== 'false'
        },
        category: 'ai'
      });
      console.log('✅ AI configuration initialized from environment variables');
    }
  } catch (error) {
    console.error('Error initializing AI configuration:', error);
  }
}

// Initialize server
initializeServer();

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Pulse One API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      knowledgeFeed: true,
      aiCategorization: !!process.env.FLUX_AI_API_KEY,
      fluxAiIntegration: true
    }
  });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    codename: 'Genesis'
  });
});

// Mock auth endpoints (until you integrate with Pulse360)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock login - replace with real auth later
  if (email === 'admin@pulseone.com' && password === 'admin123') {
    res.json({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        name: 'Admin User',
        email: 'admin@pulseone.com',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/auth/profile', (req, res) => {
  // Mock profile endpoint
  res.json({
    id: 1,
    name: 'Admin User',
    email: 'admin@pulseone.com',
    role: 'admin'
  });
});

// Enhanced Knowledge Feed routes
const knowledgeFeedRoutes = require('./routes/knowledge-feed.routes');
app.use('/api/knowledge-feed', knowledgeFeedRoutes);

// AI Configuration routes - NEW
const aiConfigurationRoutes = require('./routes/ai-configuration.routes');
app.use('/api/ai-configuration', aiConfigurationRoutes);

// Original Pulse One routes (for backward compatibility)
const pulseOneRoutes = require('./routes/pulse-one.routes');
app.use('/api', pulseOneRoutes);

// Enhanced dashboard endpoint with real data
app.get('/api/dashboard/enhanced-stats', async (req, res) => {
  try {
    const { Document, Category, ProcessingJob } = require('./models');
    
    // Get document statistics
    const totalDocuments = await Document.count();
    const processedDocuments = await Document.count({ where: { status: 'processed' } });
    const processingDocuments = await Document.count({ where: { status: 'processing' } });
    
    // Get category statistics
    const totalCategories = await Category.count({ where: { isActive: true } });
    const dynamicCategories = await Category.count({ 
      where: { type: 'dynamic', isActive: true } 
    });
    
    // Get processing statistics
    const totalJobs = await ProcessingJob.count();
    const completedJobs = await ProcessingJob.count({ where: { status: 'completed' } });
    
    // Check AI configuration status
    const aiConfig = await SystemSetting.findOne({
      where: { key: 'ai_configuration' }
    });
    const isAiConfigured = !!(aiConfig && aiConfig.value && aiConfig.value.fluxApiKey);
    
    res.json({
      connectedModules: { 
        value: '1', 
        subtitle: 'Pulse 360 active',
        trend: 0
      },
      totalDocuments: { 
        value: totalDocuments.toString(), 
        subtitle: `${processedDocuments} processed`,
        trend: processedDocuments > 0 ? 10 : 0
      },
      ragQueries: { 
        value: '0', 
        subtitle: 'AI interactions',
        trend: 0
      },
      syncStatus: { 
        value: processingDocuments > 0 ? '85%' : '100%', 
        subtitle: `${processingDocuments} processing`,
        trend: 2
      },
      categories: {
        value: totalCategories.toString(),
        subtitle: `${dynamicCategories} AI-suggested`,
        trend: dynamicCategories > 0 ? 15 : 0
      },
      processingJobs: {
        value: totalJobs.toString(),
        subtitle: `${completedJobs} completed`,
        trend: completedJobs > 0 ? 8 : 0
      },
      aiStatus: {
        value: isAiConfigured ? 'Active' : 'Not Configured',
        subtitle: isAiConfigured ? 'Flux AI ready' : 'Configure in settings',
        trend: isAiConfigured ? 5 : -5
      }
    });
    
  } catch (error) {
    console.error('Error fetching enhanced dashboard stats:', error);
    // Fallback to basic stats
    res.json({
      connectedModules: { value: '1', subtitle: 'Pulse 360 active' },
      totalDocuments: { value: '0', subtitle: 'Ready for analysis' },
      ragQueries: { value: '0', subtitle: 'AI interactions' },
      syncStatus: { value: '100%', subtitle: 'All systems synced' },
      categories: { value: '7', subtitle: 'Default categories' },
      processingJobs: { value: '0', subtitle: 'No jobs running' },
      aiStatus: { value: 'Unknown', subtitle: 'Check configuration' }
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'File size exceeds the maximum limit of 100MB'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Invalid file upload',
      message: 'Unexpected file field or too many files'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Pulse One Backend running on port ${PORT}`);
  console.log(`📁 File uploads will be stored in: ${path.join(__dirname, 'uploads')}`);
  console.log(`🗄️  Database location: ${path.join(__dirname, 'data/pulse_one.db')}`);
  console.log(`🌐 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI Configuration: ${process.env.FLUX_AI_API_KEY ? 'Configured' : 'Not configured'}`);
});