// backend/config/flux-ai.js

require('dotenv').config();

const config = {
  baseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com',
  apiKey: process.env.FLUX_AI_API_KEY,
  model: process.env.FLUX_AI_MODEL ? process.env.FLUX_AI_MODEL.trim() : 'llama-3.1-8b-instruct',
  modelId: process.env.FLUX_AI_MODEL_ID || 'llama-3.1-8b-instruct',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB default

  endpoints: {
    balance: '/v1/balance',
    llms: '/v1/llms',
    chat: '/v1/chat/completions',
    files: '/v1/files'
  },

  isConfigured: function() {
    return !!this.apiKey;
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

Be specific, accurate, and focus on actionable categorization that helps with document organization and retrieval.`,
      
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
  }
};

module.exports = config;