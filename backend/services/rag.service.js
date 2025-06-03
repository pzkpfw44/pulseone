// backend/services/rag.service.js
const { DocumentChunk, Document } = require('../models');
const { Op } = require('sequelize');
const documentChunker = require('../utils/documentChunker');

class RagService {
  
  // Search for relevant document chunks
  async searchDocuments(query, options = {}) {
    try {
      const {
        maxResults = 5,
        categories = [],
        excludeLegacy = false
      } = options;

      // Build search conditions
      const whereClause = {};
      if (categories.length > 0) {
        whereClause.category = { [Op.in]: categories };
      }
      if (excludeLegacy) {
        whereClause.isLegacy = false;
      }

      // Get all chunks with document info
      const chunks = await DocumentChunk.findAll({
        include: [{
          model: Document,
          as: 'document',
          where: whereClause,
          attributes: ['originalName', 'category', 'isLegacy', 'createdAt']
        }],
        where: {
          content: {
            [Op.like]: `%${query}%`
          }
        },
        order: [['createdAt', 'DESC']]
      });

      // Score and rank chunks
      const rankedChunks = documentChunker.searchChunks(chunks, query, maxResults);

      return {
        success: true,
        chunks: rankedChunks,
        totalFound: chunks.length,
        query: query
      };

    } catch (error) {
      console.error('RAG search error:', error);
      return {
        success: false,
        error: error.message,
        chunks: []
      };
    }
  }

  // Get context for AI chat
  async getContextForQuery(query, options = {}) {
    const searchResult = await this.searchDocuments(query, options);
    
    if (!searchResult.success || searchResult.chunks.length === 0) {
      return {
        context: '',
        sources: [],
        foundRelevantContent: false
      };
    }

    // Build context from top chunks
    const contextChunks = searchResult.chunks.slice(0, 3); // Top 3 most relevant
    const context = contextChunks.map((chunk, index) => 
      `[Source ${index + 1}: ${chunk.document.originalName}]\n${chunk.content}`
    ).join('\n\n---\n\n');

    const sources = contextChunks.map(chunk => ({
      filename: chunk.document.originalName,
      category: chunk.document.category,
      chunkIndex: chunk.chunkIndex,
      relevanceScore: chunk.relevanceScore
    }));

    return {
      context,
      sources,
      foundRelevantContent: true,
      totalResults: searchResult.totalFound
    };
  }
}

module.exports = new RagService();