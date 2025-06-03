// backend/routes/knowledge-feed.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const { Document, Category, ProcessingJob } = require('../models');
const fileProcessor = require('../utils/fileProcessor');
const categorization = require('../utils/categorization');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const supportedTypes = fileProcessor.getSupportedTypes();
    if (supportedTypes.mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Get supported file types
router.get('/supported-types', (req, res) => {
  try {
    const supportedTypes = fileProcessor.getSupportedTypes();
    res.json(supportedTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get supported types' });
  }
});

// Get active categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await categorization.getActiveCategories();
    const stats = await categorization.getCategorizationStatistics();
    
    res.json({
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        description: cat.description,
        usageCount: cat.usageCount,
        aiSuggested: cat.aiSuggested,
        confidence: cat.confidence
      })),
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Upload and process documents
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { category: defaultCategory, tags: tagsString, isLegacy } = req.body;
    const userTags = tagsString ? JSON.parse(tagsString) : [];
    const isLegacyFlag = isLegacy === 'true';

    const results = [];

    for (const file of req.files) {
      try {
        // Create document record
        const document = await Document.create({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          filePath: file.path,
          category: defaultCategory || null,
          isLegacy: isLegacyFlag,
          status: 'uploaded',
          processingStage: 'uploaded',
          userTags: userTags,
          uploadedBy: req.user?.id || 'system'
        });

        // Start processing pipeline
        const processingResult = await startProcessingPipeline(document);
        
        results.push({
          documentId: document.id,
          filename: file.originalname,
          status: 'uploaded',
          processingStarted: processingResult.success,
          warnings: processingResult.warnings || []
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        results.push({
          filename: file.originalname,
          status: 'error',
          error: fileError.message
        });
      }
    }

    res.json({
      success: true,
      results: results,
      message: `${results.length} file(s) uploaded and processing started`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

// Start processing pipeline for a document
async function startProcessingPipeline(document) {
  try {
    // Update document status
    await document.update({
      status: 'processing',
      processingStage: 'extracting_text'
    });

    // Create processing job
    const job = await ProcessingJob.create({
      documentId: document.id,
      jobType: 'text_extraction',
      status: 'processing'
    });

    // Process asynchronously
    setImmediate(async () => {
      await processDocumentComplete(document, job);
    });

    return { success: true };

  } catch (error) {
    console.error('Failed to start processing pipeline:', error);
    return { success: false, error: error.message };
  }
}

// Complete document processing
async function processDocumentComplete(document, job) {
  try {
    // Step 1: Extract text content
    await job.update({ 
      status: 'processing', 
      progress: 10,
      startedAt: new Date()
    });

    const extractionResult = await fileProcessor.processFile(
      document.filePath,
      document.originalName,
      document.mimeType
    );

    if (!extractionResult.success) {
      throw new Error(extractionResult.error);
    }

    // Update document with extracted content
    await document.update({
      category: finalCategory.category,
      confidence: finalCategory.confidence,
      processingMethod: finalCategory.method,
      aiSuggestions: aiResults?.tags || [],
      aiGeneratedTags: tags,
      processingReasoning: finalCategory.reasoning,
      documentType: aiResults?.documentType || 'unknown'
    });

    await job.update({ progress: 40 });

    // Step 2: Categorize document
    let finalCategory = document.category;
    let aiGeneratedTags = [];

    if (!finalCategory || finalCategory === '') {
      const categorizationResult = await categorization.categorizeDocument(
        extractionResult.extractedText,
        document.originalName,
        extractionResult.metadata
      );

      if (categorizationResult.success) {
        finalCategory = categorizationResult.category;
        aiGeneratedTags = categorizationResult.tags;
        
        await document.update({
          category: finalCategory,
          aiGeneratedTags: aiGeneratedTags,
          processingStage: 'generating_summary'
        });
      }
    }

    await job.update({ progress: 70 });

    // Step 3: Generate summary (basic for now)
    const summary = generateDocumentSummary(extractionResult.extractedText);
    
    await document.update({
      summary: summary,
      processingStage: 'completed'
    });

    await job.update({ progress: 90 });

    // Step 4: Final processing
    await document.update({
      status: 'processed',
      processingStage: 'completed'
    });

    await job.update({
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      result: {
        textLength: extractionResult.extractedText.length,
        wordCount: extractionResult.metadata.wordCount,
        category: finalCategory,
        tags: aiGeneratedTags.length,
        warnings: extractionResult.warnings
      }
    });

    console.log(`Document ${document.originalName} processed successfully`);

  } catch (error) {
    console.error(`Document processing failed for ${document.originalName}:`, error);
    
    await document.update({
      status: 'error',
      errorMessage: error.message,
      processingStage: 'error'
    });

    await job.update({
      status: 'failed',
      errorMessage: error.message,
      completedAt: new Date()
    });
  }
}

// Generate basic document summary
function generateDocumentSummary(text) {
  if (!text || text.length < 100) {
    return 'Document content too short for summary generation.';
  }

  // Extract first meaningful paragraph or first 300 characters
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const firstSentences = sentences.slice(0, 3).join('. ').trim();
  
  if (firstSentences.length > 50) {
    return firstSentences.substring(0, 300) + (firstSentences.length > 300 ? '...' : '');
  }
  
  return text.substring(0, 300) + (text.length > 300 ? '...' : '');
}

// Get recent uploads
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const documents = await Document.findAll({
      order: [['createdAt', 'DESC']],
      limit: limit,
      include: [{
        model: ProcessingJob,
        as: 'processingJobs',
        required: false,
        where: { jobType: 'text_extraction' },
        order: [['createdAt', 'DESC']],
        limit: 1
      }]
    });

    const formattedResults = documents.map(doc => ({
      id: doc.id,
      filename: doc.originalName,
      category: doc.category,
      status: doc.status,
      processingStage: doc.processingStage,
      processingMethod: doc.processingMethod || 'unknown',
      uploadedAt: doc.createdAt,
      uploadedBy: doc.uploadedBy,
      isLegacy: doc.isLegacy,
      size: doc.size,
      wordCount: doc.metadata?.wordCount || 0,
      tags: [...(doc.userTags || []), ...(doc.aiGeneratedTags || [])],
      summary: doc.summary,
      errorMessage: doc.errorMessage,
      processingJob: doc.processingJobs?.[0] ? {
        status: doc.processingJobs[0].status,
        progress: doc.processingJobs[0].progress,
        startedAt: doc.processingJobs[0].startedAt,
        completedAt: doc.processingJobs[0].completedAt
      } : null
    }));

    res.json(formattedResults);

  } catch (error) {
    console.error('Error fetching recent uploads:', error);
    res.status(500).json({ error: 'Failed to fetch recent uploads' });
  }
});

// Get document processing status
router.get('/status/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findByPk(documentId, {
      include: [{
        model: ProcessingJob,
        as: 'processingJobs',
        order: [['createdAt', 'DESC']]
      }]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: document.id,
      filename: document.originalName,
      status: document.status,
      processingStage: document.processingStage,
      progress: document.processingJobs?.[0]?.progress || 0,
      errorMessage: document.errorMessage,
      completedAt: document.processingJobs?.[0]?.completedAt,
      result: document.processingJobs?.[0]?.result
    });

  } catch (error) {
    console.error('Error fetching document status:', error);
    res.status(500).json({ error: 'Failed to fetch document status' });
  }
});

// Get upload statistics
router.get('/statistics', async (req, res) => {
  try {
    const totalDocuments = await Document.count();
    const processedDocuments = await Document.count({ where: { status: 'processed' } });
    const processingDocuments = await Document.count({ where: { status: 'processing' } });
    const errorDocuments = await Document.count({ where: { status: 'error' } });
    
    const categoryCounts = await Document.findAll({
      attributes: [
        'category',
        [Document.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { status: 'processed' },
      group: ['category'],
      order: [[Document.sequelize.literal('count'), 'DESC']]
    });

    const totalSize = await Document.sum('size') || 0;
    const avgProcessingTime = await ProcessingJob.findAll({
      attributes: [
        [Document.sequelize.fn('AVG', 
          Document.sequelize.literal('JULIANDAY(completedAt) - JULIANDAY(startedAt)')
        ), 'avgDays']
      ],
      where: { status: 'completed' }
    });

    res.json({
      documents: {
        total: totalDocuments,
        processed: processedDocuments,
        processing: processingDocuments,
        errors: errorDocuments
      },
      categories: categoryCounts.map(cat => ({
        category: cat.category || 'uncategorized',
        count: parseInt(cat.dataValues.count)
      })),
      storage: {
        totalBytes: totalSize,
        totalMB: (totalSize / (1024 * 1024)).toFixed(2),
        totalGB: (totalSize / (1024 * 1024 * 1024)).toFixed(3)
      },
      performance: {
        avgProcessingTimeMinutes: avgProcessingTime[0]?.dataValues.avgDays ? 
          (avgProcessingTime[0].dataValues.avgDays * 24 * 60).toFixed(2) : '0'
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Reprocess document
router.post('/reprocess/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Reset document status
    await document.update({
      status: 'processing',
      processingStage: 'reprocessing',
      errorMessage: null
    });

    // Start new processing job
    const job = await ProcessingJob.create({
      documentId: document.id,
      jobType: 'text_extraction',
      status: 'processing'
    });

    // Process asynchronously
    setImmediate(async () => {
      await processDocumentComplete(document, job);
    });

    res.json({
      success: true,
      message: 'Document reprocessing started',
      documentId: document.id
    });

  } catch (error) {
    console.error('Error reprocessing document:', error);
    res.status(500).json({ error: 'Failed to reprocess document' });
  }
});

module.exports = router;