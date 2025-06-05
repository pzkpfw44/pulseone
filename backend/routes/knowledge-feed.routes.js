// backend/routes/knowledge-feed.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const fileProcessor = require('../utils/fileProcessor');
const categorization = require('../utils/categorization');

const documentChunker = require('../utils/documentChunker');
const { Document, Category, ProcessingJob, DocumentChunk } = require('../models');

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

    const { category: defaultCategory, tags: tagsString, isLegacy, useAiCategorization } = req.body;
    const userTags = tagsString ? JSON.parse(tagsString) : [];
    const isLegacyFlag = isLegacy === 'true';
    const useAiFlag = useAiCategorization === 'true';

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
          uploadedBy: req.user?.id || 'system',
          useAiProcessing: useAiFlag
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
// Complete document processing
async function processDocumentComplete(document, job) {
  try {
    // Step 1: Extract text content
    await job.update({ 
      status: 'processing', 
      progress: 10,
      startedAt: new Date()
    });

    await document.update({
      processingStage: 'extracting_text'
    });

    const extractionResult = await fileProcessor.processFile(
      document.filePath,
      document.originalName,
      document.mimeType
    );

    if (!extractionResult.success) {
      throw new Error(extractionResult.error);
    }

    await job.update({ progress: 40 });

    // Step 2: Categorize document
    let finalCategory = document.category;
    let aiGeneratedTags = [];
    let processingMethod = 'pattern-based';
    let processingReasoning = 'Pre-assigned category';

    if (!finalCategory || finalCategory === '') {
      await document.update({
        processingStage: 'categorizing'
      });

      let categorizationResult;
      
      // Check if user wants AI processing and if AI is configured
      if (document.useAiProcessing) {
        console.log('User requested AI categorization');
        categorizationResult = await categorization.categorizeDocument(
          extractionResult.extractedText,
          document.originalName,
          extractionResult.metadata
        );
      } else {
        console.log('User requested basic pattern categorization');
        // Force pattern-based categorization
        categorizationResult = await categorization.patternBasedCategorization(
          extractionResult.extractedText,
          document.originalName
        );
      }

      if (categorizationResult.success) {
        finalCategory = categorizationResult.category;
        aiGeneratedTags = categorizationResult.tags || [];
        processingMethod = categorizationResult.method || 'pattern-based';
        processingReasoning = categorizationResult.reasoning || 'Automatic categorization';
      } else {
        // Fallback to default category
        finalCategory = 'general_documents';
        processingMethod = 'fallback';
        processingReasoning = 'Fallback categorization due to processing error';
      }
    }

    await job.update({ progress: 70 });

    // Step 3: Generate summary (basic for now)
    await document.update({
      processingStage: 'generating_summary'
    });
    
    const summary = generateDocumentSummary(extractionResult.extractedText);
    
    await job.update({ progress: 90 });

    // Step 4: Create document chunks for RAG
    await document.update({
      processingStage: 'creating_chunks'
    });

    console.log(`[Chunking] Starting chunking for document: ${document.originalName}`);
    
    let chunks = [];
    try {
      // Validate extracted text before chunking
      if (!extractionResult.extractedText || extractionResult.extractedText.trim().length === 0) {
        console.warn(`[Chunking] No extracted text available for ${document.originalName}`);
        throw new Error('No text content available for chunking');
      }

      console.log(`[Chunking] Text length: ${extractionResult.extractedText.length} characters`);
      
      // Create chunks using the document chunker
      chunks = documentChunker.chunkDocument(
        extractionResult.extractedText,
        document.id,
        document.originalName
      );

      console.log(`[Chunking] Generated ${chunks.length} chunks for ${document.originalName}`);

      // Validate chunks before saving
      const validChunks = chunks.filter(chunk => {
        if (!chunk.content || chunk.content.trim().length < 10) {
          console.warn(`[Chunking] Filtering out invalid chunk: too short`);
          return false;
        }
        if (!chunk.documentId || chunk.wordCount < 1) {
          console.warn(`[Chunking] Filtering out invalid chunk: missing data`);
          return false;
        }
        return true;
      });

      console.log(`[Chunking] ${validChunks.length} valid chunks after filtering`);

      // Save chunks to database with error handling
      if (validChunks.length > 0) {
        try {
          await DocumentChunk.bulkCreate(validChunks);
          console.log(`[Chunking] Successfully saved ${validChunks.length} chunks to database`);
          
          // Verify chunks were actually saved
          const savedChunkCount = await DocumentChunk.count({
            where: { documentId: document.id }
          });
          console.log(`[Chunking] Verification: ${savedChunkCount} chunks in database`);
          
          if (savedChunkCount === 0) {
            throw new Error('Chunks were not saved to database');
          }
        } catch (chunkSaveError) {
          console.error(`[Chunking] Failed to save chunks:`, chunkSaveError);
          throw new Error(`Failed to save document chunks: ${chunkSaveError.message}`);
        }
      } else {
        console.error(`[Chunking] No valid chunks generated for ${document.originalName}`);
        throw new Error('No valid chunks could be generated from document content');
      }

    } catch (chunkingError) {
      console.error(`[Chunking] Chunking failed for ${document.originalName}:`, chunkingError);
      
      // Don't fail the entire processing - create a fallback chunk
      console.log(`[Chunking] Creating fallback chunk for ${document.originalName}`);
      
      const fallbackChunk = {
        documentId: document.id,
        chunkIndex: 0,
        content: extractionResult.extractedText.substring(0, 2000) + '...',
        wordCount: Math.min(documentChunker.countWords(extractionResult.extractedText), 300),
        startPosition: 0,
        endPosition: Math.min(extractionResult.extractedText.length, 2000)
      };

      try {
        await DocumentChunk.create(fallbackChunk);
        console.log(`[Chunking] Created fallback chunk for ${document.originalName}`);
        chunks = [fallbackChunk];
      } catch (fallbackError) {
        console.error(`[Chunking] Failed to create fallback chunk:`, fallbackError);
        // Continue processing without chunks - better than failing completely
        chunks = [];
      }
    }

    await job.update({ progress: 95 });

    // Step 5: Final processing - Update document with all results
    await document.update({
      status: 'processed',
      processingStage: 'completed',
      category: finalCategory,
      processingMethod: processingMethod,
      processingReasoning: processingReasoning,
      aiGeneratedTags: aiGeneratedTags,
      summary: summary,
      metadata: {
        ...extractionResult.metadata,
        wordCount: extractionResult.metadata?.wordCount || 0,
        textLength: extractionResult.extractedText?.length || 0,
        chunkCount: chunks.length
      }
    });

    await job.update({
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      result: {
        textLength: extractionResult.extractedText?.length || 0,
        wordCount: extractionResult.metadata?.wordCount || 0,
        category: finalCategory,
        tags: aiGeneratedTags.length,
        warnings: extractionResult.warnings || [],
        processingMethod: processingMethod
      }
    });

    console.log(`Document ${document.originalName} processed successfully with method: ${processingMethod}`);

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

router.get('/debug/document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findByPk(documentId, {
      include: [{
        model: DocumentChunk,
        as: 'chunks',
        limit: 3
      }]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Re-extract text to debug
    const fileProcessor = require('../utils/fileProcessor');
    const extractionResult = await fileProcessor.processFile(
      document.filePath,
      document.originalName,
      document.mimeType
    );

    res.json({
      document: {
        id: document.id,
        filename: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        status: document.status,
        processingMethod: document.processingMethod
      },
      extraction: {
        success: extractionResult.success,
        textLength: extractionResult.extractedText?.length || 0,
        textPreview: extractionResult.extractedText?.substring(0, 500) || 'No text extracted',
        metadata: extractionResult.metadata,
        warnings: extractionResult.warnings
      },
      chunks: document.chunks?.map(chunk => ({
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        wordCount: chunk.wordCount,
        contentPreview: chunk.content.substring(0, 200) + '...'
      })) || []
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk reprocess documents with improved extraction
router.post('/reprocess-all', async (req, res) => {
  try {
    const { 
      onlyFailed = false, 
      onlyLowQuality = false, 
      forceReprocess = false 
    } = req.body;

    let whereClause = {};
    
    if (onlyFailed) {
      whereClause.status = 'error';
    } else if (onlyLowQuality) {
      // Find documents with very short extracted text or low word count
      whereClause = {
        status: 'processed',
        [Op.or]: [
          { '$metadata.wordCount$': { [Op.lt]: 50 } },
          { '$metadata.textLength$': { [Op.lt]: 200 } },
          { '$metadata.qualityScore$': { [Op.lt]: 40 } }
        ]
      };
    } else if (!forceReprocess) {
      // Only reprocess documents that haven't been processed or failed
      whereClause.status = { [Op.in]: ['uploaded', 'error'] };
    }

    const documents = await Document.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 20 // Limit to prevent overwhelming the system
    });

    console.log(`[Reprocess] Found ${documents.length} documents to reprocess`);

    const results = [];
    
    for (const document of documents) {
      try {
        // Reset document status
        await document.update({
          status: 'processing',
          processingStage: 'reprocessing',
          errorMessage: null
        });

        // Delete existing chunks
        await DocumentChunk.destroy({
          where: { documentId: document.id }
        });

        // Create new processing job
        const job = await ProcessingJob.create({
          documentId: document.id,
          jobType: 'text_extraction',
          status: 'processing'
        });

        // Start reprocessing (async)
        setImmediate(async () => {
          await processDocumentComplete(document, job);
        });

        results.push({
          documentId: document.id,
          filename: document.originalName,
          status: 'reprocessing_started',
          previousStatus: document.status
        });

      } catch (error) {
        console.error(`Failed to start reprocessing for ${document.originalName}:`, error);
        results.push({
          documentId: document.id,
          filename: document.originalName,
          status: 'reprocessing_failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Started reprocessing ${results.length} documents`,
      results: results,
      totalFound: documents.length
    });

  } catch (error) {
    console.error('Bulk reprocess error:', error);
    res.status(500).json({ 
      error: 'Failed to start bulk reprocessing',
      details: error.message 
    });
  }
});

// Get reprocessing candidates
router.get('/reprocess-candidates', async (req, res) => {
  try {
    const failed = await Document.count({ where: { status: 'error' } });
    
    const lowQuality = await Document.count({
      where: {
        status: 'processed',
        [Op.or]: [
          { '$metadata.wordCount$': { [Op.lt]: 50 } },
          { '$metadata.textLength$': { [Op.lt]: 200 } },
          { '$metadata.qualityScore$': { [Op.lt]: 40 } }
        ]
      }
    });

    const unprocessed = await Document.count({ 
      where: { status: { [Op.in]: ['uploaded', 'processing'] } } 
    });

    // Get sample documents for each category
    const failedDocs = await Document.findAll({
      where: { status: 'error' },
      limit: 5,
      attributes: ['id', 'originalName', 'errorMessage', 'createdAt']
    });

    const lowQualityDocs = await Document.findAll({
      where: {
        status: 'processed',
        [Op.or]: [
          { '$metadata.wordCount$': { [Op.lt]: 50 } },
          { '$metadata.textLength$': { [Op.lt]: 200 } }
        ]
      },
      limit: 5,
      attributes: ['id', 'originalName', 'metadata', 'createdAt']
    });

    res.json({
      counts: {
        failed,
        lowQuality,
        unprocessed,
        total: failed + lowQuality + unprocessed
      },
      samples: {
        failed: failedDocs,
        lowQuality: lowQualityDocs
      }
    });

  } catch (error) {
    console.error('Error getting reprocess candidates:', error);
    res.status(500).json({ error: 'Failed to get reprocess candidates' });
  }
});

// Download document
router.get('/download/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findByPk(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file exists on disk
    const fs = require('fs').promises;
    try {
      await fs.access(document.filePath);
    } catch (error) {
      return res.status(404).json({ 
        error: 'Document file not found on disk',
        details: 'The file may have been moved or deleted'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Length', document.size);

    // Stream the file
    const fileStream = require('fs').createReadStream(document.filePath);
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Failed to download document',
      details: error.message 
    });
  }
});

// Get document content for preview (text extraction)
router.get('/preview/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { maxChunks = 3 } = req.query;
    
    const document = await Document.findByPk(documentId, {
      include: [{
        model: DocumentChunk,
        as: 'chunks',
        limit: parseInt(maxChunks),
        order: [['chunkIndex', 'ASC']],
        attributes: ['chunkIndex', 'content', 'wordCount']
      }]
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Combine chunks to create preview content
    const previewContent = document.chunks
      .map(chunk => chunk.content)
      .join('\n\n');

    res.json({
      success: true,
      preview: {
        id: document.id,
        filename: document.originalName,
        content: previewContent,
        wordCount: document.metadata?.wordCount || 0,
        chunkCount: document.chunks.length,
        totalChunks: await DocumentChunk.count({ where: { documentId } })
      }
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ 
      error: 'Failed to get document preview',
      details: error.message 
    });
  }
});

// Export this to be added to the existing knowledge-feed.routes.js
module.exports = {
  downloadRoute: router.get.bind(router),
  previewRoute: router.get.bind(router)
};

module.exports = router;