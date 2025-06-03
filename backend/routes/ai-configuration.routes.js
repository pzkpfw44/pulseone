// backend/routes/ai-configuration.routes.js

const express = require('express');
const router = express.Router();
const { SystemSetting } = require('../models');
const { 
  getStorageInfo, 
  getAccountBalance,
  getAvailableModels,
  listFluxAiFiles, 
  deleteFluxAiFile 
} = require('../services/flux-ai.service');

// Get AI configuration settings
router.get('/', async (req, res) => {
  try {
    const aiConfig = await SystemSetting.findOne({
      where: { key: 'ai_configuration' }
    });

    if (!aiConfig) {
      // Return default configuration
      return res.json({
        fluxApiKey: '',
        model: 'DeepSeek R1 Distill Qwen 32B',
        temperature: 0.7,
        maxTokens: 2000,
        enableSafetyFilters: true,
        enableBiasDetection: true,
        enableContentModeration: true
      });
    }

    // Mask the API key for security
    const config = aiConfig.value;
    if (config.fluxApiKey) {
      config.fluxApiKey = '••••••••';
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching AI configuration:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// Update AI configuration settings
router.put('/', async (req, res) => {
  try {
    const {
      fluxApiKey,
      model,
      temperature,
      maxTokens,
      enableSafetyFilters,
      enableBiasDetection,
      enableContentModeration
    } = req.body;

    // Get existing configuration
    let aiConfig = await SystemSetting.findOne({
      where: { key: 'ai_configuration' }
    });

    let currentConfig = aiConfig ? aiConfig.value : {};

    // Update configuration (don't overwrite API key if it's masked)
    const updatedConfig = {
      ...currentConfig,
      model: model || currentConfig.model || 'DeepSeek R1 Distill Qwen 32B',
      temperature: temperature !== undefined ? temperature : (currentConfig.temperature || 0.7),
      maxTokens: maxTokens || currentConfig.maxTokens || 2000,
      enableSafetyFilters: enableSafetyFilters !== undefined ? enableSafetyFilters : (currentConfig.enableSafetyFilters !== false),
      enableBiasDetection: enableBiasDetection !== undefined ? enableBiasDetection : (currentConfig.enableBiasDetection !== false),
      enableContentModeration: enableContentModeration !== undefined ? enableContentModeration : (currentConfig.enableContentModeration !== false)
    };

    // Only update API key if it's not masked
    if (fluxApiKey && fluxApiKey !== '••••••••') {
      updatedConfig.fluxApiKey = fluxApiKey;
      
      // Update environment variable for immediate use
      process.env.FLUX_AI_API_KEY = fluxApiKey;
    }

    if (aiConfig) {
      await aiConfig.update({ value: updatedConfig });
    } else {
      await SystemSetting.create({
        key: 'ai_configuration',
        value: updatedConfig,
        category: 'ai'
      });
    }

    // Return masked configuration
    const responseConfig = { ...updatedConfig };
    if (responseConfig.fluxApiKey) {
      responseConfig.fluxApiKey = '••••••••';
    }

    res.json({
      success: true,
      message: 'AI configuration updated successfully',
      config: responseConfig
    });

  } catch (error) {
    console.error('Error updating AI configuration:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// Get account balance
router.get('/balance', async (req, res) => {
  try {
    const result = await getAccountBalance();
    
    if (result.success) {
      res.json({
        api_credit: result.balance,
        success: true
      });
    } else {
      res.status(400).json({
        error: result.error,
        api_credit: 0,
        success: false
      });
    }
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      error: 'Failed to fetch account balance',
      api_credit: 0,
      success: false
    });
  }
});

// Get available models
router.get('/models', async (req, res) => {
  try {
    const result = await getAvailableModels();
    
    if (result.success) {
      res.json({
        data: result.models,
        success: true
      });
    } else {
      // Return default models if API call fails
      res.json({
        data: [
          { nickname: "DeepSeek R1 Distill Qwen 32B", model_name: "DeepSeek R1 Distill Qwen 32B" },
          { nickname: "Llama 3.1", model_name: "Llama 3.1" },
          { nickname: "Mistral", model_name: "Mistral" }
        ],
        success: true
      });
    }
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      error: 'Failed to fetch available models',
      data: [],
      success: false
    });
  }
});

// Get storage information
router.get('/storage', async (req, res) => {
  try {
    const storageInfo = await getStorageInfo();
    
    if (storageInfo.success) {
      res.json(storageInfo);
    } else {
      res.status(400).json({
        message: 'Failed to fetch storage info',
        error: storageInfo.error,
        success: false
      });
    }
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({
      message: 'Server error fetching storage info',
      success: false
    });
  }
});

// List all files
router.get('/files', async (req, res) => {
  try {
    const result = await listFluxAiFiles();
    
    if (result.success) {
      res.json({ files: result.files });
    } else {
      res.status(400).json({
        message: 'Failed to list files',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      message: 'Server error listing files'
    });
  }
});

// Delete a file
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteFluxAiFile(id);
    
    if (result.success) {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(400).json({
        message: 'Failed to delete file',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      message: 'Server error deleting file'
    });
  }
});

// Clean up all files
router.post('/cleanup', async (req, res) => {
  try {
    // First, get all files
    const files = await listFluxAiFiles();
    
    if (!files.success) {
      return res.status(400).json({
        message: 'Failed to list files',
        error: files.error
      });
    }
    
    // Delete each file
    const deleteResults = [];
    for (const file of files.files) {
      const result = await deleteFluxAiFile(file.id);
      deleteResults.push({
        fileId: file.id,
        success: result.success,
        error: result.error
      });
    }
    
    const successCount = deleteResults.filter(r => r.success).length;
    
    res.json({
      message: `Deleted ${successCount} of ${files.files.length} files`,
      details: deleteResults
    });
  } catch (error) {
    console.error('Error cleaning up files:', error);
    res.status(500).json({
      message: 'Server error cleaning up files'
    });
  }
});

// Test AI connection
router.post('/test', async (req, res) => {
  try {
    const { getAccountBalance, getAvailableModels } = require('../services/flux-ai.service');
    
    // Test both balance and models endpoints
    const [balanceResult, modelsResult] = await Promise.allSettled([
      getAccountBalance(),
      getAvailableModels()
    ]);

    const response = {
      balance: {
        success: balanceResult.status === 'fulfilled' && balanceResult.value.success,
        data: balanceResult.status === 'fulfilled' ? balanceResult.value : { error: balanceResult.reason?.message }
      },
      models: {
        success: modelsResult.status === 'fulfilled' && modelsResult.value.success,
        data: modelsResult.status === 'fulfilled' ? modelsResult.value : { error: modelsResult.reason?.message }
      }
    };

    const overallSuccess = response.balance.success || response.models.success;

    res.json({
      success: overallSuccess,
      message: overallSuccess ? 'AI connection test successful' : 'AI connection test failed',
      details: response
    });

  } catch (error) {
    console.error('Error testing AI connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test AI connection',
      error: error.message
    });
  }
});

module.exports = router;