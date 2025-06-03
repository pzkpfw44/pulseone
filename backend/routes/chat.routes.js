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
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
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
    console.log('Raw AI response received:', JSON.stringify(aiResponse, null, 2));

    // Step 4: Extract the response text properly
    let responseText = '';
    
    if (aiResponse && aiResponse.choices && aiResponse.choices.length > 0) {
      const choice = aiResponse.choices[0];
      
      // Try different possible response formats
      if (choice.message && choice.message.content) {
        responseText = choice.message.content;
      } else if (choice.message && typeof choice.message === 'string') {
        responseText = choice.message;
      } else if (choice.text) {
        responseText = choice.text;
      } else if (choice.content) {
        responseText = choice.content;
      } else {
        console.error('Could not extract response from choice:', choice);
        responseText = 'Sorry, I could not generate a response.';
      }
    } else {
      console.error('No choices found in AI response:', aiResponse);
      responseText = 'Sorry, I could not generate a response.';
    }

    console.log('Extracted response text:', responseText);

    // Step 5: Return formatted response to frontend
    const finalResponse = {
      success: true,
      response: responseText,
      sources: contextResult.sources,
      foundRelevantContent: contextResult.foundRelevantContent,
      totalDocumentsSearched: contextResult.totalResults || 0,
      query: message,
      debug: {
        contextLength: contextResult.context.length,
        sourcesCount: contextResult.sources.length,
        aiModel: fluxAiConfig.model,
        promptLength: systemPrompt.length
      }
    };

    console.log('Sending final response to frontend:', {
      success: finalResponse.success,
      responseLength: finalResponse.response.length,
      sourcesCount: finalResponse.sources.length,
      foundRelevantContent: finalResponse.foundRelevantContent
    });

    res.json(finalResponse);

  } catch (error) {
    console.error('Chat query error:', error);
    
    // Send a proper error response
    res.status(500).json({
      success: false,
      error: 'Failed to process chat query',
      response: 'Sorry, I encountered an error while processing your question.',
      message: error.message,
      sources: [],
      foundRelevantContent: false,
      totalDocumentsSearched: 0
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

// Test endpoint to verify chat system
router.post('/test', async (req, res) => {
  try {
    const testMessage = req.body.message || 'test query';
    
    console.log('Chat test with message:', testMessage);
    
    // Test RAG search
    const ragResult = await ragService.searchDocuments(testMessage, {
      maxResults: 3,
      categories: [],
      excludeLegacy: false
    });
    
    console.log('RAG test result:', {
      success: ragResult.success,
      chunksFound: ragResult.chunks?.length || 0
    });
    
    res.json({
      success: true,
      message: 'Chat system test completed',
      ragTest: {
        success: ragResult.success,
        chunksFound: ragResult.chunks?.length || 0,
        sampleChunk: ragResult.chunks?.[0]?.content?.substring(0, 200) || 'No content'
      }
    });
    
  } catch (error) {
    console.error('Chat test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;