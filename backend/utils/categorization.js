// backend/utils/categorization.js
const axios = require('axios');
const { Category } = require('../models');

class CategorizationSystem {
  constructor() {
    this.maxDynamicCategories = 7;
    this.confidenceThreshold = 0.7;
    this.fluxApiUrl = process.env.FLUX_AI_API_URL || 'https://api.flux.ai';
    this.fluxApiKey = process.env.FLUX_AI_API_KEY;
    
    // Predefined category patterns for content analysis
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

  // Main categorization method
  async categorizeDocument(text, filename, metadata = {}) {
    try {
      // Step 1: Pattern-based categorization (fast, local)
      const patternResults = await this.patternBasedCategorization(text, filename);
      
      // Step 2: AI-powered categorization (if pattern confidence is low)
      let aiResults = null;
      if (patternResults.confidence < this.confidenceThreshold) {
        aiResults = await this.aiBasedCategorization(text, filename, metadata);
      }

      // Step 3: Combine results and make final decision
      const finalCategory = await this.combineCategorizations(patternResults, aiResults);
      
      // Step 4: Generate tags
      const tags = await this.generateTags(text, finalCategory);

      // Step 5: Update category usage statistics
      await this.updateCategoryUsage(finalCategory.category);

      return {
        success: true,
        category: finalCategory.category,
        confidence: finalCategory.confidence,
        method: finalCategory.method,
        aiSuggestions: aiResults?.suggestions || [],
        tags: tags,
        reasoning: finalCategory.reasoning
      };

    } catch (error) {
      console.error('Categorization error:', error);
      return {
        success: false,
        category: null,
        confidence: 0,
        error: error.message,
        tags: []
      };
    }
  }

  // Pattern-based categorization using local analysis
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

  // AI-powered categorization using Flux AI
  async aiBasedCategorization(text, filename, metadata) {
    if (!this.fluxApiKey) {
      console.warn('Flux AI API key not configured, skipping AI categorization');
      return null;
    }

    try {
      const existingCategories = await this.getActiveCategories();
      const textPreview = text.substring(0, 2000); // Limit text for API efficiency

      const prompt = this.buildCategorizationPrompt(textPreview, filename, existingCategories);
      
      const response = await axios.post(`${this.fluxApiUrl}/v1/chat/completions`, {
        model: 'flux-replit-code-v1-3b',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR document classifier. Analyze documents and suggest appropriate categories.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      }, {
        headers: {
          'Authorization': `Bearer ${this.fluxApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return this.parseAiCategorization(response.data.choices[0].message.content);

    } catch (error) {
      console.error('AI categorization failed:', error);
      return null;
    }
  }

  // Build categorization prompt for AI
  buildCategorizationPrompt(text, filename, existingCategories) {
    const categoryList = existingCategories.map(cat => `- ${cat.name}: ${cat.description}`).join('\n');
    
    return `
Analyze this document and suggest the most appropriate category:

FILENAME: ${filename}

EXISTING CATEGORIES:
${categoryList}

DOCUMENT CONTENT (preview):
${text}

Tasks:
1. Choose the best existing category OR suggest a new category if none fit well
2. Provide confidence score (0-1)
3. If suggesting a new category, explain why it's needed and provide a description
4. Consider if this is likely legacy/historical data based on content

Respond in JSON format:
{
  "category": "category_name",
  "confidence": 0.95,
  "isNewCategory": false,
  "newCategoryDescription": "",
  "reasoning": "Brief explanation",
  "isLikely Legacy": false
}
`;
  }

  // Parse AI response
  parseAiCategorization(aiResponse) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category,
          confidence: parsed.confidence || 0.5,
          isNewCategory: parsed.isNewCategory || false,
          newCategoryDescription: parsed.newCategoryDescription || '',
          reasoning: parsed.reasoning || 'AI analysis',
          isLikelyLegacy: parsed.isLikelyLegacy || false,
          suggestions: parsed.suggestions || []
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }
    
    return null;
  }

  // Combine pattern and AI results
  async combineCategorizations(patternResults, aiResults) {
    // If no AI results, use pattern results
    if (!aiResults) {
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

  // Generate tags for document
  async generateTags(text, category) {
    const tags = new Set();
    
    // Add category-based tags
    if (category.category) {
      tags.add(category.category.replace('_', ' '));
    }

    // Extract key terms from text
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq = {};
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Get most frequent meaningful words
    const commonWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other']);
    
    Object.entries(wordFreq)
      .filter(([word, freq]) => freq > 2 && !commonWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([word]) => tags.add(word));

    return Array.from(tags).slice(0, 10); // Limit to 10 tags
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

  // Get active categories for UI
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

  // Get categorization statistics
  async getCategorizationStatistics() {
    try {
      const stats = await Category.findAll({
        attributes: ['name', 'type', 'usageCount', 'confidence'],
        where: { isActive: true },
        order: [['usageCount', 'DESC']]
      });

      return {
        totalCategories: stats.length,
        staticCategories: stats.filter(s => s.type === 'static').length,
        dynamicCategories: stats.filter(s => s.type === 'dynamic').length,
        mostUsed: stats.slice(0, 5),
        leastUsed: stats.filter(s => s.usageCount === 0)
      };
    } catch (error) {
      console.error('Failed to get categorization statistics:', error);
      return {};
    }
  }
}

module.exports = new CategorizationSystem();