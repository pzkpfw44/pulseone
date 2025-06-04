// backend/services/enhanced-rag.service.js
const { DocumentChunk, Document, Conversation, ConversationTurn } = require('../models');
const { Op } = require('sequelize');
const { makeAiChatRequest } = require('./flux-ai.service');
const documentChunker = require('../utils/documentChunker');

class EnhancedRagService {
  constructor() {
    this.embeddingCache = new Map();
    this.maxCacheSize = 1000;
    this.conversationContextWindow = 5; // Number of previous turns to include
  }

  // Enhanced search with semantic similarity and improved scoring
  async searchDocuments(query, options = {}) {
    try {
      const {
        maxResults = 5,
        categories = [],
        excludeLegacy = false,
        includeRelevanceScores = true,
        semanticThreshold = 0.5,
        conversationId = null
      } = options;

      console.log(`Enhanced RAG Search - Query: "${query}"`);

      // Get conversation context if available
      let conversationContext = '';
      if (conversationId) {
        conversationContext = await this.getConversationContext(conversationId);
      }

      // Enhanced query with conversation context
      const enhancedQuery = conversationContext ? 
        `${conversationContext}\n\nCurrent question: ${query}` : query;

      // Build document filter conditions
      const whereClause = {};
      if (categories.length > 0) {
        whereClause.category = { [Op.in]: categories };
      }
      if (excludeLegacy) {
        whereClause.isLegacy = false;
      }

      // Get semantic embedding for the query
      const queryEmbedding = await this.getQueryEmbedding(enhancedQuery);

      // Multi-stage retrieval strategy
      const retrievalStages = [
        { name: 'exact_match', boost: 2.0 },
        { name: 'keyword_match', boost: 1.5 },
        { name: 'semantic_similarity', boost: 1.0 },
        { name: 'context_aware', boost: 1.2 }
      ];

      let allCandidates = new Map(); // Use Map to avoid duplicates

      // Stage 1: Exact phrase matching
      const exactMatches = await this.findExactMatches(enhancedQuery, whereClause);
      exactMatches.forEach(chunk => {
        const score = this.calculateBaseScore(chunk, enhancedQuery) * 2.0;
        allCandidates.set(chunk.id, { ...chunk, relevanceScore: score, method: 'exact_match' });
      });

      // Stage 2: Advanced keyword matching with stemming and synonyms
      const keywordMatches = await this.findKeywordMatches(enhancedQuery, whereClause);
      keywordMatches.forEach(chunk => {
        if (!allCandidates.has(chunk.id)) {
          const score = this.calculateAdvancedScore(chunk, enhancedQuery) * 1.5;
          allCandidates.set(chunk.id, { ...chunk, relevanceScore: score, method: 'keyword_match' });
        }
      });

      // Stage 3: Semantic similarity (if we have embeddings)
      if (queryEmbedding) {
        const semanticMatches = await this.findSemanticMatches(queryEmbedding, whereClause, semanticThreshold);
        semanticMatches.forEach(chunk => {
          if (!allCandidates.has(chunk.id)) {
            allCandidates.set(chunk.id, { ...chunk, method: 'semantic_similarity' });
          }
        });
      }

      // Stage 4: Context-aware matching based on conversation history
      if (conversationId) {
        const contextMatches = await this.findContextAwareMatches(conversationId, enhancedQuery, whereClause);
        contextMatches.forEach(chunk => {
          const existingCandidate = allCandidates.get(chunk.id);
          if (existingCandidate) {
            // Boost existing candidates found through context
            existingCandidate.relevanceScore *= 1.2;
            existingCandidate.method = 'context_boosted_' + existingCandidate.method;
          } else {
            allCandidates.set(chunk.id, { ...chunk, method: 'context_aware' });
          }
        });
      }

      // Convert to array and apply final scoring
      let rankedChunks = Array.from(allCandidates.values());

      // Enhanced scoring with multiple factors
      rankedChunks = rankedChunks.map(chunk => {
        const enhancedScore = this.calculateEnhancedRelevanceScore(chunk, enhancedQuery, {
          hasConversationContext: !!conversationId,
          queryEmbedding
        });
        return { ...chunk, relevanceScore: enhancedScore };
      });

      // Sort by relevance score and limit results
      rankedChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topChunks = rankedChunks.slice(0, maxResults);

      console.log(`Enhanced RAG - Found ${rankedChunks.length} candidates, returning top ${topChunks.length}`);
      
      return {
        success: true,
        chunks: topChunks,
        totalFound: rankedChunks.length,
        query: query,
        enhancedQuery: enhancedQuery,
        searchMethods: [...new Set(topChunks.map(c => c.method))],
        conversationContext: !!conversationId
      };

    } catch (error) {
      console.error('Enhanced RAG search error:', error);
      return {
        success: false,
        error: error.message,
        chunks: []
      };
    }
  }

  // Get conversation context for better understanding
  async getConversationContext(conversationId) {
    try {
      const recentTurns = await ConversationTurn.findAll({
        where: { conversationId },
        order: [['createdAt', 'DESC']],
        limit: this.conversationContextWindow,
        attributes: ['userMessage', 'assistantResponse']
      });

      if (recentTurns.length === 0) return '';

      const contextParts = recentTurns.reverse().map(turn => 
        `User: ${turn.userMessage}\nAssistant: ${turn.assistantResponse.substring(0, 200)}...`
      );

      return `Previous conversation context:\n${contextParts.join('\n\n')}`;
    } catch (error) {
      console.warn('Failed to get conversation context:', error.message);
      return '';
    }
  }

  // Enhanced context retrieval for AI chat
  async getContextForQuery(query, options = {}) {
    const searchResult = await this.searchDocuments(query, options);
    
    if (!searchResult.success || searchResult.chunks.length === 0) {
      return {
        context: '',
        sources: [],
        foundRelevantContent: false,
        searchMethods: [],
        totalResults: 0
      };
    }

    // Build enhanced context with better formatting
    const contextChunks = searchResult.chunks.slice(0, 3);
    const context = contextChunks.map((chunk, index) => {
      const relevanceInfo = options.includeRelevanceScores ? 
        ` (Relevance: ${chunk.relevanceScore.toFixed(2)}, Method: ${chunk.method})` : '';
      
      return `[Source ${index + 1}: ${chunk.document.originalName}${relevanceInfo}]\n${chunk.content}`;
    }).join('\n\n---\n\n');

    const sources = contextChunks.map(chunk => ({
      filename: chunk.document.originalName,
      category: chunk.document.category,
      chunkIndex: chunk.chunkIndex,
      relevanceScore: chunk.relevanceScore,
      retrievalMethod: chunk.method,
      isLegacy: chunk.document.isLegacy
    }));

    return {
      context,
      sources,
      foundRelevantContent: true,
      totalResults: searchResult.totalFound,
      searchMethods: searchResult.searchMethods,
      conversationContext: searchResult.conversationContext
    };
  }

  // Exact phrase matching
  async findExactMatches(query, whereClause) {
    const quotedPhrases = this.extractQuotedPhrases(query);
    const keyPhrases = this.extractKeyPhrases(query);
    
    const searchPhrases = [...quotedPhrases, ...keyPhrases];
    if (searchPhrases.length === 0) return [];

    const orConditions = searchPhrases.map(phrase => ({
      content: { [Op.like]: `%${phrase}%` }
    }));

    return await DocumentChunk.findAll({
      include: [{
        model: Document,
        as: 'document',
        where: whereClause,
        attributes: ['originalName', 'category', 'isLegacy', 'createdAt']
      }],
      where: { [Op.or]: orConditions },
      order: [['createdAt', 'DESC']]
    });
  }

  // Advanced keyword matching with synonyms and stemming
  async findKeywordMatches(query, whereClause) {
    const keywords = this.extractEnhancedKeywords(query);
    const synonyms = this.expandWithSynonyms(keywords);
    
    const searchTerms = [...keywords, ...synonyms];
    const searchConditions = searchTerms.map(term => ({
      content: { [Op.like]: `%${term}%` }
    }));

    return await DocumentChunk.findAll({
      include: [{
        model: Document,
        as: 'document',
        where: whereClause,
        attributes: ['originalName', 'category', 'isLegacy', 'createdAt']
      }],
      where: { [Op.or]: searchConditions },
      order: [['createdAt', 'DESC']]
    });
  }

  // Semantic similarity matching (placeholder for vector embeddings)
  async findSemanticMatches(queryEmbedding, whereClause, threshold) {
    // For now, this is a placeholder that returns similar documents
    // In a full implementation, you would:
    // 1. Store document embeddings in the database
    // 2. Calculate cosine similarity between query and document embeddings
    // 3. Return documents above the similarity threshold
    
    console.log('Semantic search not fully implemented - falling back to enhanced keyword matching');
    return [];
  }

  // Context-aware matching based on conversation history
  async findContextAwareMatches(conversationId, query, whereClause) {
    try {
      // Get topics and entities mentioned in the conversation
      const conversationTopics = await this.extractConversationTopics(conversationId);
      
      if (conversationTopics.length === 0) return [];

      const topicConditions = conversationTopics.map(topic => ({
        content: { [Op.like]: `%${topic}%` }
      }));

      return await DocumentChunk.findAll({
        include: [{
          model: Document,
          as: 'document',
          where: whereClause,
          attributes: ['originalName', 'category', 'isLegacy', 'createdAt']
        }],
        where: { [Op.or]: topicConditions },
        limit: 10
      });

    } catch (error) {
      console.warn('Context-aware matching failed:', error.message);
      return [];
    }
  }

  // Enhanced relevance scoring with multiple factors
  calculateEnhancedRelevanceScore(chunk, query, options = {}) {
    let score = 0;
    const content = chunk.content.toLowerCase();
    const queryLower = query.toLowerCase();

    // Base keyword matching score
    const keywords = this.extractEnhancedKeywords(query);
    let keywordMatches = 0;
    keywords.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      keywordMatches += matches;
    });
    score += keywordMatches * 10;

    // Exact phrase bonus
    if (content.includes(queryLower)) {
      score += 50;
    }

    // Position-based scoring (earlier mentions are more important)
    const firstMatch = content.indexOf(keywords[0]?.toLowerCase() || '');
    if (firstMatch >= 0) {
      const positionScore = Math.max(0, 20 - (firstMatch / content.length) * 20);
      score += positionScore;
    }

    // Document freshness (newer documents get slight boost)
    if (chunk.document?.createdAt) {
      const ageInDays = (Date.now() - new Date(chunk.document.createdAt)) / (1000 * 60 * 60 * 24);
      const freshnessScore = Math.max(0, 10 - (ageInDays / 30));
      score += freshnessScore;
    }

    // Document category relevance (some categories might be more important)
    const categoryBoosts = {
      'policies_procedures': 1.2,
      'job_frameworks': 1.1,
      'compliance_documents': 1.3
    };
    const categoryBoost = categoryBoosts[chunk.document?.category] || 1.0;
    score *= categoryBoost;

    // Legacy document penalty (unless specifically looking for historical data)
    if (chunk.document?.isLegacy && !query.includes('historical') && !query.includes('legacy')) {
      score *= 0.8;
    }

    // Chunk quality score (longer, more complete chunks get bonus)
    if (chunk.wordCount > 100) {
      score += 5;
    }
    if (chunk.wordCount > 200) {
      score += 5;
    }

    // Conversation context bonus
    if (options.hasConversationContext) {
      score *= 1.1;
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  // Extract enhanced keywords with better language processing
  extractEnhancedKeywords(query) {
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'how', 'what', 'where', 'when', 'why', 'which', 'who', 'can', 'could', 'would', 'should',
      'this', 'that', 'these', 'those', 'tell', 'me', 'about', 'is', 'are', 'was', 'were',
      'do', 'does', 'did', 'will', 'have', 'has', 'had'
    ]);

    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Extract phrases (2-3 word combinations)
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(words[i] + ' ' + words[i + 1]);
      if (i < words.length - 2) {
        phrases.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
      }
    }

    return [...new Set([...words, ...phrases])]; // Remove duplicates
  }

  // Expand keywords with synonyms (simple implementation)
  expandWithSynonyms(keywords) {
    const synonymMap = {
      'policy': ['procedure', 'guideline', 'rule', 'regulation'],
      'employee': ['worker', 'staff', 'personnel'],
      'manager': ['supervisor', 'director', 'leader'],
      'training': ['education', 'learning', 'development'],
      'performance': ['evaluation', 'assessment', 'review'],
      'salary': ['compensation', 'pay', 'wage', 'remuneration'],
      'leave': ['vacation', 'absence', 'time off'],
      'safety': ['security', 'protection', 'welfare']
    };

    const synonyms = [];
    keywords.forEach(keyword => {
      if (synonymMap[keyword]) {
        synonyms.push(...synonymMap[keyword]);
      }
    });

    return synonyms;
  }

  // Extract quoted phrases from query
  extractQuotedPhrases(query) {
    const quotedPhrases = [];
    const regex = /"([^"]+)"/g;
    let match;
    
    while ((match = regex.exec(query)) !== null) {
      quotedPhrases.push(match[1]);
    }
    
    return quotedPhrases;
  }

  // Extract key phrases using simple NLP
  extractKeyPhrases(query) {
    // Simple implementation - look for capitalized phrases and common HR terms
    const hrTerms = [
      'collective agreement', 'job description', 'performance review',
      'safety protocol', 'training program', 'company policy',
      'leave policy', 'compensation plan', 'organizational chart'
    ];

    const foundPhrases = [];
    const queryLower = query.toLowerCase();
    
    hrTerms.forEach(term => {
      if (queryLower.includes(term)) {
        foundPhrases.push(term);
      }
    });

    return foundPhrases;
  }

  // Get query embedding (placeholder for actual embedding generation)
  async getQueryEmbedding(query) {
    // Check cache first
    if (this.embeddingCache.has(query)) {
      return this.embeddingCache.get(query);
    }

    try {
      // In a full implementation, you would call an embedding API here
      // For now, we'll simulate an embedding as a simple hash
      const simpleEmbedding = this.generateSimpleEmbedding(query);
      
      // Cache the result
      if (this.embeddingCache.size >= this.maxCacheSize) {
        const firstKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(firstKey);
      }
      this.embeddingCache.set(query, simpleEmbedding);
      
      return simpleEmbedding;
    } catch (error) {
      console.warn('Failed to generate query embedding:', error.message);
      return null;
    }
  }

  // Simple embedding generation (placeholder)
  generateSimpleEmbedding(text) {
    // This is a very simple hash-based "embedding" for demonstration
    // In a real implementation, you'd use proper embedding models
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(100).fill(0);
    
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      embedding[hash % 100] += 1;
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  // Simple hash function
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Extract conversation topics for context-aware search
  async extractConversationTopics(conversationId) {
    try {
      const recentTurns = await ConversationTurn.findAll({
        where: { conversationId },
        order: [['createdAt', 'DESC']],
        limit: 3,
        attributes: ['userMessage']
      });

      const allMessages = recentTurns.map(turn => turn.userMessage).join(' ');
      const keywords = this.extractEnhancedKeywords(allMessages);
      
      // Return most relevant topics (filter out very common words)
      return keywords.filter(keyword => keyword.length > 3).slice(0, 10);

    } catch (error) {
      console.warn('Failed to extract conversation topics:', error.message);
      return [];
    }
  }

  // Calculate base score (for backwards compatibility)
  calculateBaseScore(chunk, query) {
    const content = chunk.content.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/);
    let score = 0;
    
    queryWords.forEach(word => {
      const matches = (content.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    });

    if (content.includes(query.toLowerCase())) {
      score += 10;
    }

    return score;
  }

  // Calculate advanced score with multiple factors
  calculateAdvancedScore(chunk, query) {
    return this.calculateEnhancedRelevanceScore(chunk, query);
  }

  // Store conversation for context management
  async storeConversationTurn(conversationId, userMessage, assistantResponse, sources = []) {
    try {
      // Ensure conversation exists
      const [conversation] = await Conversation.findOrCreate({
        where: { id: conversationId },
        defaults: {
          id: conversationId,
          userId: 'system', // You might want to pass this as a parameter
          title: userMessage.substring(0, 100)
        }
      });

      // Store the conversation turn
      await ConversationTurn.create({
        conversationId,
        userMessage,
        assistantResponse,
        sources: JSON.stringify(sources),
        timestamp: new Date()
      });

      console.log('Conversation turn stored successfully');
    } catch (error) {
      console.error('Failed to store conversation turn:', error);
    }
  }

  // Get conversation history
  async getConversationHistory(conversationId, limit = 10) {
    try {
      const turns = await ConversationTurn.findAll({
        where: { conversationId },
        order: [['createdAt', 'DESC']],
        limit,
        attributes: ['userMessage', 'assistantResponse', 'sources', 'createdAt']
      });

      return turns.reverse().map(turn => ({
        userMessage: turn.userMessage,
        assistantResponse: turn.assistantResponse,
        sources: JSON.parse(turn.sources || '[]'),
        timestamp: turn.createdAt
      }));

    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }
}

module.exports = new EnhancedRagService();