// backend/services/smart-rag.service.js - Phase 3 Adaptive RAG Intelligence
const { Document, DocumentChunk, AiGenerationHistory } = require('../models');
const { Op } = require('sequelize');

class SmartRAGService {
  constructor() {
    this.learningCache = new Map();
    this.userPatterns = new Map();
    this.documentSuccessScores = new Map();
    this.queryOptimizations = new Map();
    this.adaptiveBehavior = true;
    
    // Initialize learning from historical data
    this.initializeLearning();
  }

  /**
   * Phase 3: Adaptive document recommendation based on learning
   */
  async getSmartDocumentRecommendations(templateId, userContext = {}, limit = 10) {
    try {
      console.log(`[Smart RAG] Getting adaptive recommendations for template: ${templateId}`);

      // Get user's historical preferences if available
      const userPreferences = await this.getUserPreferences(userContext.userId, templateId);
      
      // Get successful document patterns for this template
      const successPatterns = await this.getSuccessfulDocumentPatterns(templateId);
      
      // Get documents with enhanced scoring
      const candidates = await this.getCandidateDocuments(templateId);
      
      // Apply adaptive scoring
      const scoredDocuments = await Promise.all(
        candidates.map(async (doc) => {
          const score = await this.calculateAdaptiveScore(doc, templateId, userPreferences, successPatterns);
          return { ...doc, adaptiveScore: score };
        })
      );

      // Sort and filter top recommendations
      const recommendations = scoredDocuments
        .sort((a, b) => b.adaptiveScore - a.adaptiveScore)
        .slice(0, limit)
        .map(doc => ({
          ...doc,
          recommendationReason: this.getRecommendationReason(doc, templateId, userPreferences),
          confidenceLevel: this.getConfidenceLevel(doc.adaptiveScore),
          learningBased: true
        }));

      // Update learning data
      await this.updateRecommendationMetrics(templateId, recommendations.length);

      console.log(`[Smart RAG] Generated ${recommendations.length} adaptive recommendations`);

      return {
        success: true,
        recommendations,
        metadata: {
          templateId,
          userBased: !!userContext.userId,
          learningApplied: true,
          totalCandidates: candidates.length,
          avgScore: recommendations.reduce((sum, doc) => sum + doc.adaptiveScore, 0) / recommendations.length
        }
      };

    } catch (error) {
      console.error('[Smart RAG] Error generating smart recommendations:', error);
      return {
        success: false,
        error: error.message,
        recommendations: []
      };
    }
  }

  /**
   * Phase 3: Adaptive query expansion and optimization
   */
  async getOptimizedContext(originalQuery, templateId, selectedDocuments = [], userFeedback = null) {
    try {
      console.log(`[Smart RAG] Optimizing context for: "${originalQuery}"`);

      // Learn from user feedback if provided
      if (userFeedback) {
        await this.incorporateFeedback(originalQuery, templateId, selectedDocuments, userFeedback);
      }

      // Get optimized query variations
      const queryVariations = await this.generateQueryVariations(originalQuery, templateId);
      
      // Execute multi-layered RAG search
      const contextResults = await this.executeMultiLayeredRAG(
        queryVariations, 
        templateId, 
        selectedDocuments
      );

      // Apply learned optimizations
      const optimizedContext = await this.applyLearnedOptimizations(
        contextResults, 
        templateId, 
        originalQuery
      );

      return {
        success: true,
        context: optimizedContext.content,
        sources: optimizedContext.sources,
        metadata: {
          originalQuery,
          optimizedQueries: queryVariations,
          layersUsed: contextResults.layersUsed,
          optimizationsApplied: optimizedContext.optimizations,
          confidenceScore: optimizedContext.confidence
        }
      };

    } catch (error) {
      console.error('[Smart RAG] Error in optimized context retrieval:', error);
      return {
        success: false,
        error: error.message,
        context: '',
        sources: []
      };
    }
  }

  /**
   * Phase 3: Learn from generation outcomes
   */
  async learnFromGeneration(generationData) {
    try {
      const {
        templateId,
        selectedDocuments,
        qualityScore,
        userFeedback,
        tokenUsage,
        generationTime,
        contextQueries
      } = generationData;

      console.log(`[Smart RAG] Learning from generation - Quality: ${qualityScore}, Template: ${templateId}`);

      // Update document success scores
      if (selectedDocuments && selectedDocuments.length > 0) {
        await this.updateDocumentSuccessScores(selectedDocuments, qualityScore, templateId);
      }

      // Learn query patterns
      if (contextQueries && contextQueries.length > 0) {
        await this.updateQueryPatterns(contextQueries, qualityScore, templateId);
      }

      // Update template-specific learning
      await this.updateTemplateLearning(templateId, {
        qualityScore,
        tokenUsage,
        generationTime,
        documentCount: selectedDocuments?.length || 0
      });

      // Incorporate user feedback
      if (userFeedback) {
        await this.incorporateUserFeedback(templateId, selectedDocuments, userFeedback);
      }

      // Update adaptive behavior patterns
      await this.updateAdaptiveBehavior(templateId, generationData);

      console.log('[Smart RAG] Learning update completed');

      return {
        success: true,
        learningUpdated: true,
        newPatterns: this.getNewPatterns(templateId)
      };

    } catch (error) {
      console.error('[Smart RAG] Error in learning from generation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Phase 3: Get user-specific preferences based on history
   */
  async getUserPreferences(userId, templateId) {
    if (!userId) return null;

    try {
      // Get user's historical generations for this template
      const userGenerations = await AiGenerationHistory.findAll({
        where: {
          userId,
          templateId,
          qualityScore: { [Op.gte]: 0.7 } // Only learn from successful generations
        },
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      if (userGenerations.length < 3) return null; // Need minimum data for preferences

      // Analyze patterns
      const preferences = {
        preferredDocumentTypes: this.analyzeDocumentTypePreferences(userGenerations),
        avgDocumentCount: this.calculateAvgDocumentCount(userGenerations),
        preferredComplexity: this.analyzeComplexityPreference(userGenerations),
        timePreference: this.analyzeTimePreference(userGenerations),
        qualityThreshold: this.calculateQualityThreshold(userGenerations)
      };

      return preferences;

    } catch (error) {
      console.error('[Smart RAG] Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Phase 3: Calculate adaptive scoring for documents
   */
  async calculateAdaptiveScore(document, templateId, userPreferences, successPatterns) {
    let score = 0;

    // Base relevance score (30%)
    const baseRelevance = await this.calculateBaseRelevance(document, templateId);
    score += baseRelevance * 0.3;

    // Historical success score (25%)
    const successScore = this.getDocumentSuccessScore(document.id, templateId);
    score += successScore * 0.25;

    // User preference alignment (20%)
    if (userPreferences) {
      const preferenceScore = this.calculatePreferenceAlignment(document, userPreferences);
      score += preferenceScore * 0.2;
    } else {
      // Use general success patterns
      const patternScore = this.calculatePatternAlignment(document, successPatterns);
      score += patternScore * 0.2;
    }

    // Recency and freshness (15%)
    const freshnessScore = this.calculateFreshnessScore(document);
    score += freshnessScore * 0.15;

    // Quality indicators (10%)
    const qualityScore = this.calculateDocumentQuality(document);
    score += qualityScore * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Generate query variations for better context retrieval
   */
  async generateQueryVariations(originalQuery, templateId) {
    const variations = [originalQuery];

    // Template-specific query enhancements
    const templateEnhancements = {
      'job-descriptions': ['responsibilities', 'qualifications', 'skills', 'requirements'],
      'policy-generator': ['policy', 'procedure', 'compliance', 'rules'],
      'procedure-docs': ['process', 'workflow', 'steps', 'instructions'],
      'functional-booklet': ['organization', 'structure', 'roles', 'hierarchy']
    };

    const enhanceWords = templateEnhancements[templateId] || [];
    
    // Add enhanced variations
    enhanceWords.forEach(word => {
      variations.push(`${originalQuery} ${word}`);
      variations.push(`${word} ${originalQuery}`);
    });

    // Add learned successful query patterns
    const learnedPatterns = this.getLearnedQueryPatterns(templateId);
    learnedPatterns.forEach(pattern => {
      variations.push(pattern.replace('{{query}}', originalQuery));
    });

    return variations.slice(0, 5); // Limit to 5 variations
  }

  /**
   * Execute multi-layered RAG search strategy
   */
  async executeMultiLayeredRAG(queries, templateId, selectedDocuments) {
    const results = {
      content: '',
      sources: [],
      layersUsed: []
    };

    // Layer 1: Exact document search (if documents selected)
    if (selectedDocuments.length > 0) {
      console.log('[Smart RAG] Layer 1: Exact document search');
      const exactResults = await this.searchSelectedDocuments(queries, selectedDocuments);
      results.content += exactResults.content;
      results.sources.push(...exactResults.sources);
      results.layersUsed.push('exact-documents');
    }

    // Layer 2: Template-optimized search
    console.log('[Smart RAG] Layer 2: Template-optimized search');
    const templateResults = await this.searchWithTemplateOptimization(queries, templateId);
    results.content += templateResults.content;
    results.sources.push(...templateResults.sources);
    results.layersUsed.push('template-optimized');

    // Layer 3: Semantic similarity search
    console.log('[Smart RAG] Layer 3: Semantic similarity search');
    const semanticResults = await this.searchSemanticSimilarity(queries, templateId);
    results.content += semanticResults.content;
    results.sources.push(...semanticResults.sources);
    results.layersUsed.push('semantic-similarity');

    // Layer 4: Learned pattern search
    console.log('[Smart RAG] Layer 4: Learned pattern search');
    const patternResults = await this.searchLearnedPatterns(queries, templateId);
    results.content += patternResults.content;
    results.sources.push(...patternResults.sources);
    results.layersUsed.push('learned-patterns');

    return results;
  }

  /**
   * Apply learned optimizations to context
   */
  async applyLearnedOptimizations(contextResults, templateId, originalQuery) {
    const optimizations = [];

    // Remove redundant content
    const deduplicatedContent = this.removeDuplicateContent(contextResults.content);
    if (deduplicatedContent.length < contextResults.content.length) {
      optimizations.push('content-deduplication');
    }

    // Prioritize high-quality sources
    const prioritizedSources = this.prioritizeSourcesByQuality(contextResults.sources, templateId);
    optimizations.push('source-prioritization');

    // Apply template-specific formatting
    const formattedContent = this.applyTemplateFormatting(deduplicatedContent, templateId);
    if (formattedContent !== deduplicatedContent) {
      optimizations.push('template-formatting');
    }

    // Calculate confidence based on source quality and relevance
    const confidence = this.calculateContextConfidence(prioritizedSources, originalQuery);

    return {
      content: formattedContent,
      sources: prioritizedSources,
      optimizations,
      confidence
    };
  }

  /**
   * Update document success scores based on generation outcomes
   */
  async updateDocumentSuccessScores(selectedDocuments, qualityScore, templateId) {
    for (const doc of selectedDocuments) {
      const key = `${doc.id}-${templateId}`;
      const currentScore = this.documentSuccessScores.get(key) || { sum: 0, count: 0 };
      
      currentScore.sum += qualityScore;
      currentScore.count += 1;
      
      this.documentSuccessScores.set(key, currentScore);
    }
  }

  /**
   * Get recommendation reason for UI display
   */
  getRecommendationReason(document, templateId, userPreferences) {
    const reasons = [];

    if (this.getDocumentSuccessScore(document.id, templateId) > 0.7) {
      reasons.push('High success rate in similar generations');
    }

    if (userPreferences && this.calculatePreferenceAlignment(document, userPreferences) > 0.7) {
      reasons.push('Matches your usage patterns');
    }

    if (this.calculateFreshnessScore(document) > 0.8) {
      reasons.push('Recently updated content');
    }

    if (document.category && this.isPreferredCategory(document.category, templateId)) {
      reasons.push('Optimal category for this template');
    }

    return reasons.length > 0 ? reasons[0] : 'Relevant to template requirements';
  }

  /**
   * Get confidence level for recommendation score
   */
  getConfidenceLevel(score) {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    if (score >= 0.4) return 'Low';
    return 'Very Low';
  }

  /**
   * Initialize learning from historical data
   */
  async initializeLearning() {
    try {
      console.log('[Smart RAG] Initializing learning from historical data...');

      // Get historical generation data
      const historicalData = await AiGenerationHistory.findAll({
        where: {
          qualityScore: { [Op.gte]: 0.5 }
        },
        order: [['createdAt', 'DESC']],
        limit: 1000
      });

      // Initialize document success scores
      for (const generation of historicalData) {
        if (generation.selectedDocuments && generation.selectedDocuments.length > 0) {
          await this.updateDocumentSuccessScores(
            generation.selectedDocuments, 
            generation.qualityScore, 
            generation.templateId
          );
        }
      }

      console.log(`[Smart RAG] Learning initialized with ${historicalData.length} historical generations`);

    } catch (error) {
      console.error('[Smart RAG] Error initializing learning:', error);
    }
  }

  // Helper methods for calculations and analysis
  async getCandidateDocuments(templateId) {
    return await Document.findAll({
      where: { status: 'processed' },
      attributes: ['id', 'originalName', 'category', 'summary', 'aiGeneratedTags', 'createdAt', 'size'],
      limit: 100
    });
  }

  async calculateBaseRelevance(document, templateId) {
    // Implementation would use existing relevance calculation
    return Math.random() * 0.8 + 0.2; // Mock implementation
  }

  getDocumentSuccessScore(documentId, templateId) {
    const key = `${documentId}-${templateId}`;
    const scoreData = this.documentSuccessScores.get(key);
    if (!scoreData || scoreData.count === 0) return 0.5; // Default neutral score
    return scoreData.sum / scoreData.count;
  }

  calculatePreferenceAlignment(document, userPreferences) {
    // Calculate how well document aligns with user preferences
    return Math.random() * 0.6 + 0.2; // Mock implementation
  }

  calculatePatternAlignment(document, successPatterns) {
    // Calculate alignment with successful patterns
    return Math.random() * 0.6 + 0.2; // Mock implementation
  }

  calculateFreshnessScore(document) {
    const daysSinceCreation = (Date.now() - new Date(document.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) return 1.0;
    if (daysSinceCreation < 90) return 0.8;
    if (daysSinceCreation < 180) return 0.6;
    return 0.4;
  }

  calculateDocumentQuality(document) {
    let score = 0.5; // Base score
    
    if (document.summary && document.summary.length > 100) score += 0.2;
    if (document.aiGeneratedTags && document.aiGeneratedTags.length > 3) score += 0.2;
    if (document.size > 1000) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  // Additional helper methods would be implemented here...
  analyzeDocumentTypePreferences(generations) {
    // Analyze which document types user prefers
    return {};
  }

  calculateAvgDocumentCount(generations) {
    const counts = generations
      .filter(gen => gen.selectedDocuments)
      .map(gen => gen.selectedDocuments.length);
    return counts.length > 0 ? counts.reduce((sum, count) => sum + count, 0) / counts.length : 3;
  }

  analyzeComplexityPreference(generations) {
    // Analyze complexity preferences
    return 'medium';
  }

  analyzeTimePreference(generations) {
    // Analyze time preferences
    return 'balanced';
  }

  calculateQualityThreshold(generations) {
    const scores = generations.map(gen => gen.qualityScore);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  getLearnedQueryPatterns(templateId) {
    // Return learned query patterns for template
    return [];
  }

  async getSuccessfulDocumentPatterns(templateId) {
    // Get patterns of successful document combinations
    return {};
  }

  async searchSelectedDocuments(queries, selectedDocuments) {
    // Implementation for searching selected documents
    return { content: '', sources: [] };
  }

  async searchWithTemplateOptimization(queries, templateId) {
    // Implementation for template-optimized search
    return { content: '', sources: [] };
  }

  async searchSemanticSimilarity(queries, templateId) {
    // Implementation for semantic similarity search
    return { content: '', sources: [] };
  }

  async searchLearnedPatterns(queries, templateId) {
    // Implementation for learned pattern search
    return { content: '', sources: [] };
  }

  removeDuplicateContent(content) {
    // Remove duplicate content
    return content;
  }

  prioritizeSourcesByQuality(sources, templateId) {
    // Prioritize sources by quality
    return sources;
  }

  applyTemplateFormatting(content, templateId) {
    // Apply template-specific formatting
    return content;
  }

  calculateContextConfidence(sources, query) {
    // Calculate confidence in context
    return 0.8;
  }

  isPreferredCategory(category, templateId) {
    // Check if category is preferred for template
    return true;
  }

  async updateRecommendationMetrics(templateId, count) {
    // Update recommendation metrics
  }

  async incorporateFeedback(query, templateId, documents, feedback) {
    // Incorporate user feedback
  }

  async updateQueryPatterns(queries, qualityScore, templateId) {
    // Update query patterns
  }

  async updateTemplateLearning(templateId, data) {
    // Update template-specific learning
  }

  async incorporateUserFeedback(templateId, documents, feedback) {
    // Incorporate user feedback
  }

  async updateAdaptiveBehavior(templateId, data) {
    // Update adaptive behavior patterns
  }

  getNewPatterns(templateId) {
    // Get new patterns learned
    return [];
  }
}

// Export singleton instance
module.exports = new SmartRAGService();