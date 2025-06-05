// backend/services/flux-ai.service.js - Fixed Model Validation

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fluxAiConfig = require('../config/flux-ai');

// Model name mapping - Updated based on actual Flux AI API response
const MODEL_NAME_MAPPING = {
  // Full names (what's stored in database) -> What API actually uses
  'DeepSeek R1 Distill Qwen 32B': 'DeepSeek R1 Distill Qwen 32B', // Use full ID
  'Llama 3.1 8B Instruct': 'Llama 3.1 8B Instruct',
  'II Medical 8B': 'II Medical 8B',
  
  // Short names (what API returns in displayName) -> Full names for API calls
  'DeepSeek 32B': 'DeepSeek R1 Distill Qwen 32B',
  'Llama 3.1 8B': 'Llama 3.1 8B Instruct',
  'Medical 8B': 'II Medical 8B',
  
  // Legacy names -> Current full names
  'deepseek-r1-distill-qwen-32b': 'DeepSeek R1 Distill Qwen 32B',
  'llama-3.1-8b-instruct': 'Llama 3.1 8B Instruct',
  'mistral-7b-instruct': 'Llama 3.1 8B Instruct',
  
  // Shortcuts -> Full names
  'DeepSeek': 'DeepSeek R1 Distill Qwen 32B',
  'Llama': 'Llama 3.1 8B Instruct',
  'Medical': 'II Medical 8B'
};

/**
 * Get the actual API model name from any input name
 */
function getApiModelName(inputName) {
  if (!inputName) return 'Llama 3.1 8B Instruct'; // Default fallback
  
  // Direct mapping first
  if (MODEL_NAME_MAPPING[inputName]) {
    return MODEL_NAME_MAPPING[inputName];
  }
  
  // If no mapping found, return as-is (might already be a valid API name)
  return inputName;
}

/**
 * Get display name from API name (for UI purposes)
 */
function getDisplayModelName(inputName) {
  // Get the API name first
  const apiName = getApiModelName(inputName);
  
  // Map full names to short display names for UI
  const displayMapping = {
    'DeepSeek R1 Distill Qwen 32B': 'DeepSeek 32B',
    'Llama 3.1 8B Instruct': 'Llama 3.1 8B',
    'II Medical 8B': 'Medical 8B'
  };
  
  return displayMapping[apiName] || apiName;
}

/**
 * Make a chat request to the Flux AI API with enhanced error handling and retry logic
 * @param {Object} requestBody - The request body to send
 * @returns {Promise<Object>} - The response from the API
 */
async function makeAiChatRequest(requestBody, options = {}) {
  const { maxRetries = 2, timeoutMs = 60000, validateModel = true } = options;
  
  try {
    // Pre-flight checks - use async version that checks database
    const isConfigured = await fluxAiConfig.isFullyConfigured();
    if (!isConfigured) {
      throw new Error('Flux AI not configured - missing API key or model');
    }

    // Get current settings from database
    const apiKey = await fluxAiConfig.getApiKey();
    const configuredModel = await fluxAiConfig.getModel();

    // Convert display model name to API model name
    const originalModel = requestBody.model || configuredModel;
    const apiModelName = getApiModelName(originalModel);
    
    console.log(`Model conversion: "${originalModel}" -> "${apiModelName}"`);

    // Validate and set model
    if (validateModel) {
      const modelValidation = await validateModelAvailability(apiModelName);
      if (!modelValidation.isValid) {
        console.warn(`Model validation failed: ${modelValidation.error}`);
        // Fallback to a known working model with proper name
        requestBody.model = 'Llama 3.1 8B Instruct'; // Use proper Flux AI model name
        console.log(`Falling back to model: ${requestBody.model}`);
      } else {
        requestBody.model = apiModelName;
        console.log(`Using validated model: ${requestBody.model}`);
      }
    } else {
      requestBody.model = apiModelName;
    }

    // Clean and validate request body
    requestBody.model = (requestBody.model || 'llama-3.1-8b-instruct').trim();
    
    // Remove undefined values
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === undefined) {
        delete requestBody[key];
      }
    });

    // Set conservative defaults for better reliability
    requestBody.temperature = Math.min(requestBody.temperature || 0.3, 1.0);
    requestBody.max_tokens = Math.min(requestBody.max_tokens || 3000, 8000);
    
    console.log(`AI request - Model: ${requestBody.model}, Temp: ${requestBody.temperature}, MaxTokens: ${requestBody.max_tokens}`);

    // Retry logic
    let lastError;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`AI request attempt ${attempt}/${maxRetries + 1}`);
        
        const endpoint = fluxAiConfig.getEndpointUrl('chat');
        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'PulseOne/1.0'
          },
          timeout: timeoutMs,
          validateStatus: (status) => status < 500 // Retry on 5xx errors
        });

        // Handle API error responses
        if (response.status >= 400) {
          throw new Error(`API Error ${response.status}: ${JSON.stringify(response.data)}`);
        }

        // Validate response structure
        if (!response.data || !response.data.choices || response.data.choices.length === 0) {
          throw new Error('Invalid API response structure');
        }

        console.log(`AI request successful on attempt ${attempt}`);
        return response.data;

      } catch (error) {
        lastError = error;
        console.error(`AI request attempt ${attempt} failed:`, error.message);

        // Don't retry on certain errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
        }

        if (error.response?.status === 400) {
          throw new Error(`Bad request: ${error.response?.data?.message || error.message}`);
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt <= maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All attempts failed
    throw new Error(`AI request failed after ${maxRetries + 1} attempts. Last error: ${lastError.message}`);

  } catch (error) {
    console.error('AI chat request error:', error.message);
    
    // Provide helpful error context
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Request timeout after ${timeoutMs}ms. The AI service may be overloaded.`);
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to AI service. Check your internet connection.');
    }
    
    throw error;
  }
}

/**
 * Validate if the configured model is available
 * @returns {Promise<Object>} - Validation result
 */
async function validateModelAvailability(modelName = null) {
  try {
    const models = await getAvailableModels();
    if (!models.success) {
      return { isValid: false, error: 'Cannot fetch available models' };
    }

    const targetModel = modelName || getApiModelName(await fluxAiConfig.getModel());
    console.log(`Validating model: ${targetModel}`);
    
    // Check against ALL model identifiers (id, model_name, nickname, displayName)
    const isAvailable = models.models.some(model => {
      const identifiers = [
        model.id,
        model.model_name,
        model.nickname,
        model.displayName
      ].filter(Boolean);
      
      // Log for debugging
      if (model === models.models[0]) {
        console.log(`Sample model identifiers:`, identifiers);
      }
      
      return identifiers.includes(targetModel);
    });

    // Log available identifiers for debugging
    const allIdentifiers = models.models.flatMap(model => [
      model.id,
      model.model_name, 
      model.nickname,
      model.displayName
    ]).filter(Boolean);
    
    console.log(`Available model identifiers:`, [...new Set(allIdentifiers)].slice(0, 8));
    console.log(`Model validation result: ${targetModel} -> ${isAvailable ? 'FOUND' : 'NOT FOUND'}`);

    return { 
      isValid: isAvailable, 
      error: isAvailable ? null : `Model '${targetModel}' not found. Available: [${[...new Set(allIdentifiers)].join(', ')}]`
    };

  } catch (error) {
    console.error('Model validation error:', error);
    return { isValid: false, error: error.message };
  }
}

/**
 * Test API connectivity and authentication
 * @returns {Promise<Object>} - Test result
 */
async function testApiConnection() {
  try {
    console.log('Testing Flux AI API connection...');
    
    // Test 1: Check API key validity with balance endpoint
    const balanceResult = await getAccountBalance();
    if (!balanceResult.success) {
      return {
        success: false,
        error: 'Authentication failed - invalid API key',
        details: balanceResult.error
      };
    }

    // Test 2: Check model availability
    const modelsResult = await getAvailableModels();
    if (!modelsResult.success) {
      return {
        success: false,
        error: 'Cannot access models endpoint',
        details: modelsResult.error
      };
    }

    // Test 3: Simple chat completion test with model conversion
    try {
      const configuredModel = await fluxAiConfig.getModel() || 'llama-3.1-8b-instruct';
      const apiModel = getApiModelName(configuredModel);
      
      // Validate the configured model first
      const modelValidation = await validateModelAvailability(apiModel);
      const testModel = modelValidation.isValid ? apiModel : 'llama-3.1-8b-instruct';
      
      console.log(`Testing with model: ${testModel}`);
      
      const testResponse = await makeAiChatRequest({
        model: testModel,
        messages: [
          { role: 'user', content: 'Hello, please respond with just "OK"' }
        ],
        max_tokens: 10,
        temperature: 0.1
      }, { maxRetries: 0, timeoutMs: 15000, validateModel: false });

      return {
        success: true,
        message: 'API connection test successful',
        details: {
          balance: balanceResult.balance,
          availableModels: modelsResult.models.length,
          testedModel: testModel,
          testResponse: testResponse.choices[0]?.message?.content?.trim()
        }
      };

    } catch (chatError) {
      return {
        success: false,
        error: 'Chat completion test failed',
        details: chatError.message
      };
    }

  } catch (error) {
    return {
      success: false,
      error: 'API connection test failed',
      details: error.message
    };
  }
}

/**
 * Enhanced document categorization with fallback handling
 */
async function categorizeDocument(text, filename, existingCategories = []) {
  try {
    const isConfigured = await fluxAiConfig.isFullyConfigured();
    if (!isConfigured) {
      console.warn('Flux AI not configured, using fallback categorization');
      return {
        success: true,
        category: 'general_documents',
        confidence: 0.3,
        isNewCategory: false,
        reasoning: 'Fallback categorization - AI not configured',
        tags: ['uncategorized'],
        documentType: 'other',
        method: 'fallback'
      };
    }

    // Get the configured model and convert to API name
    const configuredModel = await fluxAiConfig.getModel() || 'Llama 3.1 8B Instruct';
    const apiModel = getApiModelName(configuredModel);
    
    console.log(`Using AI categorization with model: ${configuredModel} -> ${apiModel}`);

    // Test connection first
    const connectionTest = await testApiConnection();
    if (!connectionTest.success) {
      console.warn('AI service unavailable, using fallback:', connectionTest.error);
      return {
        success: true,
        category: 'general_documents',
        confidence: 0.3,
        isNewCategory: false,
        reasoning: 'Fallback categorization - AI service unavailable',
        tags: ['uncategorized'],
        documentType: 'other',
        method: 'fallback'
      };
    }

    // Proceed with AI categorization
    const categoryList = existingCategories.map(cat => 
      `- ${cat.name}: ${cat.description || 'No description'}`
    ).join('\n');

    const prompt = `Analyze this document and provide categorization:

FILENAME: ${filename}

EXISTING CATEGORIES:
${categoryList}

DOCUMENT CONTENT (first 2000 characters):
${text.substring(0, 2000)}

Please respond in JSON format:
{
  "category": "suggested_category_name",
  "confidence": 0.95,
  "isNewCategory": false,
  "newCategoryDescription": "",
  "reasoning": "Brief explanation",
  "tags": ["tag1", "tag2", "tag3"],
  "documentType": "policy|procedure|guide|report|other"
}

If none of the existing categories fit well, suggest a new category with isNewCategory: true and provide a description.`;

    const requestBody = {
      model: apiModel, // Use the API model name
      messages: [
        {
          role: 'system',
          content: fluxAiConfig.getSystemPrompt('document_categorization')
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: false
    };

    console.log(`Making AI categorization request with model: ${apiModel}`);
    const response = await makeAiChatRequest(requestBody, { timeoutMs: 30000 });

    if (response && response.choices && response.choices.length > 0) {
      const aiContent = response.choices[0].message?.content || response.choices[0].message || response.choices[0].text || response.choices[0].content;
      
      if (aiContent) {
        console.log('AI categorization response:', aiContent);
        
        // Parse JSON response
        try {
          let jsonString = '';
          
          const codeBlockMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1];
          } else {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            }
          }
          
          if (jsonString) {
            const parsed = JSON.parse(jsonString);
            return {
              success: true,
              category: parsed.category,
              confidence: parsed.confidence || 0.7,
              isNewCategory: parsed.isNewCategory || false,
              newCategoryDescription: parsed.newCategoryDescription || '',
              reasoning: parsed.reasoning || 'AI analysis',
              tags: parsed.tags || [],
              documentType: parsed.documentType || 'other',
              aiResponse: aiContent,
              method: 'ai-enhanced'
            };
          }
        } catch (parseError) {
          console.error('Failed to parse AI categorization response:', parseError);
        }
        
        // Fallback parsing if JSON fails
        return {
          success: true,
          category: 'general_documents',
          confidence: 0.5,
          isNewCategory: false,
          reasoning: 'Fallback categorization due to parsing error',
          tags: [],
          documentType: 'other',
          aiResponse: aiContent,
          method: 'fallback-after-ai'
        };
      }
    }

    throw new Error('No valid response from AI service');

  } catch (error) {
    console.error('Error in AI categorization:', error.message);
    return {
      success: true, // Don't fail the upload process
      category: 'general_documents',
      confidence: 0.3,
      isNewCategory: false,
      reasoning: `Fallback categorization - AI error: ${error.message}`,
      tags: ['uncategorized'],
      documentType: 'other',
      method: 'error-fallback'
    };
  }
}

// [Keep all other existing functions unchanged - just adding the model name conversion]
async function uploadFileToFluxAi(filePath) {
  try {
    console.log('[uploadFileToFluxAi] Starting upload for:', filePath);
    
    const spaceCheck = await checkStorageBeforeUpload(filePath);
    if (!spaceCheck.success) {
      console.log('[uploadFileToFluxAi] Storage check failed:', spaceCheck);
      return spaceCheck;
    }
    
    console.log('[uploadFileToFluxAi] Storage check passed');

    const fileContent = await fs.readFile(filePath);
    console.log('[uploadFileToFluxAi] File read successfully, size:', fileContent.length);
    
    const form = new FormData();
    form.append('files', fileContent, path.basename(filePath));
    console.log('[uploadFileToFluxAi] Form data created');
    
    const endpoint = fluxAiConfig.getEndpointUrl('files');
    console.log('[uploadFileToFluxAi] Upload endpoint:', endpoint);
    
    const apiKey = await fluxAiConfig.getApiKey();
    
    const response = await axios.post(endpoint, form, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      timeout: 60000 // Increased timeout for file uploads
    });
    
    console.log('[uploadFileToFluxAi] Upload successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[uploadFileToFluxAi] Error caught:', error.message);
    
    if (error.response) {
      console.error('[uploadFileToFluxAi] API error status:', error.response.status);
      console.error('[uploadFileToFluxAi] API error data:', JSON.stringify(error.response.data, null, 2));
      
      return { 
        success: false, 
        error: `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        details: error.response.data
      };
    } else if (error.request) {
      console.error('[uploadFileToFluxAi] No response received');
      return { 
        success: false, 
        error: 'No response from API server'
      };
    } else {
      console.error('[uploadFileToFluxAi] Request setup error:', error.message);
      return { 
        success: false, 
        error: `Request error: ${error.message}`
      };
    }
  }
}

async function getStorageInfo() {
  try {
    const filesEndpoint = fluxAiConfig.getEndpointUrl('files');
    const apiKey = await fluxAiConfig.getApiKey();
    
    const response = await axios.get(filesEndpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    return {
      success: true,
      totalStorage: response.data.storage_total || 0,
      usedStorage: response.data.storage_used || 0,
      availableStorage: response.data.storage_available || 0,
      files: response.data.data || []
    };
  } catch (error) {
    console.error('Error getting storage info:', error.message);
    return { 
      success: false, 
      error: error.message,
      totalStorage: 0,
      usedStorage: 0,
      availableStorage: 0,
      files: []
    };
  }
}

async function getAccountBalance() {
  try {
    const balanceEndpoint = fluxAiConfig.getEndpointUrl('balance');
    const apiKey = await fluxAiConfig.getApiKey();
    
    const response = await axios.get(balanceEndpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    return {
      success: true,
      balance: response.data.api_credit || 0,
      data: response.data
    };
  } catch (error) {
    console.error('Error getting account balance:', error.message);
    return {
      success: false,
      error: error.message,
      balance: 0
    };
  }
}

async function getAvailableModels() {
  try {
    const modelsEndpoint = fluxAiConfig.getEndpointUrl('llms');
    const apiKey = await fluxAiConfig.getApiKey();
    
    const response = await axios.get(modelsEndpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    // Handle different possible response formats
    let rawModels = response.data.data || response.data.models || response.data || [];
    
    // Ensure models is an array
    if (!Array.isArray(rawModels)) {
      rawModels = [];
    }
    
    // Process models to ensure consistent format
    const models = rawModels.map(model => {
      // Handle both string and object formats
      if (typeof model === 'string') {
        return {
          id: model,
          model_name: model,
          nickname: model,
          displayName: getDisplayModelName(model)
        };
      }
      
      // Handle object format - ensure we have all necessary fields
      const processedModel = {
        id: model.id || model.model_name || model.nickname,
        model_name: model.model_name || model.id || model.nickname,
        nickname: model.nickname || model.displayName || model.id || model.model_name,
        displayName: model.displayName || model.nickname || model.id || model.model_name,
        ...model // Keep any other fields
      };
      
      return processedModel;
    });
    
    console.log(`[getAvailableModels] Processed ${models.length} models`);
    console.log(`[getAvailableModels] Sample model:`, models[0]);
    
    return {
      success: true,
      models: models,
      data: response.data
    };
  } catch (error) {
    console.error('Error getting available models:', error.message);
    return {
      success: false,
      error: error.message,
      models: []
    };
  }
}

async function listFluxAiFiles() {
  try {
    const storageInfo = await getStorageInfo();
    return {
      success: storageInfo.success,
      files: storageInfo.files || []
    };
  } catch (error) {
    console.error('Error listing Flux AI files:', error.message);
    return { success: false, error: error.message, files: [] };
  }
}

async function deleteFluxAiFile(fileId) {
  try {
    if (!fileId) {
      return { success: false, error: 'No file ID provided' };
    }
    
    const filesEndpoint = `${fluxAiConfig.getEndpointUrl('files')}/${fileId}`;
    const apiKey = await fluxAiConfig.getApiKey();
    
    await axios.delete(filesEndpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    console.error('Error deleting Flux AI file:', error.message);
    return { success: false, error: error.message };
  }
}

async function checkStorageBeforeUpload(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    
    const storageInfo = await getStorageInfo();
    
    if (!storageInfo.success) {
      return { 
        success: false, 
        error: 'Unable to check storage space. Storage info not available.',
        errorType: 'storage_check_failed'
      };
    }
    
    if (fileSize > storageInfo.availableStorage) {
      return {
        success: false,
        errorType: 'insufficient_space',
        error: 'Insufficient storage space',
        details: {
          fileSize,
          availableStorage: storageInfo.availableStorage,
          usedStorage: storageInfo.usedStorage,
          totalStorage: storageInfo.totalStorage
        }
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error checking storage space:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadFileToFluxAi,
  makeAiChatRequest,
  categorizeDocument,
  getStorageInfo,
  getAccountBalance,
  getAvailableModels,
  listFluxAiFiles,
  deleteFluxAiFile,
  checkStorageBeforeUpload,
  testApiConnection,
  validateModelAvailability,
  getApiModelName, // Export the model conversion functions
  getDisplayModelName
};