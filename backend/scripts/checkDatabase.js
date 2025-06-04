// backend/scripts/checkDatabase.js

const { Document, DocumentChunk, Category, sequelize } = require('../models');

async function checkDatabaseHealth() {
  try {
    console.log('🔍 Checking database health...\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection: OK');
    
    // Check documents
    const totalDocs = await Document.count();
    const processedDocs = await Document.count({ where: { status: 'processed' } });
    const processingDocs = await Document.count({ where: { status: 'processing' } });
    const errorDocs = await Document.count({ where: { status: 'error' } });
    
    console.log(`📄 Documents: ${totalDocs} total`);
    console.log(`   ✅ Processed: ${processedDocs}`);
    console.log(`   ⏳ Processing: ${processingDocs}`);
    console.log(`   ❌ Errors: ${errorDocs}`);
    
    // Check chunks
    const totalChunks = await DocumentChunk.count();
    console.log(`🧩 Document Chunks: ${totalChunks}`);
    
    // Check categories
    const totalCategories = await Category.count();
    const activeCategories = await Category.count({ where: { isActive: true } });
    console.log(`📂 Categories: ${totalCategories} total (${activeCategories} active)`);
    
    // Sample documents
    const sampleDocs = await Document.findAll({
      attributes: ['id', 'originalName', 'status', 'processingMethod', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [{
        model: DocumentChunk,
        as: 'chunks',
        attributes: ['id'],
        required: false
      }]
    });
    
    console.log('\n📋 Recent Documents:');
    sampleDocs.forEach(doc => {
      console.log(`   • ${doc.originalName}`);
      console.log(`     Status: ${doc.status}, Method: ${doc.processingMethod || 'unknown'}`);
      console.log(`     Chunks: ${doc.chunks?.length || 0}, ID: ${doc.id}`);
    });
    
    // Sample chunks
    const sampleChunks = await DocumentChunk.findAll({
      attributes: ['id', 'chunkIndex', 'wordCount', 'content'],
      include: [{
        model: Document,
        as: 'document',
        attributes: ['originalName', 'status']
      }],
      limit: 3
    });
    
    console.log('\n🧩 Sample Chunks:');
    sampleChunks.forEach(chunk => {
      console.log(`   • Document: ${chunk.document?.originalName || 'Unknown'}`);
      console.log(`     Chunk ${chunk.chunkIndex}, ${chunk.wordCount} words`);
      console.log(`     Content preview: ${chunk.content?.substring(0, 100)}...`);
    });
    
    // Health summary
    console.log('\n🏥 Health Summary:');
    if (totalChunks === 0) {
      console.log('   ⚠️  WARNING: No document chunks found - chat will not work');
      console.log('   💡 Solution: Upload and process documents');
    } else if (processedDocs === 0) {
      console.log('   ⚠️  WARNING: No processed documents found');
      console.log('   💡 Solution: Check document processing');
    } else {
      console.log('   ✅ Database appears healthy for chat functionality');
    }
    
    // Connection test URLs
    console.log('\n🔗 Test these URLs in your browser:');
    console.log('   • http://localhost:5000/api/chat/info');
    console.log('   • http://localhost:5000/api/chat/debug/database');
    console.log('   • http://localhost:5000/api/chat/quick-stats');
    if (totalChunks > 0) {
      console.log('   • http://localhost:5000/api/chat/test-search/amplifon');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    process.exit(1);
  }
}

checkDatabaseHealth();