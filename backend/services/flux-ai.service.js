// backend/services/flux-ai.service.js

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fluxAiConfig = require('../config/flux-ai');

/**
 * Upload a file to the Flux AI API
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<Object>} - The response from the API
 */
async function uploadFileToFluxAi(filePath) {
  try {
    console.log('[uploadFileToFluxAi] Starting upload for:', filePath);
    
    // Check available storage space before uploading
    const spaceCheck = await checkStorageBeforeUpload(filePath);
    if (!spaceCheck.success) {
      console.log('[uploadFileToFluxAi] Storage check failed:', spaceCheck);
      return spaceCheck;
    }
    
    console.log('[uploadFileToFluxAi] Storage check passed');

    // Read the file
    const fileContent = await fs.readFile(filePath);
    console.log('[uploadFileToFluxAi] File read successfully, size:', fileContent.length);
    
    // Create form data
    const form = new FormData();
    form.append('files', fileContent, path.basename(filePath));
    console.log('[uploadFileToFluxAi] Form data created');
    
    // Make the upload request
    const endpoint = fluxAiConfig.getEndpointUrl('files');
    console.log('[uploadFileToFluxAi] Upload endpoint:', endpoint);
    console.log('[uploadFileToFluxAi] Using API key:', fluxAiConfig.apiKey ? 'Yes (length: ' + fluxAiConfig.apiKey.length + ')' : 'No');
    
    const response = await axios.post(endpoint, form, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        ...form.getHeaders()
      }
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

/**
 * Make a chat request to the Flux AI API for document categorization
 * @param {Object} requestBody - The request body to send
 * @returns {Promise<Object>} - The response from the API
 */
async function makeAiChatRequest(requestBody) {
  try {
    // Force the model exactly as specified in config
    const configuredModel = fluxAiConfig.model.trim();
    console.log(`Using configured model: ${configuredModel}`);
    requestBody.model = configuredModel;
    
    // Remove any undefined parameters to avoid API issues
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === undefined) {
        delete requestBody[key];
      }
    });
    
    // Log complete request for debugging
    console.log(`AI request payload:`, JSON.stringify({
      model: requestBody.model,
      temperature: requestBody.temperature,
      hasMessages: !!requestBody.messages,
      messageCount: requestBody.messages?.length || 0
    }));
    
    // Make direct API request
    const endpoint = fluxAiConfig.getEndpointUrl('chat');
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Full AI response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error making AI chat request:', error.message);
    if (error.response) {
      console.error('AI API Error Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Categorize document using Flux AI
 * @param {string} text - Document text content
 * @param {string} filename - Original filename
 * @param {Array} existingCategories - Current available categories
 * @returns {Promise<Object>} - Categorization result
 */
async function categorizeDocument(text, filename, existingCategories = []) {
  try {
    if (!fluxAiConfig.isConfigured()) {
      console.warn('Flux AI not configured, skipping AI categorization');
      return {
        success: false,
        error: 'Flux AI not configured',
        category: null,
        confidence: 0,
        tags: [],
        isNewCategory: false
      };
    }

    // Prepare the categorization prompt
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
      model: fluxAiConfig.model,
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

    const response = await makeAiChatRequest(requestBody);

    if (response && response.choices && response.choices.length > 0) {
      const aiContent = response.choices[0].message?.content || response.choices[0].text || response.choices[0].content;
      
      if (aiContent) {
        console.log('AI categorization response:', aiContent);
        
        // Parse JSON response
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              success: true,
              category: parsed.category,
              confidence: parsed.confidence || 0.7,
              isNewCategory: parsed.isNewCategory || false,
              newCategoryDescription: parsed.newCategoryDescription || '',
              reasoning: parsed.reasoning || 'AI analysis',
              tags: parsed.tags || [],
              documentType: parsed.documentType || 'other',
              aiResponse: aiContent
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
          aiResponse: aiContent
        };
      }
    }

    return {
      success: false,
      error: 'No valid response from AI',
      category: null,
      confidence: 0,
      tags: []
    };

  } catch (error) {
    console.error('Error in AI categorization:', error.message);
    return {
      success: false,
      error: error.message,
      category: null,
      confidence: 0,
      tags: []
    };
  }
}

/**
 * Get storage information from the Flux AI API
 * @returns {Promise<Object>} - The storage info response
 */
async function getStorageInfo() {
  try {
    const filesEndpoint = fluxAiConfig.getEndpointUrl('files');
    
    const response = await axios.get(filesEndpoint, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
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

/**
 * Get account balance from Flux AI
 * @returns {Promise<Object>} - The balance response
 */
async function getAccountBalance() {
  try {
    const balanceEndpoint = fluxAiConfig.getEndpointUrl('balance');
    
    const response = await axios.get(balanceEndpoint, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
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

/**
 * List available models from Flux AI
 * @returns {Promise<Object>} - The models response
 */
async function getAvailableModels() {
  try {
    const modelsEndpoint = fluxAiConfig.getEndpointUrl('llms');
    
    const response = await axios.get(modelsEndpoint, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      models: response.data.data || [],
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

/**
 * List all files in the Flux AI account
 * @returns {Promise<Array>} - Array of file objects
 */
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

/**
 * Delete a file from the Flux AI account
 * @param {string} fileId - The ID of the file to delete
 * @returns {Promise<Object>} - The deletion response
 */
async function deleteFluxAiFile(fileId) {
  try {
    if (!fileId) {
      return { success: false, error: 'No file ID provided' };
    }
    
    const filesEndpoint = `${fluxAiConfig.getEndpointUrl('files')}/${fileId}`;
    
    await axios.delete(filesEndpoint, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    console.error('Error deleting Flux AI file:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if there's enough storage space before uploading a file
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<Object>} - Check result with success status
 */
async function checkStorageBeforeUpload(filePath) {
  try {
    // Get file size
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    
    // Get storage info
    const storageInfo = await getStorageInfo();
    
    if (!storageInfo.success) {
      return { 
        success: false, 
        error: 'Unable to check storage space. Storage info not available.',
        errorType: 'storage_check_failed'
      };
    }
    
    // Check if there's enough space
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
  checkStorageBeforeUpload
};