// backend/scripts/fix-model-config.js
// Run this script to fix model configuration in the database

const { SystemSetting } = require('../models');

async function fixModelConfiguration() {
  try {
    console.log('🔧 Checking AI model configuration...');
    
    // Get current configuration
    const aiConfig = await SystemSetting.findOne({
      where: { key: 'ai_configuration' }
    });

    if (!aiConfig) {
      console.log('❌ No AI configuration found in database');
      console.log('💡 Go to AI Configuration page and save your settings first');
      return;
    }

    const config = aiConfig.value;
    console.log('📋 Current configuration:');
    console.log('   Model:', config.model);
    console.log('   API Key:', config.fluxApiKey ? '***configured***' : 'missing');
    
    // Check if model needs fixing
    const currentModel = config.model;
    const knownBadModels = [
      'deepseek-r1-distill-qwen-32b',
      'llama-3.1-8b-instruct',
      'mistral-7b-instruct'
    ];
    
    const correctModelMapping = {
      'deepseek-r1-distill-qwen-32b': 'DeepSeek R1 Distill Qwen 32B',
      'llama-3.1-8b-instruct': 'Llama 3.1 8B Instruct',
      'mistral-7b-instruct': 'Llama 3.1 8B Instruct'
    };

    if (knownBadModels.includes(currentModel)) {
      const correctModel = correctModelMapping[currentModel];
      console.log(`🔄 Fixing model: "${currentModel}" -> "${correctModel}"`);
      
      const updatedConfig = {
        ...config,
        model: correctModel
      };

      await aiConfig.update({ value: updatedConfig });
      console.log('✅ Model configuration updated successfully!');
      
      // Test the new configuration
      console.log('\n🧪 Testing new configuration...');
      const fluxAiConfig = require('../config/flux-ai');
      await fluxAiConfig.reloadSettings();
      
      const { testApiConnection } = require('../services/flux-ai.service');
      const testResult = await testApiConnection();
      
      if (testResult.success) {
        console.log('✅ Connection test successful!');
        console.log('   Model used:', testResult.details?.testedModel);
      } else {
        console.log('❌ Connection test failed:', testResult.error);
      }
      
    } else if (currentModel === 'DeepSeek R1 Distill Qwen 32B' || 
               currentModel === 'Llama 3.1 8B Instruct' ||
               currentModel === 'II Medical 8B') {
      console.log('✅ Model configuration looks correct!');
      
      // Test the configuration
      console.log('\n🧪 Testing configuration...');
      const fluxAiConfig = require('../config/flux-ai');
      await fluxAiConfig.reloadSettings();
      
      const { testApiConnection } = require('../services/flux-ai.service');
      const testResult = await testApiConnection();
      
      if (testResult.success) {
        console.log('✅ Connection test successful!');
        console.log('   Model used:', testResult.details?.testedModel);
      } else {
        console.log('❌ Connection test failed:', testResult.error);
        console.log('💡 Try selecting a different model in AI Configuration');
      }
      
    } else {
      console.log(`⚠️  Unknown model: "${currentModel}"`);
      console.log('💡 Available models should be one of:');
      console.log('   - DeepSeek R1 Distill Qwen 32B');
      console.log('   - Llama 3.1 8B Instruct');
      console.log('   - II Medical 8B');
      
      console.log('\n🔄 Setting to default safe model...');
      const updatedConfig = {
        ...config,
        model: 'Llama 3.1 8B Instruct'
      };

      await aiConfig.update({ value: updatedConfig });
      console.log('✅ Model set to "Llama 3.1 8B Instruct" (safe default)');
    }

  } catch (error) {
    console.error('❌ Error fixing model configuration:', error.message);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  fixModelConfiguration()
    .then(() => {
      console.log('\n🎉 Model configuration check complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixModelConfiguration };