// backend/routes/company-library.routes.js - Complete Company Library Backend
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { Document, Category, AiGenerationHistory, DocumentChunk } = require('../models');
const { Op } = require('sequelize');

// Get library overview with statistics
router.get('/overview', async (req, res) => {
  try {
    // Get fed documents count
    const fedDocumentsCount = await Document.count({
      where: { status: 'processed' }
    });

    // Get generated documents count
    const generatedDocumentsCount = await AiGenerationHistory.count();

    // Get categories count
    const categoriesCount = await Category.count({ where: { isActive: true } });

    // Get recent uploads (last 7 days)
    const recentUploadsCount = await Document.count({
      where: {
        status: 'processed',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get total storage used
    const totalSize = await Document.sum('size') || 0;

    // Get categories with usage stats
    const categories = await Category.findAll({
      where: { isActive: true },
      include: [{
        model: Document,
        attributes: [],
        required: false
      }],
      attributes: [
        'id', 'name', 'description', 'type', 'aiSuggested',
        [Document.sequelize.fn('COUNT', Document.sequelize.col('Documents.id')), 'usageCount']
      ],
      group: ['Category.id'],
      order: [['name', 'ASC']]
    });

    // Get recent activity
    const recentDocuments = await Document.findAll({
      where: { status: 'processed' },
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'originalName', 'category', 'createdAt', 'size']
    });

    const recentGenerated = await AiGenerationHistory.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'templateTitle', 'createdAt', 'wordCount']
    });

    res.json({
      success: true,
      overview: {
        totalDocuments: fedDocumentsCount + generatedDocumentsCount,
        fedDocuments: fedDocumentsCount,
        generatedDocuments: generatedDocumentsCount,
        totalCategories: categoriesCount,
        recentUploads: recentUploadsCount,
        totalStorageBytes: totalSize,
        totalStorageMB: (totalSize / (1024 * 1024)).toFixed(2)
      },
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        type: cat.type,
        aiSuggested: cat.aiSuggested,
        usageCount: parseInt(cat.dataValues.usageCount) || 0
      })),
      recentActivity: {
        documents: recentDocuments,
        generated: recentGenerated
      }
    });

  } catch (error) {
    console.error('Error fetching library overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch library overview'
    });
  }
});

// Get fed documents with filtering and pagination
router.get('/fed-documents', async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      tags = '',
      sortBy = 'date-desc',
      limit = 20,
      offset = 0,
      includeChunks = false
    } = req.query;

    // Build where clause
    const whereClause = { status: 'processed' };
    
    if (search) {
      whereClause[Op.or] = [
        { originalName: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    // Handle tags filtering
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      whereClause[Op.or] = [
        { userTags: { [Op.like]: `%${tagArray[0]}%` } },
        { aiGeneratedTags: { [Op.like]: `%${tagArray[0]}%` } }
      ];
    }

    // Build order clause
    let orderClause;
    switch (sortBy) {
      case 'name-asc':
        orderClause = [['originalName', 'ASC']];
        break;
      case 'name-desc':
        orderClause = [['originalName', 'DESC']];
        break;
      case 'date-asc':
        orderClause = [['createdAt', 'ASC']];
        break;
      case 'date-desc':
      default:
        orderClause = [['createdAt', 'DESC']];
        break;
    }

    // Build include clause
    const includeClause = [];
    if (includeChunks) {
      includeClause.push({
        model: DocumentChunk,
        as: 'chunks',
        attributes: ['id', 'chunkIndex', 'wordCount']
      });
    }

    const { rows: documents, count } = await Document.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: orderClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'originalName', 'filename', 'mimeType', 'size', 'category', 
        'isLegacy', 'status', 'processingMethod', 'userTags', 'aiGeneratedTags',
        'summary', 'metadata', 'createdAt', 'uploadedBy'
      ]
    });

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      filename: doc.originalName,
      category: doc.category,
      size: doc.size,
      isLegacy: doc.isLegacy,
      status: doc.status,
      processingMethod: doc.processingMethod,
      tags: [...(doc.userTags || []), ...(doc.aiGeneratedTags || [])],
      summary: doc.summary,
      wordCount: doc.metadata?.wordCount || 0,
      uploadedAt: doc.createdAt,
      uploadedBy: doc.uploadedBy,
      chunkCount: includeChunks ? (doc.chunks?.length || 0) : undefined
    }));

    res.json({
      success: true,
      documents: formattedDocuments,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: count > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching fed documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fed documents'
    });
  }
});

// Get generated documents with filtering and pagination
router.get('/generated-documents', async (req, res) => {
  try {
    const {
      search = '',
      templateId = '',
      sortBy = 'date-desc',
      limit = 20,
      offset = 0,
      bookmarkedOnly = false
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { templateTitle: { [Op.like]: `%${search}%` } },
        { generatedContent: { [Op.like]: `%${search}%` } }
      ];
    }

    if (templateId) {
      whereClause.templateId = templateId;
    }

    if (bookmarkedOnly === 'true') {
      whereClause.isBookmarked = true;
    }

    // Build order clause
    let orderClause;
    switch (sortBy) {
      case 'name-asc':
        orderClause = [['templateTitle', 'ASC']];
        break;
      case 'name-desc':
        orderClause = [['templateTitle', 'DESC']];
        break;
      case 'date-asc':
        orderClause = [['createdAt', 'ASC']];
        break;
      case 'date-desc':
      default:
        orderClause = [['createdAt', 'DESC']];
        break;
    }

    const { rows: documents, count } = await AiGenerationHistory.findAndCountAll({
      where: whereClause,
      order: orderClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'templateId', 'templateTitle', 'wordCount', 'downloadCount',
        'isBookmarked', 'legalFramework', 'targetAudience', 'outputConfig',
        'createdAt', 'generationTime', 'qualityScore'
      ]
    });

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.templateTitle,
      templateId: doc.templateId,
      wordCount: doc.wordCount,
      downloadCount: doc.downloadCount,
      isBookmarked: doc.isBookmarked,
      legalFramework: doc.legalFramework?.country || 'Unknown',
      targetAudience: doc.targetAudience || [],
      language: doc.outputConfig?.language || 'Unknown',
      createdAt: doc.createdAt,
      generationTime: doc.generationTime,
      qualityScore: doc.qualityScore
    }));

    res.json({
      success: true,
      documents: formattedDocuments,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: count > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching generated documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch generated documents'
    });
  }
});

// Download a fed document
router.get('/fed-documents/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'original' } = req.query;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Document file not found on disk'
      });
    }

    if (format === 'original') {
      // Download original file
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      
      const fileStream = require('fs').createReadStream(document.filePath);
      fileStream.pipe(res);
    } else {
      // For other formats, we'd need to implement conversion
      // For now, return an error
      res.status(400).json({
        success: false,
        error: 'Format conversion not yet implemented'
      });
    }

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

// Update document metadata
router.put('/fed-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, userTags, summary, isLegacy } = req.body;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const updateData = {};
    if (category !== undefined) updateData.category = category;
    if (userTags !== undefined) updateData.userTags = userTags;
    if (summary !== undefined) updateData.summary = summary;
    if (isLegacy !== undefined) updateData.isLegacy = isLegacy;

    await document.update(updateData);

    res.json({
      success: true,
      message: 'Document updated successfully',
      document: {
        id: document.id,
        filename: document.originalName,
        category: document.category,
        tags: [...(document.userTags || []), ...(document.aiGeneratedTags || [])],
        summary: document.summary,
        isLegacy: document.isLegacy
      }
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
});

// Delete a fed document
router.delete('/fed-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.query;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (hardDelete === 'true') {
      // Delete associated chunks
      await DocumentChunk.destroy({
        where: { documentId: id }
      });

      // Delete file from disk
      try {
        await fs.unlink(document.filePath);
      } catch (error) {
        console.warn('Failed to delete file from disk:', error.message);
      }

      // Delete document record
      await document.destroy();

      res.json({
        success: true,
        message: 'Document permanently deleted'
      });
    } else {
      // Soft delete - mark as error status
      await document.update({ 
        status: 'error',
        errorMessage: 'Document archived by user'
      });

      res.json({
        success: true,
        message: 'Document archived'
      });
    }

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

// Get document preview/content
router.get('/fed-documents/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const { chunkLimit = 3 } = req.query;

    const document = await Document.findByPk(id, {
      include: [{
        model: DocumentChunk,
        as: 'chunks',
        limit: parseInt(chunkLimit),
        order: [['chunkIndex', 'ASC']],
        attributes: ['chunkIndex', 'content', 'wordCount']
      }]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
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
        metadata: {
          category: document.category,
          size: document.size,
          wordCount: document.metadata?.wordCount || 0,
          processingMethod: document.processingMethod,
          uploadedAt: document.createdAt,
          chunkCount: document.chunks.length
        }
      }
    });

  } catch (error) {
    console.error('Error getting document preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get document preview'
    });
  }
});

// Search across all library content
router.get('/search', async (req, res) => {
  try {
    const {
      query,
      type = 'all', // 'fed', 'generated', 'all'
      limit = 20,
      offset = 0
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchQuery = query.trim();
    const results = {
      fedDocuments: [],
      generatedDocuments: [],
      total: 0
    };

    // Search fed documents
    if (type === 'all' || type === 'fed') {
      const fedDocs = await Document.findAll({
        where: {
          status: 'processed',
          [Op.or]: [
            { originalName: { [Op.like]: `%${searchQuery}%` } },
            { summary: { [Op.like]: `%${searchQuery}%` } },
            { category: { [Op.like]: `%${searchQuery}%` } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: type === 'fed' ? parseInt(limit) : Math.floor(parseInt(limit) / 2),
        offset: type === 'fed' ? parseInt(offset) : 0,
        attributes: [
          'id', 'originalName', 'category', 'summary', 'createdAt', 
          'userTags', 'aiGeneratedTags', 'metadata'
        ]
      });

      results.fedDocuments = fedDocs.map(doc => ({
        id: doc.id,
        type: 'fed_document',
        title: doc.originalName,
        category: doc.category,
        summary: doc.summary?.substring(0, 200) + (doc.summary?.length > 200 ? '...' : ''),
        tags: [...(doc.userTags || []), ...(doc.aiGeneratedTags || [])],
        createdAt: doc.createdAt,
        relevantField: 'title' // Could be enhanced with actual relevance scoring
      }));
    }

    // Search generated documents
    if (type === 'all' || type === 'generated') {
      const generatedDocs = await AiGenerationHistory.findAll({
        where: {
          [Op.or]: [
            { templateTitle: { [Op.like]: `%${searchQuery}%` } },
            { generatedContent: { [Op.like]: `%${searchQuery}%` } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: type === 'generated' ? parseInt(limit) : Math.floor(parseInt(limit) / 2),
        offset: type === 'generated' ? parseInt(offset) : 0,
        attributes: [
          'id', 'templateTitle', 'templateId', 'generatedContent', 
          'createdAt', 'wordCount', 'legalFramework'
        ]
      });

      results.generatedDocuments = generatedDocs.map(doc => ({
        id: doc.id,
        type: 'generated_document',
        title: doc.templateTitle,
        templateId: doc.templateId,
        preview: doc.generatedContent?.substring(0, 200) + (doc.generatedContent?.length > 200 ? '...' : ''),
        wordCount: doc.wordCount,
        legalFramework: doc.legalFramework?.country || 'Unknown',
        createdAt: doc.createdAt,
        relevantField: 'title'
      }));
    }

    results.total = results.fedDocuments.length + results.generatedDocuments.length;

    res.json({
      success: true,
      query: searchQuery,
      results,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: results.total >= parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error searching library:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search library'
    });
  }
});

// Get external connections (placeholder)
router.get('/external-connections', async (req, res) => {
  try {
    // This is a placeholder for external connections
    // In a real implementation, this would fetch from a connections table
    const connections = [
      {
        id: 1,
        name: 'SharePoint',
        type: 'Microsoft',
        status: 'connected',
        documents: 45,
        lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        config: {
          url: 'https://company.sharepoint.com',
          syncEnabled: true
        }
      },
      {
        id: 2,
        name: 'Google Drive',
        type: 'Google',
        status: 'disconnected',
        documents: 0,
        lastSync: null,
        config: {
          folderId: null,
          syncEnabled: false
        }
      },
      {
        id: 3,
        name: 'Confluence',
        type: 'Atlassian',
        status: 'connected',
        documents: 23,
        lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        config: {
          baseUrl: 'https://company.atlassian.net',
          spaceKey: 'HR',
          syncEnabled: true
        }
      }
    ];

    res.json({
      success: true,
      connections
    });

  } catch (error) {
    console.error('Error fetching external connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch external connections'
    });
  }
});

// Configure external connection
router.put('/external-connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { config, status } = req.body;

    // This is a placeholder implementation
    // In a real system, you'd update the connection configuration

    res.json({
      success: true,
      message: 'Connection configuration updated',
      connectionId: parseInt(id),
      updatedConfig: config,
      status
    });

  } catch (error) {
    console.error('Error updating external connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update external connection'
    });
  }
});

// Sync external connection
router.post('/external-connections/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;

    // This is a placeholder implementation
    // In a real system, you'd trigger a sync process

    res.json({
      success: true,
      message: 'Sync started',
      connectionId: parseInt(id),
      syncStartedAt: new Date()
    });

  } catch (error) {
    console.error('Error starting sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start sync'
    });
  }
});

// Get library analytics
router.get('/analytics', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      granularity = 'day' // 'day', 'week', 'month'
    } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Document upload trends
    const uploadTrends = await Document.findAll({
      where: dateFilter.Op ? { createdAt: dateFilter } : {},
      attributes: [
        [Document.sequelize.fn('DATE', Document.sequelize.col('createdAt')), 'date'],
        [Document.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: [Document.sequelize.fn('DATE', Document.sequelize.col('createdAt'))],
      order: [['date', 'ASC']],
      raw: true
    });

    // Document generation trends
    const generationTrends = await AiGenerationHistory.findAll({
      where: dateFilter.Op ? { createdAt: dateFilter } : {},
      attributes: [
        [AiGenerationHistory.sequelize.fn('DATE', AiGenerationHistory.sequelize.col('createdAt')), 'date'],
        [AiGenerationHistory.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: [AiGenerationHistory.sequelize.fn('DATE', AiGenerationHistory.sequelize.col('createdAt'))],
      order: [['date', 'ASC']],
      raw: true
    });

    // Category distribution
    const categoryDistribution = await Document.findAll({
      attributes: [
        'category',
        [Document.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { status: 'processed' },
      group: ['category'],
      order: [[Document.sequelize.literal('count'), 'DESC']],
      raw: true
    });

    // Processing method distribution
    const processingMethods = await Document.findAll({
      attributes: [
        'processingMethod',
        [Document.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { status: 'processed' },
      group: ['processingMethod'],
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
        })),
        processingMethods: processingMethods.map(method => ({
          method: method.processingMethod || 'unknown',
          count: parseInt(method.count)
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

// Bulk operations on documents
router.post('/bulk-operations', async (req, res) => {
  try {
    const {
      operation, // 'delete', 'update_category', 'update_tags', 'reprocess'
      documentIds,
      parameters = {}
    } = req.body;

    if (!operation || !documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({
        success: false,
        error: 'Operation and document IDs are required'
      });
    }

    const results = [];

    switch (operation) {
      case 'delete':
        for (const docId of documentIds) {
          try {
            const document = await Document.findByPk(docId);
            if (document) {
              await document.update({ 
                status: 'error',
                errorMessage: 'Bulk deleted by user'
              });
              results.push({ documentId: docId, success: true });
            } else {
              results.push({ documentId: docId, success: false, error: 'Not found' });
            }
          } catch (error) {
            results.push({ documentId: docId, success: false, error: error.message });
          }
        }
        break;

      case 'update_category':
        const { category } = parameters;
        if (!category) {
          return res.status(400).json({
            success: false,
            error: 'Category parameter is required for update_category operation'
          });
        }

        for (const docId of documentIds) {
          try {
            const document = await Document.findByPk(docId);
            if (document) {
              await document.update({ category });
              results.push({ documentId: docId, success: true });
            } else {
              results.push({ documentId: docId, success: false, error: 'Not found' });
            }
          } catch (error) {
            results.push({ documentId: docId, success: false, error: error.message });
          }
        }
        break;

      case 'update_tags':
        const { tags, operation: tagOperation = 'replace' } = parameters;
        if (!tags || !Array.isArray(tags)) {
          return res.status(400).json({
            success: false,
            error: 'Tags parameter is required for update_tags operation'
          });
        }

        for (const docId of documentIds) {
          try {
            const document = await Document.findByPk(docId);
            if (document) {
              let newTags = [];
              if (tagOperation === 'add') {
                newTags = [...(document.userTags || []), ...tags];
              } else if (tagOperation === 'remove') {
                newTags = (document.userTags || []).filter(tag => !tags.includes(tag));
              } else {
                newTags = tags;
              }
              
              await document.update({ userTags: [...new Set(newTags)] });
              results.push({ documentId: docId, success: true });
            } else {
              results.push({ documentId: docId, success: false, error: 'Not found' });
            }
          } catch (error) {
            results.push({ documentId: docId, success: false, error: error.message });
          }
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported operation'
        });
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Bulk operation completed: ${successCount}/${documentIds.length} documents processed`,
      results
    });

  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk operation'
    });
  }
});

module.exports = router;