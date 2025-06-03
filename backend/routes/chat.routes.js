// backend/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const ragService = require('../services/rag.service');
const { makeAiChatRequest } = require('../services/flux-ai.service');
const fluxAiConfig = require('../config/flux-ai');

// Chat with documents using RAG
router.post('/query', async (req, res) => {
  try {
    const { 
      message, 
      excludeLegacy = false, 
      categories = [] 
    } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Chat query:', message);

    // Step 1: Get relevant context using RAG
    const contextResult = await ragService.getContextForQuery(message, {
      excludeLegacy,
      categories,
      maxResults: 5
    });

    console.log('Chat - Context result:', {
      foundRelevantContent: contextResult.foundRelevantContent,
      sourcesCount: contextResult.sources.length,
      contextLength: contextResult.context.length
    });

    // Step 2: Build prompt with context
    let systemPrompt = `You are a helpful AI assistant that answers questions based on company documents. `;
    
    if (contextResult.foundRelevantContent) {
      systemPrompt += `Use the following context from the company's documents to answer the question. Always cite which documents you're referencing.

CONTEXT FROM DOCUMENTS:
${contextResult.context}

If the context doesn't contain relevant information for the question, say so clearly.`;
      
      console.log('Chat - Using context, system prompt length:', systemPrompt.length);
    } else {
      systemPrompt += `No relevant documents were found for this query. Let the user know that you don't have specific company information about their question.`;
      
      console.log('Chat - No context found, using fallback prompt');
    }

    // Step 3: Send to AI
    const aiRequest = {
      model: fluxAiConfig.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    const aiResponse = await makeAiChatRequest(aiRequest);
    
    const response = aiResponse.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({
      success: true,
      response: response,
      sources: contextResult.sources,
      foundRelevantContent: contextResult.foundRelevantContent,
      totalDocumentsSearched: contextResult.totalResults || 0,
      query: message
    });

  } catch (error) {
    console.error('Chat query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat query',
      response: 'Sorry, I encountered an error while processing your question.'
    });
  }
});

// Get chat capabilities info
router.get('/info', async (req, res) => {
  try {
    const { DocumentChunk, Document } = require('../models');
    
    const totalChunks = await DocumentChunk.count();
    const totalDocuments = await Document.count({ where: { status: 'processed' } });
    
    res.json({
      available: totalChunks > 0,
      totalDocuments,
      totalChunks,
      capabilities: [
        'Answer questions about uploaded documents',
        'Search across all processed documents',
        'Provide source citations',
        'Filter by document categories'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat info' });
  }
});

// Debug endpoint to check chunks
router.get('/debug/chunks', async (req, res) => {
  try {
    const { DocumentChunk, Document } = require('../models');
    
    const chunks = await DocumentChunk.findAll({
      include: [{
        model: Document,
        as: 'document',
        attributes: ['originalName', 'category', 'status']
      }],
      limit: 5
    });

    res.json({
      totalChunks: await DocumentChunk.count(),
      sampleChunks: chunks.map(chunk => ({
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        contentPreview: chunk.content.substring(0, 200) + '...',
        wordCount: chunk.wordCount,
        document: chunk.document
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;