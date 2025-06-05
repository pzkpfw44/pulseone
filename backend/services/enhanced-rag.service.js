// backend/services/enhanced-rag.service.js - Phase 2 Enhanced Version
const { Document, DocumentChunk, Category } = require('../models');
const { Op } = require('sequelize');

class EnhancedRAGService {
  constructor() {
    this.chunkCache = new Map();
    this.documentCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Phase 2: Get context from specific documents only
   */
  async getContextFromSpecificDocuments(query, options = {}) {
    try {
      const {
        documentIds = [],
        maxResults = 5,
        includeRelevanceScores = false,
        templateId = null
      } = options;

      if (!documentIds || documentIds.length === 0) {
        return {
          foundRelevantContent: false,
          context: '',
          sources: [],
          error: 'No document IDs provided'
        };
      }

      console.log(`[Enhanced RAG] Searching ${documentIds.length} specific documents for: "${query}"`);

      // Get chunks from specified documents only
      const chunks = await DocumentChunk.findAll({
        where: {
          documentId: {
            [Op.in]: documentIds
          }
        },
        include: [{
          model: Document,
          as: 'document',
          attributes: ['id', 'originalName', 'category', 'summary']
        }],
        order: [['qualityScore', 'DESC'], ['wordCount', 'DESC']],
        limit: maxResults * 3 // Get more chunks to filter from
      });

      if (chunks.length === 0) {
        console.log('[Enhanced RAG] No chunks found in specified documents');
        return {
          foundRelevantContent: false,
          context: 'No content found in selected documents',
          sources: [],
          error: 'No processable content in selected documents'
        };
      }

      // Calculate relevance scores for each chunk
      const scoredChunks = chunks.map(chunk => {
        const relevanceScore = this.calculateRelevanceScore(query, chunk, templateId);
        return {
          chunk,
          score: relevanceScore
        };
      }).filter(item => item.score > 0.1) // Filter out very low relevance
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      if (scoredChunks.length === 0) {
        return {
          foundRelevantContent: false,
          context: 'No relevant content found in selected documents',
          sources: []
        };
      }

      // Build context from selected chunks
      let context = '';
      const sources = [];
      const documentGroups = new Map();

      scoredChunks.forEach(({ chunk, score }) => {
        const docName = chunk.document.originalName;
        if (!documentGroups.has(docName)) {
          documentGroups.set(docName, []);
        }
        documentGroups.get(docName).push({ chunk, score });
      });

      // Group context by document for better organization
      for (const [docName, chunkData] of documentGroups) {
        context += `\n**From Document: ${docName}**\n`;
        
        chunkData.forEach(({ chunk, score }) => {
          context += `${chunk.content}\n`;
          
          sources.push({
            documentId: chunk.documentId,
            documentName: docName,
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            relevanceScore: includeRelevanceScores ? score : undefined,
            category: chunk.document.category
          });
        });
        
        context += '\n';
      }

      console.log(`[Enhanced RAG] Found ${scoredChunks.length} relevant chunks from ${documentGroups.size} documents`);

      return {
        foundRelevantContent: true,
        context: context.trim(),
        sources,
        searchInfo: {
          totalChunksSearched: chunks.length,
          relevantChunksFound: scoredChunks.length,
          documentsUsed: documentGroups.size,
          avgRelevanceScore: scoredChunks.reduce((sum, item) => sum + item.score, 0) / scoredChunks.length
        }
      };

    } catch (error) {
      console.error('[Enhanced RAG] Error in specific document search:', error);
      return {
        foundRelevantContent: false,
        context: '',
        sources: [],
        error: error.message
      };
    }
  }

  /**
   * Get document information for analysis
   */
  async getDocumentInfo(documentId) {
    try {
      const document = await Document.findByPk(documentId, {
        include: [{
          model: DocumentChunk,
          as: 'chunks',
          attributes: ['id', 'wordCount', 'chunkType', 'qualityScore'],
          limit: 1 // Just for counting and basic info
        }]
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Get chunk count
      const chunkCount = await DocumentChunk.count({
        where: { documentId: document.id }
      });

      // Get total word count
      const wordCountResult = await DocumentChunk.sum('wordCount', {
        where: { documentId: document.id }
      });

      return {
        id: document.id,
        originalName: document.originalName,
        category: document.category,
        summary: document.summary,
        aiGeneratedTags: document.aiGeneratedTags,
        size: document.size,
        mimeType: document.mimeType,
        createdAt: document.createdAt,
        chunkCount,
        wordCount: wordCountResult || 0,
        status: document.status
      };

    } catch (error) {
      console.error(`[Enhanced RAG] Error getting document info for ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced relevance scoring with template awareness
   */
  calculateRelevanceScore(query, chunk, templateId = null) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const content = chunk.content.toLowerCase();
    const document = chunk.document;
    
    let score = 0;
    
    // Base text matching (40% weight)
    let termMatches = 0;
    queryTerms.forEach(term => {
      if (content.includes(term)) {
        termMatches++;
        // Bonus for exact phrase matches
        if (query.toLowerCase().includes(term) && content.includes(query.toLowerCase())) {
          score += 0.1;
        }
      }
    });
    score += (termMatches / queryTerms.length) * 0.4;
    
    // Template-specific relevance (30% weight)
    if (templateId) {
      score += this.getTemplateRelevanceBonus(templateId, chunk, document) * 0.3;
    }
    
    // Document category relevance (20% weight)
    score += this.getCategoryRelevanceScore(document.category, templateId) * 0.2;
    
    // Quality indicators (10% weight)
    const qualityScore = (chunk.qualityScore || 1.0) * 0.05; // Quality score component
    const lengthScore = Math.min(chunk.wordCount / 200, 1) * 0.05; // Length component
    score += qualityScore + lengthScore;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get template-specific relevance bonus
   */
  getTemplateRelevanceBonus(templateId, chunk, document) {
    const templateKeywords = {
      'job-descriptions': ['role', 'responsibility', 'qualification', 'skill', 'position', 'job', 'competency'],
      'policy-generator': ['policy', 'procedure', 'compliance', 'regulation', 'guideline', 'rule'],
      'procedure-docs': ['procedure', 'process', 'workflow', 'step', 'instruction', 'operation'],
      'functional-booklet': ['organization', 'structure', 'hierarchy', 'department', 'team', 'reporting']
    };

    const keywords = templateKeywords[templateId] || [];
    const content = chunk.content.toLowerCase();
    const docName = document.originalName.toLowerCase();
    
    let bonus = 0;
    keywords.forEach(keyword => {
      if (content.includes(keyword) || docName.includes(keyword)) {
        bonus += 0.1;
      }
    });
    
    return Math.min(bonus, 1.0);
  }

  /**
   * Get category relevance score for template
   */
  getCategoryRelevanceScore(category, templateId) {
    const categoryMappings = {
      'job-descriptions': {
        'job_frameworks': 1.0,
        'policies_procedures': 0.8,
        'organizational_guidelines': 0.7,
        'training_materials': 0.5
      },
      'policy-generator': {
        'policies_procedures': 1.0,
        'compliance_documents': 0.9,
        'organizational_guidelines': 0.7,
        'job_frameworks': 0.4
      },
      'procedure-docs': {
        'policies_procedures': 1.0,
        'training_materials': 0.8,
        'compliance_documents': 0.7,
        'organizational_guidelines': 0.6
      },
      'functional-booklet': {
        'organizational_guidelines': 1.0,
        'job_frameworks': 0.8,
        'policies_procedures': 0.6,
        'training_materials': 0.4
      }
    };

    const mapping = categoryMappings[templateId] || {};
    return mapping[category] || 0.3; // Default low relevance for unmapped categories
  }

  /**
   * Original context search method (maintained for backward compatibility)
   */
  async getContextForQuery(query, options = {}) {
    try {
      const {
        maxResults = 5,
        includeRelevanceScores = false,
        categoryFilter = null,
        minQualityScore = 0.5
      } = options;

      console.log(`[Enhanced RAG] Searching for: "${query}"`);

      // Search all chunks with optional category filtering
      const whereClause = {
        wordCount: { [Op.gt]: 10 } // Minimum word count
      };

      if (minQualityScore > 0) {
        whereClause.qualityScore = { [Op.gte]: minQualityScore };
      }

      const includeClause = [{
        model: Document,
        as: 'document',
        attributes: ['id', 'originalName', 'category', 'summary'],
        where: categoryFilter ? { category: categoryFilter } : {}
      }];

      const chunks = await DocumentChunk.findAll({
        where: whereClause,
        include: includeClause,
        order: [['qualityScore', 'DESC'], ['wordCount', 'DESC']],
        limit: maxResults * 4 // Get more to filter from
      });

      if (chunks.length === 0) {
        console.log('[Enhanced RAG] No chunks found');
        return {
          foundRelevantContent: false,
          context: 'No relevant information found in the knowledge base',
          sources: []
        };
      }

      // Score and filter chunks
      const scoredChunks = chunks.map(chunk => {
        const relevanceScore = this.calculateRelevanceScore(query, chunk);
        return { chunk, score: relevanceScore };
      }).filter(item => item.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      if (scoredChunks.length === 0) {
        return {
          foundRelevantContent: false,
          context: 'No sufficiently relevant content found',
          sources: []
        };
      }

      // Build context
      let context = '';
      const sources = [];

      scoredChunks.forEach(({ chunk, score }, index) => {
        context += `${chunk.content}\n\n`;
        
        sources.push({
          documentId: chunk.documentId,
          documentName: chunk.document.originalName,
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          relevanceScore: includeRelevanceScores ? score : undefined,
          category: chunk.document.category
        });
      });

      console.log(`[Enhanced RAG] Found ${scoredChunks.length} relevant chunks`);

      return {
        foundRelevantContent: true,
        context: context.trim(),
        sources,
        searchInfo: {
          totalChunksSearched: chunks.length,
          relevantChunksFound: scoredChunks.length,
          avgRelevanceScore: scoredChunks.reduce((sum, item) => sum + item.score, 0) / scoredChunks.length
        }
      };

    } catch (error) {
      console.error('[Enhanced RAG] Search error:', error);
      return {
        foundRelevantContent: false,
        context: '',
        sources: [],
        error: error.message
      };
    }
  }

  /**
   * Get chunk content by ID
   */
  async getChunkContent(chunkId) {
    try {
      const chunk = await DocumentChunk.findByPk(chunkId, {
        include: [{
          model: Document,
          as: 'document',
          attributes: ['originalName', 'category']
        }]
      });

      return chunk;
    } catch (error) {
      console.error(`[Enhanced RAG] Error getting chunk ${chunkId}:`, error);
      return null;
    }
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.chunkCache.clear();
    this.documentCache.clear();
    console.log('[Enhanced RAG] Cache cleared');
  }

  /**
   * Get service statistics
   */
  async getServiceStats() {
    try {
      const totalDocuments = await Document.count({ where: { status: 'processed' } });
      const totalChunks = await DocumentChunk.count();
      const categories = await Category.findAll({ attributes: ['name', 'usageCount'] });
      
      const avgChunksPerDoc = totalDocuments > 0 ? (totalChunks / totalDocuments).toFixed(1) : 0;
      
      return {
        totalDocuments,
        totalChunks,
        avgChunksPerDocument: parseFloat(avgChunksPerDoc),
        categories: categories.map(cat => ({
          name: cat.name,
          usageCount: cat.usageCount || 0
        })),
        cacheSize: this.chunkCache.size + this.documentCache.size
      };
    } catch (error) {
      console.error('[Enhanced RAG] Error getting stats:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        avgChunksPerDocument: 0,
        categories: [],
        cacheSize: 0,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new EnhancedRAGService();