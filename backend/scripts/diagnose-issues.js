// backend/scripts/diagnose-issues.js - Comprehensive Diagnostic Script
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Document, DocumentChunk, SystemSetting } = require('../models');
const fluxAiService = require('../services/flux-ai.service');
const ragService = require('../services/enhanced-rag.service');

class DiagnosticRunner {
  constructor() {
    this.results = {
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      tests: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Running: ${name}`);
    this.results.summary.totalTests++;
    
    try {
      const result = await testFn();
      
      if (result.success) {
        console.log(`✅ PASSED: ${name}`);
        if (result.message) console.log(`   ${result.message}`);
        this.results.summary.passed++;
        this.results.tests.push({ name, status: 'PASSED', ...result });
      } else if (result.warning) {
        console.log(`⚠️  WARNING: ${name}`);
        console.log(`   ${result.message || result.error}`);
        this.results.summary.warnings++;
        this.results.tests.push({ name, status: 'WARNING', ...result });
      } else {
        console.log(`❌ FAILED: ${name}`);
        console.log(`   ${result.error || result.message}`);
        this.results.summary.failed++;
        this.results.tests.push({ name, status: 'FAILED', ...result });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name}`);
      console.log(`   ${error.message}`);
      this.results.summary.failed++;
      this.results.tests.push({ 
        name, 
        status: 'ERROR', 
        error: error.message,
        success: false 
      });
    }
  }

  async runAllDiagnostics() {
    console.log('🚀 Starting Pulse One Diagnostic Suite');
    console.log('=====================================');

    // Test 1: Environment Configuration
    await this.runTest('Environment Configuration', async () => {
      const issues = [];
      
      if (!process.env.FLUX_AI_API_KEY) {
        issues.push('FLUX_AI_API_KEY not set');
      }
      
      if (!process.env.FLUX_AI_MODEL) {
        issues.push('FLUX_AI_MODEL not set (using default)');
      }
      
      if (!process.env.DATABASE_PATH) {
        issues.push('DATABASE_PATH not set (using default)');
      }

      if (issues.length > 0) {
        return {
          success: false,
          error: `Environment issues: ${issues.join(', ')}`,
          details: { issues }
        };
      }

      return {
        success: true,
        message: 'All required environment variables are set',
        details: {
          apiKey: process.env.FLUX_AI_API_KEY ? `Set (${process.env.FLUX_AI_API_KEY.length} chars)` : 'Not set',
          model: process.env.FLUX_AI_MODEL || 'Using default',
          database: process.env.DATABASE_PATH || 'Using default'
        }
      };
    });

    // Test 2: Database Connectivity
    await this.runTest('Database Connectivity', async () => {
      try {
        const totalDocs = await Document.count();
        const totalChunks = await DocumentChunk.count();
        
        return {
          success: true,
          message: `Database connected successfully`,
          details: {
            totalDocuments: totalDocs,
            totalChunks: totalChunks
          }
        };
      } catch (error) {
        return {
          success: false,
          error: `Database connection failed: ${error.message}`
        };
      }
    });

    // Test 3: Flux AI API Connectivity
    await this.runTest('Flux AI API Connectivity', async () => {
      try {
        const result = await fluxAiService.testApiConnection();
        return result;
      } catch (error) {
        return {
          success: false,
          error: `API test failed: ${error.message}`
        };
      }
    });

    // Test 4: Model Availability
    await this.runTest('AI Model Availability', async () => {
      try {
        const modelsResult = await fluxAiService.getAvailableModels();
        if (!modelsResult.success) {
          return {
            success: false,
            error: `Cannot fetch models: ${modelsResult.error}`
          };
        }

        const configuredModel = process.env.FLUX_AI_MODEL?.trim();
        const isAvailable = modelsResult.models.some(model => 
          model.id === configuredModel || model.name === configuredModel
        );

        if (!isAvailable && configuredModel) {
          return {
            warning: true,
            message: `Configured model '${configuredModel}' not found in available models`,
            details: {
              configuredModel,
              availableModels: modelsResult.models.slice(0, 5).map(m => m.id || m.name)
            }
          };
        }

        return {
          success: true,
          message: `Model '${configuredModel}' is available`,
          details: {
            configuredModel,
            totalAvailableModels: modelsResult.models.length
          }
        };

      } catch (error) {
        return {
          success: false,
          error: `Model check failed: ${error.message}`
        };
      }
    });

    // Test 5: Document Processing Status
    await this.runTest('Document Processing Status', async () => {
      try {
        const totalDocs = await Document.count();
        const processedDocs = await Document.count({ where: { status: 'processed' } });
        const processingDocs = await Document.count({ where: { status: 'processing' } });
        const errorDocs = await Document.count({ where: { status: 'error' } });

        const details = {
          total: totalDocs,
          processed: processedDocs,
          processing: processingDocs,
          errors: errorDocs
        };

        if (totalDocs === 0) {
          return {
            warning: true,
            message: 'No documents found in database',
            details
          };
        }

        if (errorDocs > 0) {
          return {
            warning: true,
            message: `${errorDocs} documents have processing errors`,
            details
          };
        }

        return {
          success: true,
          message: `Document processing status normal`,
          details
        };

      } catch (error) {
        return {
          success: false,
          error: `Document status check failed: ${error.message}`
        };
      }
    });

    // Test 6: Document Chunking Status
    await this.runTest('Document Chunking Status', async () => {
      try {
        const debugInfo = await ragService.debugDatabaseState();
        
        if (debugInfo.needsRechunking) {
          return {
            success: false,
            error: 'Processed documents exist but no chunks found - documents need rechunking',
            details: debugInfo,
            fix: 'Run: node scripts/rechunk-documents.js'
          };
        }

        if (debugInfo.totalChunks === 0) {
          return {
            warning: true,
            message: 'No document chunks found',
            details: debugInfo
          };
        }

        return {
          success: true,
          message: `Document chunking status normal`,
          details: debugInfo
        };

      } catch (error) {
        return {
          success: false,
          error: `Chunking status check failed: ${error.message}`
        };
      }
    });

    // Test 7: RAG Search Functionality
    await this.runTest('RAG Search Functionality', async () => {
      try {
        const testQuery = 'policy document';
        const searchResult = await ragService.searchDocuments(testQuery, { maxResults: 3 });
        
        if (!searchResult.success) {
          return {
            success: false,
            error: `RAG search failed: ${searchResult.error}`,
            details: searchResult.debugInfo
          };
        }

        if (searchResult.chunks.length === 0) {
          return {
            warning: true,
            message: 'RAG search working but no results found for test query',
            details: {
              query: testQuery,
              totalFound: searchResult.totalFound,
              searchMethods: searchResult.searchMethods
            }
          };
        }

        return {
          success: true,
          message: `RAG search working correctly`,
          details: {
            query: testQuery,
            resultsFound: searchResult.chunks.length,
            searchMethods: searchResult.searchMethods
          }
        };

      } catch (error) {
        return {
          success: false,
          error: `RAG search test failed: ${error.message}`
        };
      }
    });

    // Test 8: AI Generation Test
    await this.runTest('AI Generation Test', async () => {
      try {
        const testRequest = {
          model: 'llama-3.1-8b-instruct', // Use reliable model
          messages: [
            { role: 'user', content: 'Respond with exactly "TEST_SUCCESSFUL"' }
          ],
          max_tokens: 10,
          temperature: 0.1
        };

        const response = await fluxAiService.makeAiChatRequest(testRequest, { 
          maxRetries: 1, 
          timeoutMs: 30000 
        });

        const content = response.choices[0]?.message?.content?.trim();
        
        if (content && content.includes('TEST_SUCCESSFUL')) {
          return {
            success: true,
            message: 'AI generation working correctly',
            details: { response: content }
          };
        } else {
          return {
            warning: true,
            message: 'AI generation working but unexpected response',
            details: { response: content }
          };
        }

      } catch (error) {
        return {
          success: false,
          error: `AI generation test failed: ${error.message}`
        };
      }
    });

    // Test 9: File Upload Directory
    await this.runTest('File Upload Directory', async () => {
      const fs = require('fs').promises;
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      
      try {
        await fs.access(uploadDir);
        const files = await fs.readdir(uploadDir);
        
        return {
          success: true,
          message: `Upload directory accessible`,
          details: {
            path: uploadDir,
            fileCount: files.length
          }
        };
      } catch (error) {
        if (error.code === 'ENOENT') {
          try {
            await fs.mkdir(uploadDir, { recursive: true });
            return {
              success: true,
              message: 'Upload directory created',
              details: { path: uploadDir }
            };
          } catch (createError) {
            return {
              success: false,
              error: `Cannot create upload directory: ${createError.message}`
            };
          }
        }
        
        return {
          success: false,
          error: `Upload directory check failed: ${error.message}`
        };
      }
    });

    // Test 10: System Settings
    await this.runTest('System Settings', async () => {
      try {
        const aiConfig = await SystemSetting.findOne({
          where: { key: 'ai_configuration' }
        });

        const brandingConfig = await SystemSetting.findOne({
          where: { key: 'branding_settings' }
        });

        return {
          success: true,
          message: 'System settings accessible',
          details: {
            aiConfigExists: !!aiConfig,
            brandingConfigExists: !!brandingConfig
          }
        };

      } catch (error) {
        return {
          success: false,
          error: `System settings check failed: ${error.message}`
        };
      }
    });

    this.printSummary();
    return this.results;
  }

  printSummary() {
    console.log('\n📊 Diagnostic Summary');
    console.log('====================');
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);

    if (this.results.summary.failed > 0) {
      console.log('\n🔧 Recommended Fixes:');
      console.log('=====================');
      
      this.results.tests.forEach(test => {
        if (test.status === 'FAILED' && test.fix) {
          console.log(`- ${test.name}: ${test.fix}`);
        }
      });
    }

    if (this.results.summary.warnings > 0) {
      console.log('\n⚠️  Warnings to Address:');
      console.log('========================');
      
      this.results.tests.forEach(test => {
        if (test.status === 'WARNING') {
          console.log(`- ${test.name}: ${test.message || test.error}`);
        }
      });
    }

    console.log('\n🎯 Next Steps:');
    console.log('==============');
    
    if (this.results.summary.failed === 0 && this.results.summary.warnings === 0) {
      console.log('✨ All diagnostics passed! Your system should be working correctly.');
    } else {
      console.log('1. Fix any failed tests first');
      console.log('2. Address warnings if needed');
      console.log('3. Restart your server: npm restart');
      console.log('4. Test document generation functionality');
    }
  }
}

// Self-executing diagnostic when run directly
if (require.main === module) {
  (async () => {
    const diagnostics = new DiagnosticRunner();
    try {
      await diagnostics.runAllDiagnostics();
      process.exit(0);
    } catch (error) {
      console.error('\n💥 Diagnostic runner crashed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = DiagnosticRunner;