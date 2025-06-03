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

      console.log(`RAG Search - Query: "${query}", Options:`, options);

      // Build search conditions
      const whereClause = {};
      if (categories.length > 0) {
        whereClause.category = { [Op.in]: categories };
      }
      if (excludeLegacy) {
        whereClause.isLegacy = false;
      }

      console.log('RAG Search - Document where clause:', whereClause);

      // Extract keywords from query for better search
      const keywords = this.extractKeywords(query);
      console.log('RAG Search - Extracted keywords:', keywords);

      // Build search conditions for keywords
      const searchConditions = keywords.map(keyword => ({
        content: {
          [Op.like]: `%${keyword}%`
        }
      }));

      // Get all chunks with document info
      const chunks = await DocumentChunk.findAll({
        include: [{
          model: Document,
          as: 'document',
          where: whereClause,
          attributes: ['originalName', 'category', 'isLegacy', 'createdAt']
        }],
        where: {
          [Op.or]: searchConditions
        },
        order: [['createdAt', 'DESC']]
      });

      console.log(`RAG Search - Found ${chunks.length} chunks matching query`);
      
      if (chunks.length > 0) {
        console.log('First chunk preview:', chunks[0].content.substring(0, 200));
      } else {
        // If no chunks found with LIKE search, try getting all chunks to debug
        const allChunks = await DocumentChunk.findAll({
          include: [{
            model: Document,
            as: 'document',
            attributes: ['originalName', 'category', 'isLegacy', 'createdAt']
          }],
          limit: 3
        });
        console.log(`RAG Search - No chunks found for query "${query}". Total chunks in DB: ${allChunks.length}`);
        if (allChunks.length > 0) {
          console.log('Sample chunk content:', allChunks[0].content.substring(0, 300));
        }
      }

      console.log(`RAG Search - Found ${chunks.length} chunks matching query`);
      
      if (chunks.length > 0) {
        console.log('First chunk preview:', chunks[0].content.substring(0, 200));
      }

      // Score and rank chunks
      const rankedChunks = documentChunker.searchChunks(chunks, query, maxResults);
      
      console.log(`RAG Search - After ranking: ${rankedChunks.length} chunks`);

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
  // Extract meaningful keywords from query
  extractKeywords(query) {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      'tell', 'me', 'about', 'what', 'is', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'how', 'when', 'where', 'why', 'which', 'who', 'can', 'could', 'would', 'should', 'this', 'that', 'these', 'those'
    ]);

    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // If no keywords found, return original query
    return words.length > 0 ? words : [query.toLowerCase()];
  }
}

module.exports = new RagService();