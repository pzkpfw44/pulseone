// backend/server.js - Enhanced with AI Content Studio, Company Library and Conversation Management
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database initialization
const { initializeDatabase } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically (for development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initializeDatabase().catch(console.error);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Pulse One API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: {
      knowledgeFeed: true,
      aiCategorization: !!process.env.FLUX_AI_API_KEY,
      fluxAiIntegration: true,
      aiContentStudio: true,
      enhancedRag: true,
      conversationManagement: true,
      legalFrameworks: true,
      companyLibrary: true,
      documentGeneration: true,
      multiFormatExport: true
    }
  });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '2.0.0',
    codename: 'Enhanced Genesis'
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

// Enhanced Chat routes with conversation management
try {
  const enhancedChatRoutes = require('./routes/enhanced-chat.routes');
  app.use('/api/chat', enhancedChatRoutes);
  console.log('✅ Enhanced Chat routes loaded');
} catch (error) {
  console.error('❌ Failed to load Enhanced Chat routes:', error.message);
  // Fallback to basic chat routes
  const chatRoutes = require('./routes/chat.routes');
  app.use('/api/chat', chatRoutes);
}

// AI Content Studio routes
try {
  const aiContentStudioRoutes = require('./routes/ai-content-studio.routes');
  app.use('/api/ai-content-studio', aiContentStudioRoutes);
  console.log('✅ AI Content Studio routes loaded');
} catch (error) {
  console.error('❌ Failed to load AI Content Studio routes:', error.message);
  
  // Fallback endpoint
  app.get('/api/ai-content-studio/templates', (req, res) => {
    res.json({
      success: false,
      message: 'AI Content Studio not yet implemented',
      templates: []
    });
  });
}

// Company Library routes (NEW)
try {
  const companyLibraryRoutes = require('./routes/company-library.routes');
  app.use('/api/company-library', companyLibraryRoutes);
  console.log('✅ Company Library routes loaded');
} catch (error) {
  console.error('❌ Failed to load Company Library routes:', error.message);
  
  // Fallback endpoint
  app.get('/api/company-library/overview', (req, res) => {
    res.json({
      success: false,
      message: 'Company Library not yet implemented',
      overview: {
        totalDocuments: 0,
        fedDocuments: 0,
        generatedDocuments: 0,
        totalCategories: 0
      }
    });
  });
}

// AI Configuration routes
try {
  const aiConfigurationRoutes = require('./routes/ai-configuration.routes');
  app.use('/api/ai-configuration', aiConfigurationRoutes);
  console.log('✅ AI Configuration routes loaded');
} catch (error) {
  console.error('❌ Failed to load AI Configuration routes:', error.message);
  
  // Fallback AI configuration endpoint
  app.get('/api/ai-configuration', (req, res) => {
    res.json({
      fluxApiKey: process.env.FLUX_AI_API_KEY ? '••••••••' : '',
      model: process.env.FLUX_AI_MODEL || 'DeepSeek R1 Distill Qwen 32B',
      temperature: parseFloat(process.env.DEFAULT_AI_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.DEFAULT_AI_MAX_TOKENS) || 2000,
      enableSafetyFilters: process.env.ENABLE_AI_SAFETY_FILTERS !== 'false',
      enableBiasDetection: process.env.ENABLE_AI_BIAS_DETECTION !== 'false',
      enableContentModeration: process.env.ENABLE_AI_CONTENT_MODERATION !== 'false'
    });
  });
}

// Branding Settings routes
try {
  const brandingRoutes = require('./routes/branding-settings.routes');
  app.use('/api/settings/branding', brandingRoutes);
  console.log('✅ Branding Settings routes loaded');
} catch (error) {
  console.error('❌ Failed to load Branding Settings routes:', error.message);
}

// Settings routes (general)
try {
  const settingsRoutes = require('./routes/settings.routes');
  app.use('/api/settings', settingsRoutes);
  console.log('✅ Settings routes loaded');
} catch (error) {
  console.error('❌ Failed to load Settings routes:', error.message);
}

// Conversation Management routes
try {
  const conversationRoutes = require('./routes/conversation.routes');
  app.use('/api/conversations', conversationRoutes);
  console.log('✅ Conversation Management routes loaded');
} catch (error) {
  console.error('❌ Failed to load Conversation Management routes:', error.message);
}

// Original Pulse One routes (for backward compatibility)
const pulseOneRoutes = require('./routes/pulse-one.routes');
app.use('/api', pulseOneRoutes);

// Enhanced dashboard endpoint with comprehensive data
app.get('/api/dashboard/enhanced-stats', async (req, res) => {
  try {
    const { Document, Category, ProcessingJob, SystemSetting, Conversation, AiGenerationHistory } = require('./models');
    
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
    
    // Get conversation statistics
    const totalConversations = await Conversation.count();
    const activeConversations = await Conversation.count({ where: { isActive: true } });
    
    // Get AI generation statistics
    const totalGenerations = await AiGenerationHistory.count();
    const recentGenerations = await AiGenerationHistory.count({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    
    // Check AI configuration status
    let isAiConfigured = false;
    try {
      const aiConfig = await SystemSetting.findOne({
        where: { key: 'ai_configuration' }
      });
      isAiConfigured = !!(aiConfig && aiConfig.value && aiConfig.value.fluxApiKey);
    } catch (aiError) {
      console.warn('Could not check AI configuration:', aiError.message);
      isAiConfigured = !!process.env.FLUX_AI_API_KEY;
    }
    
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
        value: totalConversations.toString(), 
        subtitle: `${activeConversations} active chats`,
        trend: activeConversations > 0 ? 15 : 0
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
      aiGenerations: {
        value: totalGenerations.toString(),
        subtitle: `${recentGenerations} this month`,
        trend: recentGenerations > 0 ? 20 : 0
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
      aiGenerations: { value: '0', subtitle: 'No generations yet' },
      aiStatus: { value: 'Unknown', subtitle: 'Check configuration' }
    });
  }
});

// Cost tracking endpoint for AI usage monitoring
app.get('/api/ai-usage/costs', async (req, res) => {
  try {
    const { AiGenerationHistory, ConversationTurn } = require('./models');
    const { Op } = require('sequelize');
    
    // Get usage for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Generation costs
    const generations = await AiGenerationHistory.findAll({
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: ['tokenUsage', 'templateId', 'createdAt']
    });
    
    // Chat costs
    const chatTurns = await ConversationTurn.findAll({
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: ['metadata', 'createdAt']
    });
    
    // Calculate estimated costs (rough estimation)
    let totalTokens = 0;
    let generationTokens = 0;
    let chatTokens = 0;
    
    generations.forEach(gen => {
      const tokens = gen.tokenUsage?.total_tokens || 1000; // Estimate if missing
      totalTokens += tokens;
      generationTokens += tokens;
    });
    
    chatTurns.forEach(turn => {
      const tokens = turn.metadata?.tokenUsage?.total_tokens || 500; // Estimate if missing
      totalTokens += tokens;
      chatTokens += tokens;
    });
    
    // Rough cost estimation (adjust based on your actual pricing)
    const estimatedCost = (totalTokens / 1000) * 0.002; // $0.002 per 1K tokens estimate
    
    res.json({
      success: true,
      period: '30 days',
      totalTokens,
      estimatedCost: estimatedCost.toFixed(4),
      breakdown: {
        documentGeneration: {
          tokens: generationTokens,
          cost: ((generationTokens / 1000) * 0.002).toFixed(4),
          requests: generations.length
        },
        chatInteractions: {
          tokens: chatTokens,
          cost: ((chatTokens / 1000) * 0.002).toFixed(4),
          requests: chatTurns.length
        }
      },
      dailyUsage: await getDailyUsageBreakdown(thirtyDaysAgo)
    });
    
  } catch (error) {
    console.error('Error fetching AI usage costs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage costs'
    });
  }
});

// Helper function for daily usage breakdown
async function getDailyUsageBreakdown(startDate) {
  try {
    const { AiGenerationHistory, ConversationTurn } = require('./models');
    const { Op, fn, col } = require('sequelize');
    
    // Get daily generation counts
    const dailyGenerations = await AiGenerationHistory.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']]
    });
    
    // Get daily chat counts
    const dailyChats = await ConversationTurn.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']]
    });
    
    // Combine the data
    const dailyUsage = {};
    
    dailyGenerations.forEach(item => {
      const date = item.dataValues.date;
      if (!dailyUsage[date]) dailyUsage[date] = { generations: 0, chats: 0 };
      dailyUsage[date].generations = parseInt(item.dataValues.count);
    });
    
    dailyChats.forEach(item => {
      const date = item.dataValues.date;
      if (!dailyUsage[date]) dailyUsage[date] = { generations: 0, chats: 0 };
      dailyUsage[date].chats = parseInt(item.dataValues.count);
    });
    
    return Object.entries(dailyUsage).map(([date, usage]) => ({
      date,
      generations: usage.generations,
      chats: usage.chats,
      total: usage.generations + usage.chats
    }));
    
  } catch (error) {
    console.error('Error getting daily usage breakdown:', error);
    return [];
  }
}

// Company Library analytics endpoint (NEW)
app.get('/api/company-library/analytics', async (req, res) => {
  try {
    const { Document, AiGenerationHistory } = require('./models');
    const { Op, fn, col } = require('sequelize');
    
    const {
      startDate,
      endDate,
      granularity = 'day'
    } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Document upload trends
    const uploadTrends = await Document.findAll({
      where: dateFilter.Op ? { createdAt: dateFilter } : {},
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('createdAt'))],
      order: [['date', 'ASC']],
      raw: true
    });

    // Document generation trends
    const generationTrends = await AiGenerationHistory.findAll({
      where: dateFilter.Op ? { createdAt: dateFilter } : {},
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('createdAt'))],
      order: [['date', 'ASC']],
      raw: true
    });

    // Category distribution
    const categoryDistribution = await Document.findAll({
      attributes: [
        'category',
        [fn('COUNT', '*'), 'count']
      ],
      where: { status: 'processed' },
      group: ['category'],
      order: [[fn('COUNT', '*'), 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      analytics: {
        uploadTrends: uploadTrends.map(trend => ({
          date: trend.date,
          uploads: parseInt(trend.count)
        })),
        generationTrends: generationTrends.map(trend => ({
          date: trend.date,
          generations: parseInt(trend.count)
        })),
        categoryDistribution: categoryDistribution.map(cat => ({
          category: cat.category || 'uncategorized',
          count: parseInt(cat.count)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching library analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch library analytics'
    });
  }
});

// Initialize AI configuration from environment if needed
async function initializeAiConfigurationFromEnv() {
  try {
    if (!process.env.FLUX_AI_API_KEY) {
      console.log('ℹ️  No FLUX_AI_API_KEY found in environment');
      return;
    }

    const { SystemSetting } = require('./models');
    
    const existingConfig = await SystemSetting.findOne({
      where: { key: 'ai_configuration' }
    });

    if (!existingConfig) {
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
    } else {
      console.log('ℹ️  AI configuration already exists in database');
    }
  } catch (error) {
    console.error('❌ Error initializing AI configuration:', error.message);
  }
}

// Initialize AI configuration after a short delay to ensure database is ready
setTimeout(initializeAiConfigurationFromEnv, 2000);

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
  console.log(`🤖 AI Configuration: ${process.env.FLUX_AI_API_KEY ? 'Available' : 'Not configured'}`);
  console.log(`✨ Enhanced Features: AI Content Studio, Company Library, Conversation Management, Legal Frameworks`);
  console.log(`📚 New Endpoints Available:`);
  console.log(`   - Company Library: http://localhost:${PORT}/api/company-library/overview`);
  console.log(`   - AI Content Studio: http://localhost:${PORT}/api/ai-content-studio/templates`);
  console.log(`   - Document Generation: http://localhost:${PORT}/api/ai-content-studio/generate`);
  console.log(`   - Enhanced Chat: http://localhost:${PORT}/api/chat/query`);
  console.log(`   - Conversation Management: http://localhost:${PORT}/api/conversations`);
});