// backend/scripts/debug-model-validation.js
// Quick script to debug model validation issues

async function debugModelValidation() {
  try {
    console.log('🔍 Debugging Model Validation...\n');
    
    // Load the services
    const { getAvailableModels, getApiModelName, validateModelAvailability } = require('../services/flux-ai.service');
    const fluxAiConfig = require('../config/flux-ai');
    
    // 1. Check current configuration
    console.log('📋 Current Configuration:');
    await fluxAiConfig.loadSettings();
    const currentModel = await fluxAiConfig.getModel();
    console.log('   Configured Model:', currentModel);
    console.log('   API Key:', (await fluxAiConfig.getApiKey()) ? '***set***' : 'missing');
    console.log('');
    
    // 2. Get available models from API
    console.log('🔌 Fetching Available Models from API...');
    const modelsResult = await getAvailableModels();
    
    if (!modelsResult.success) {
      console.log('❌ Failed to fetch models:', modelsResult.error);
      return;
    }
    
    console.log(`✅ Found ${modelsResult.models.length} models:`);
    modelsResult.models.forEach((model, index) => {
      console.log(`   ${index + 1}. ID: "${model.id}"`);
      console.log(`      Model Name: "${model.model_name}"`);  
      console.log(`      Nickname: "${model.nickname}"`);
      console.log(`      Display Name: "${model.displayName}"`);
      console.log('');
    });
    
    // 3. Test model name conversion
    console.log('🔄 Testing Model Name Conversion:');
    const testNames = [
      'DeepSeek R1 Distill Qwen 32B',
      'DeepSeek 32B', 
      'Llama 3.1 8B Instruct',
      'Llama 3.1 8B',
      currentModel
    ];
    
    testNames.forEach(name => {
      if (name) {
        const converted = getApiModelName(name);
        console.log(`   "${name}" -> "${converted}"`);
      }
    });
    console.log('');
    
    // 4. Test validation for current configured model
    console.log('🧪 Testing Validation for Current Model:');
    const apiModelName = getApiModelName(currentModel);
    console.log(`   Input: "${currentModel}"`);
    console.log(`   Converted: "${apiModelName}"`);
    
    const validation = await validateModelAvailability(apiModelName);
    console.log(`   Validation Result: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (!validation.isValid) {
      console.log(`   Error: ${validation.error}`);
    }
    console.log('');
    
    // 5. Test validation for each available model
    console.log('🔍 Testing Validation for Each Available Model:');
    for (const model of modelsResult.models) {
      const testFields = [model.id, model.model_name, model.nickname, model.displayName];
      
      for (const field of testFields) {
        if (field) {
          const validation = await validateModelAvailability(field);
          const status = validation.isValid ? '✅' : '❌';
          console.log(`   ${status} "${field}"`);
          if (!validation.isValid) {
            console.log(`       Error: ${validation.error}`);
          }
        }
      }
      console.log('');
    }
    
    // 6. Recommend fix
    console.log('💡 Recommendations:');
    if (!validation.isValid) {
      const firstModel = modelsResult.models[0];
      console.log(`   Current model "${currentModel}" is not working.`);
      console.log(`   Try using: "${firstModel.id}" or "${firstModel.displayName}"`);
      console.log('   Update this in your AI Configuration page.');
    } else {
      console.log('   Your current model should be working! ✅');
      console.log('   If you\'re still seeing fallbacks, check the logs during document processing.');
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error.message);
    console.error(error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  debugModelValidation()
    .then(() => {
      console.log('\n🎉 Debug complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugModelValidation };