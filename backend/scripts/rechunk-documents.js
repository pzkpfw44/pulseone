// backend/scripts/rechunk-documents.js - Fix Document Chunking Issues
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Document, DocumentChunk } = require('../models');
const { chunkDocument } = require('../utils/documentChunker');

async function rechunkAllDocuments() {
  console.log('🔧 Starting Document Rechunking Process');
  console.log('======================================');

  try {
    // Get all processed documents
    const processedDocs = await Document.findAll({
      where: { status: 'processed' },
      attributes: ['id', 'originalName', 'textContent', 'contentLength']
    });

    if (processedDocs.length === 0) {
      console.log('ℹ️  No processed documents found to rechunk');
      return;
    }

    console.log(`📄 Found ${processedDocs.length} processed documents`);

    // Check current chunk status
    const totalChunks = await DocumentChunk.count();
    console.log(`📦 Current chunks in database: ${totalChunks}`);

    let rechunkedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [index, doc] of processedDocs.entries()) {
      const progress = `[${index + 1}/${processedDocs.length}]`;
      console.log(`\n${progress} Processing: ${doc.originalName}`);

      try {
        // Check if document already has chunks
        const existingChunks = await DocumentChunk.count({
          where: { documentId: doc.id }
        });

        if (existingChunks > 0) {
          console.log(`  ⏭️  Skipping (already has ${existingChunks} chunks)`);
          skippedCount++;
          continue;
        }

        // Check if document has content
        if (!doc.textContent || doc.textContent.trim().length === 0) {
          console.log(`  ⚠️  Warning: No text content found`);
          errorCount++;
          continue;
        }

        console.log(`  📊 Content length: ${doc.contentLength || doc.textContent.length} characters`);

        // Rechunk the document
        const chunkResult = await chunkDocument(doc.id, doc.textContent);
        
        if (chunkResult && chunkResult.chunks && chunkResult.chunks.length > 0) {
          console.log(`  ✅ Successfully created ${chunkResult.chunks.length} chunks`);
          rechunkedCount++;
        } else {
          console.log(`  ❌ Chunking failed - no chunks created`);
          errorCount++;
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
      }

      // Add small delay to avoid overwhelming the database
      if (index < processedDocs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Final summary
    console.log('\n📊 Rechunking Summary');
    console.log('=====================');
    console.log(`Total documents processed: ${processedDocs.length}`);
    console.log(`✅ Successfully rechunked: ${rechunkedCount}`);
    console.log(`⏭️  Skipped (already chunked): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Check final chunk count
    const finalChunks = await DocumentChunk.count();
    console.log(`\n📦 Total chunks after rechunking: ${finalChunks}`);
    console.log(`📈 Chunks added: ${finalChunks - totalChunks}`);

    if (rechunkedCount > 0) {
      console.log('\n🎉 Rechunking complete! Your RAG search should now work properly.');
      console.log('💡 Restart your server to ensure all changes take effect.');
    }

  } catch (error) {
    console.error('\n💥 Rechunking process failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function clearAllChunks() {
  console.log('🗑️  Clearing all existing chunks...');
  
  try {
    const deletedCount = await DocumentChunk.destroy({
      where: {},
      truncate: true
    });
    
    console.log(`✅ Cleared ${deletedCount} existing chunks`);
    return true;
  } catch (error) {
    console.error('❌ Failed to clear chunks:', error.message);
    return false;
  }
}

async function forceRechunkAll() {
  console.log('🚀 Force Rechunking All Documents');
  console.log('=================================');
  console.log('⚠️  This will delete all existing chunks and recreate them');
  
  // Clear existing chunks
  const cleared = await clearAllChunks();
  if (!cleared) {
    console.error('❌ Cannot proceed - failed to clear existing chunks');
    return;
  }

  // Rechunk all documents
  await rechunkAllDocuments();
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

if (require.main === module) {
  (async () => {
    try {
      switch (command) {
        case 'force':
          await forceRechunkAll();
          break;
        case 'clear':
          await clearAllChunks();
          break;
        default:
          await rechunkAllDocuments();
          break;
      }
      
      console.log('\n✨ Process completed successfully');
      process.exit(0);
      
    } catch (error) {
      console.error('\n💥 Process failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  rechunkAllDocuments,
  clearAllChunks,
  forceRechunkAll
};