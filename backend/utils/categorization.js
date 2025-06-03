// backend/utils/categorization.js - Enhanced with Flux AI
const { Category } = require('../models');
const { categorizeDocument: fluxCategorizeDocument } = require('../services/flux-ai.service');

class CategorizationSystem {
  constructor() {
    this.maxDynamicCategories = 7;
    this.confidenceThreshold = 0.7;
    
    // Predefined category patterns for fallback analysis
    this.categoryPatterns = {
      'policies_procedures': {
        keywords: ['policy', 'procedure', 'guideline', 'rule', 'regulation', 'compliance', 'code of conduct'],
        patterns: /\b(policy|procedure|guideline|regulation|compliance|code of conduct|standard operating|SOP)\b/gi
      },
      'job_frameworks': {
        keywords: ['job description', 'role', 'responsibilities', 'requirements', 'qualifications', 'position'],
        patterns: /\b(job description|role|position|responsibilities|qualifications|requirements|JD)\b/gi
      },
      'training_materials': {
        keywords: ['training', 'course', 'learning', 'education', 'skill', 'development', 'tutorial'],
        patterns: /\b(training|course|learning|education|skill development|tutorial|workshop)\b/gi
      },
      'compliance_documents': {
        keywords: ['compliance', 'legal', 'regulation', 'audit', 'certification', 'standard'],
        patterns: /\b(compliance|legal|regulation|audit|certification|ISO|standard)\b/gi
      },
      'legacy_assessment_data': {
        keywords: ['assessment', 'evaluation', 'performance', 'review', 'appraisal', 'historic', 'legacy'],
        patterns: /\b(assessment|evaluation|performance review|appraisal|legacy|historic|past)\b/gi
      },
      'legacy_survey_data': {
        keywords: ['survey', 'questionnaire', 'feedback', 'response', 'poll', 'historic', 'legacy'],
        patterns: /\b(survey|questionnaire|feedback|poll|legacy|historic|past data)\b/gi
      },
      'organizational_guidelines': {
        keywords: ['organization', 'structure', 'hierarchy', 'process', 'workflow', 'guideline'],
        patterns: /\b(organizational|structure|hierarchy|workflow|process|guideline)\b/gi
      }
    };
  }

  // Main categorization method - now AI-first with fallback
  async categorizeDocument(text, filename, metadata = {}) {
    try {
      console.log('Starting document categorization for:', filename);

      // Step 1: Try AI-powered categorization first
      let aiResults = null;
      const existingCategories = await this.getActiveCategories();
      
      try {
        aiResults = await fluxCategorizeDocument(text, filename, existingCategories);
        console.log('AI categorization result:', aiResults);
      } catch (error) {
        console.warn('AI categorization failed:', error.message);
      }

      // Step 2: If AI succeeds and confidence is good, use AI result
      if (aiResults && aiResults.success && aiResults.confidence >= this.confidenceThreshold) {
        console.log('Using AI categorization with high confidence');
        
        // Handle new category creation if suggested by AI
        let finalCategory = aiResults.category;
        if (aiResults.isNewCategory && aiResults.newCategoryDescription) {
          const newCategory = await this.considerNewCategory(
            aiResults.category,
            aiResults.newCategoryDescription,
            aiResults.confidence
          );
          if (newCategory) {
            finalCategory = newCategory.name;
          }
        }

        // Update category usage
        await this.updateCategoryUsage(finalCategory);

        return {
          success: true,
          category: finalCategory,
          confidence: aiResults.confidence,
          method: 'ai-enhanced',
          aiSuggestions: [],
          tags: aiResults.tags || [],
          reasoning: aiResults.reasoning || 'AI analysis',
          documentType: aiResults.documentType || 'unknown'
        };
      }

      // Step 3: If AI fails or low confidence, fall back to pattern-based categorization
      console.log('Falling back to pattern-based categorization');
      const patternResults = await this.patternBasedCategorization(text, filename);

      // Step 4: Combine any available AI insights with pattern results
      const finalCategory = await this.combineCategorizations(patternResults, aiResults);
      
      // Step 5: Generate tags
      const tags = await this.generateTags(text, finalCategory);

      // Step 6: Update category usage statistics
      await this.updateCategoryUsage(finalCategory.category);

      return {
        success: true,
        category: finalCategory.category,
        confidence: finalCategory.confidence,
        method: finalCategory.method,
        aiSuggestions: aiResults?.tags || [],
        tags: tags,
        reasoning: finalCategory.reasoning,
        documentType: aiResults?.documentType || 'unknown'
      };

    } catch (error) {
      console.error('Categorization error:', error);
      return {
        success: false,
        category: null,
        confidence: 0,
        error: error.message,
        tags: [],
        method: 'error'
      };
    }
  }

  // Enhanced pattern-based categorization (fallback method)
  async patternBasedCategorization(text, filename) {
    const scores = {};
    const textLower = text.toLowerCase();
    const filenameLower = filename.toLowerCase();
    
    // Analyze content against each category pattern
    for (const [categoryName, categoryData] of Object.entries(this.categoryPatterns)) {
      let score = 0;
      
      // Keyword matching in content
      for (const keyword of categoryData.keywords) {
        const keywordCount = (textLower.match(new RegExp(keyword, 'g')) || []).length;
        score += keywordCount * 2;
      }
      
      // Pattern matching
      const patternMatches = (text.match(categoryData.patterns) || []).length;
      score += patternMatches * 3;
      
      // Filename analysis
      for (const keyword of categoryData.keywords) {
        if (filenameLower.includes(keyword)) {
          score += 5;
        }
      }
      
      scores[categoryName] = score;
    }

    // Find best match
    const bestMatch = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );
    
    const maxScore = Math.max(...Object.values(scores));
    const confidence = Math.min(maxScore / 10, 1.0); // Normalize to 0-1

    return {
      category: bestMatch,
      confidence: confidence,
      method: 'pattern-based',
      scores: scores,
      reasoning: `Pattern matching found ${maxScore} indicators for ${bestMatch}`
    };
  }

  // Combine pattern and AI results intelligently
  async combineCategorizations(patternResults, aiResults) {
    // If no AI results, use pattern results
    if (!aiResults || !aiResults.success) {
      return patternResults;
    }

    // If AI suggests new category and confidence is high, consider it
    if (aiResults.isNewCategory && aiResults.confidence > 0.8) {
      const newCategory = await this.considerNewCategory(
        aiResults.category, 
        aiResults.newCategoryDescription,
        aiResults.confidence
      );
      
      if (newCategory) {
        return {
          category: newCategory.name,
          confidence: aiResults.confidence,
          method: 'ai-new-category',
          reasoning: `AI suggested new category: ${aiResults.reasoning}`
        };
      }
    }

    // Use highest confidence result
    if (aiResults.confidence > patternResults.confidence) {
      return {
        category: aiResults.category,
        confidence: aiResults.confidence,
        method: 'ai-enhanced',
        reasoning: aiResults.reasoning
      };
    } else {
      return {
        category: patternResults.category,
        confidence: patternResults.confidence,
        method: 'pattern-verified',
        reasoning: patternResults.reasoning
      };
    }
  }

  // Consider creating a new dynamic category
  async considerNewCategory(categoryName, description, confidence) {
    try {
      // Check if we're at the limit for dynamic categories
      const dynamicCategoryCount = await Category.count({
        where: { type: 'dynamic', isActive: true }
      });

      if (dynamicCategoryCount >= this.maxDynamicCategories) {
        console.log('Maximum dynamic categories reached, skipping new category creation');
        return null;
      }

      // Check if category already exists
      const existing = await Category.findOne({
        where: { name: categoryName }
      });

      if (existing) {
        return existing;
      }

      // Create new dynamic category
      const newCategory = await Category.create({
        name: categoryName,
        type: 'dynamic',
        description: description || `AI-suggested category: ${categoryName}`,
        confidence: confidence,
        aiSuggested: true,
        usageCount: 1
      });

      console.log(`Created new dynamic category: ${categoryName}`);
      return newCategory;

    } catch (error) {
      console.error('Failed to create new category:', error);
      return null;
    }
  }

  // Enhanced tag generation with AI and pattern-based approaches
  async generateTags(text, category) {
    const tags = new Set();
    
    // Add category-based tags
    if (category.category) {
      tags.add(category.category.replace('_', ' '));
    }

    // Extract key terms from text using improved algorithm
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .match(/\b\w{4,}\b/g) || [];
    
    const wordFreq = {};
    
    words.forEach(word => {
      // Skip common words
      if (!this.isCommonWord(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Get most frequent meaningful words
    Object.entries(wordFreq)
      .filter(([word, freq]) => freq > 1 && word.length > 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([word]) => tags.add(word));

    // Add document type-specific tags
    if (category.category) {
      const categorySpecificTags = this.getCategorySpecificTags(category.category, text);
      categorySpecificTags.forEach(tag => tags.add(tag));
    }

    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }

  // Check if word is common and should be excluded from tags
  isCommonWord(word) {
    const commonWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 
      'said', 'each', 'which', 'their', 'time', 'would', 'there', 
      'could', 'other', 'after', 'first', 'well', 'also', 'some',
      'what', 'only', 'more', 'very', 'when', 'much', 'made',
      'over', 'such', 'even', 'most', 'than', 'here', 'just',
      'can', 'should', 'may', 'might', 'must', 'shall'
    ]);
    return commonWords.has(word);
  }

  // Get category-specific tags based on content analysis
  getCategorySpecificTags(categoryName, text) {
    const textLower = text.toLowerCase();
    const tags = [];

    switch (categoryName) {
      case 'policies_procedures':
        if (textLower.includes('employee')) tags.push('employee-policy');
        if (textLower.includes('safety')) tags.push('safety');
        if (textLower.includes('conduct')) tags.push('conduct');
        break;
      case 'job_frameworks':
        if (textLower.includes('manager')) tags.push('management');
        if (textLower.includes('senior')) tags.push('senior-level');
        if (textLower.includes('junior')) tags.push('junior-level');
        break;
      case 'training_materials':
        if (textLower.includes('certification')) tags.push('certification');
        if (textLower.includes('workshop')) tags.push('workshop');
        if (textLower.includes('online')) tags.push('online-training');
        break;
    }

    return tags;
  }

  // Update category usage statistics
  async updateCategoryUsage(categoryName) {
    try {
      await Category.increment('usageCount', {
        where: { name: categoryName }
      });
    } catch (error) {
      console.error('Failed to update category usage:', error);
    }
  }

  // Get active categories for UI and AI
  async getActiveCategories() {
    try {
      return await Category.findAll({
        where: { isActive: true },
        order: [['type', 'ASC'], ['usageCount', 'DESC'], ['name', 'ASC']]
      });
    } catch (error) {
      console.error('Failed to get active categories:', error);
      return [];
    }
  }

  // Get enhanced categorization statistics
  async getCategorizationStatistics() {
    try {
      const stats = await Category.findAll({
        attributes: ['name', 'type', 'usageCount', 'confidence', 'aiSuggested'],
        where: { isActive: true },
        order: [['usageCount', 'DESC']]
      });

      return {
        totalCategories: stats.length,
        staticCategories: stats.filter(s => s.type === 'static').length,
        dynamicCategories: stats.filter(s => s.type === 'dynamic').length,
        aiSuggestedCategories: stats.filter(s => s.aiSuggested).length,
        mostUsed: stats.slice(0, 5),
        leastUsed: stats.filter(s => s.usageCount === 0),
        averageConfidence: stats.reduce((sum, s) => sum + (s.confidence || 0), 0) / stats.length
      };
    } catch (error) {
      console.error('Failed to get categorization statistics:', error);
      return {};
    }
  }

  // Test AI categorization capability
  async testAiCategorization() {
    try {
      const testText = "This is a sample employee handbook describing company policies and procedures for workplace conduct.";
      const testFilename = "employee-handbook.pdf";
      const existingCategories = await this.getActiveCategories();
      
      const result = await fluxCategorizeDocument(testText, testFilename, existingCategories);
      return {
        success: result.success,
        message: result.success ? 'AI categorization is working properly' : 'AI categorization failed',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'AI categorization test failed',
        error: error.message
      };
    }
  }
}

module.exports = new CategorizationSystem();