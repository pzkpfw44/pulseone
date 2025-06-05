// backend/config/flux-ai.js - Fixed to work with database settings

require('dotenv').config();

const config = {
  baseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com',
  apiKey: null, // Will be loaded from database or env
  model: null, // Will be loaded from database or env
  modelId: null, // Will be loaded from database or env
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB default
  
  // Cache for database settings to avoid repeated queries
  _dbSettings: null,
  _dbSettingsLoaded: false,

  endpoints: {
    balance: '/v1/balance',
    llms: '/v1/llms',
    chat: '/v1/chat/completions',
    files: '/v1/files'
  },

  // Load settings from database first, then fallback to environment variables
  async loadSettings() {
    if (this._dbSettingsLoaded) {
      return this._dbSettings;
    }

    try {
      // Only load database if we're in a Node.js environment (not during module require)
      if (typeof require !== 'undefined') {
        const { SystemSetting } = require('../models');
        
        const aiConfig = await SystemSetting.findOne({
          where: { key: 'ai_configuration' }
        });

        if (aiConfig && aiConfig.value) {
          this._dbSettings = aiConfig.value;
          this._dbSettingsLoaded = true;
          
          // Set the values from database
          this.apiKey = aiConfig.value.fluxApiKey || process.env.FLUX_AI_API_KEY;
          this.model = aiConfig.value.model || process.env.FLUX_AI_MODEL || 'llama-3.1-8b-instruct';
          this.modelId = aiConfig.value.model || process.env.FLUX_AI_MODEL_ID || 'llama-3.1-8b-instruct';
          
          console.log(`[Config] Loaded from database - Model: ${this.model}, API Key: ${this.apiKey ? '***configured***' : 'missing'}`);
          return this._dbSettings;
        }
      }
    } catch (error) {
      console.warn('[Config] Could not load from database, using environment variables:', error.message);
    }

    // Fallback to environment variables
    this.apiKey = process.env.FLUX_AI_API_KEY;
    this.model = process.env.FLUX_AI_MODEL ? process.env.FLUX_AI_MODEL.trim() : 'llama-3.1-8b-instruct';
    this.modelId = process.env.FLUX_AI_MODEL_ID || 'llama-3.1-8b-instruct';
    
    console.log(`[Config] Using environment variables - Model: ${this.model}, API Key: ${this.apiKey ? '***configured***' : 'missing'}`);
    
    this._dbSettingsLoaded = true;
    return null;
  },

  // Get current API key (load from database if needed)
  async getApiKey() {
    if (!this.apiKey) {
      await this.loadSettings();
    }
    return this.apiKey || process.env.FLUX_AI_API_KEY;
  },

  // Get current model (load from database if needed)
  async getModel() {
    if (!this.model) {
      await this.loadSettings();
    }
    return this.model || 'llama-3.1-8b-instruct';
  },

  // Synchronous version for backward compatibility
  isConfigured: function() {
    // Check if we have API key from environment or already loaded
    const hasApiKey = !!(this.apiKey || process.env.FLUX_AI_API_KEY);
    return hasApiKey;
  },

  // Async version that checks database too
  async isFullyConfigured() {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();
    return !!(apiKey && model);
  },

  isDevelopment: process.env.NODE_ENV === 'development',

  getEndpointUrl: function(endpoint) {
    return `${this.baseUrl}${this.endpoints[endpoint]}`;
  },

  getSystemPrompt: function(task) {
    const prompts = {
      document_categorization: `You are a specialized AI assistant for analyzing and categorizing business documents. Your task is to:

1. Analyze document content and determine the most appropriate category
2. Suggest new categories if existing ones don't fit well
3. Extract meaningful tags from the document
4. Provide a confidence score for your categorization

Be specific, accurate, and focus on actionable categorization that helps with document organization and retrieval.

Always respond in valid JSON format as specified in the user prompt.`,
      
      content_extraction: `You are an expert at extracting meaningful content from business documents. Focus on:

1. Identifying key themes and topics
2. Extracting actionable information
3. Summarizing main points
4. Identifying document type and purpose

Ignore decorative elements, headers/footers, and focus on substantive content.`,
      
      document_analysis: `You are a document intelligence expert. Analyze the provided document content and provide:

1. Document type classification
2. Key topics and themes
3. Relevance for business operations
4. Suggested organizational structure

Be concise but thorough in your analysis.`
    };
  
    return prompts[task] || prompts.document_categorization;
  },

  // Force reload settings from database (useful when settings are updated)
  async reloadSettings() {
    this._dbSettings = null;
    this._dbSettingsLoaded = false;
    this.apiKey = null;
    this.model = null;
    this.modelId = null;
    
    await this.loadSettings();
    console.log('[Config] Settings reloaded from database');
  },

  // Get all current settings
  async getCurrentSettings() {
    await this.loadSettings();
    return {
      apiKey: this.apiKey ? '***configured***' : null,
      model: this.model,
      modelId: this.modelId,
      baseUrl: this.baseUrl,
      source: this._dbSettings ? 'database' : 'environment'
    };
  }
};

// Auto-load settings when the module is first required
// But don't await it to avoid blocking the require
if (typeof setImmediate !== 'undefined') {
  setImmediate(() => {
    config.loadSettings().catch(err => {
      console.warn('[Config] Initial settings load failed:', err.message);
    });
  });
}

module.exports = config;