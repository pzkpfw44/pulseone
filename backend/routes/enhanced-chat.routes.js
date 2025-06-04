// backend/routes/enhanced-chat.routes.js
const express = require('express');
const router = express.Router();
const enhancedRagService = require('../services/enhanced-rag.service');
const { makeAiChatRequest } = require('../services/flux-ai.service');
const fluxAiConfig = require('../config/flux-ai');
const { v4: uuidv4 } = require('uuid');

// Enhanced chat with conversation management and better RAG
router.post('/query', async (req, res) => {
  try {
    const { 
      message, 
      excludeLegacy = false, 
      categories = [],
      conversationId = null,
      userId = 'system'
    } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }

    const startTime = Date.now();
    console.log('Enhanced chat query:', message);

    // Generate conversation ID if not provided
    const actualConversationId = conversationId || uuidv4();

    // Step 1: Get relevant context using enhanced RAG
    const contextResult = await enhancedRagService.getContextForQuery(message, {
      excludeLegacy,
      categories,
      maxResults: 5,
      includeRelevanceScores: true,
      conversationId: actualConversationId
    });

    console.log('Enhanced Chat - Context result:', {
      foundRelevantContent: contextResult.foundRelevantContent,
      sourcesCount: contextResult.sources.length,
      contextLength: contextResult.context.length,
      searchMethods: contextResult.searchMethods,
      conversationContext: contextResult.conversationContext
    });

    // Step 2: Build enhanced prompt with context and conversation awareness
    let systemPrompt = `You are a helpful AI assistant that answers questions based on company documents and conversation history. `;
    
    if (contextResult.foundRelevantContent) {
      systemPrompt += `Use the following context from the company's documents to answer the question. Always cite which documents you're referencing.

CONTEXT FROM DOCUMENTS:
${contextResult.context}

Guidelines for responses:
- Always reference the source documents when providing information
- If the context doesn't contain relevant information for the question, say so clearly
- Maintain conversation context and refer to previous discussions when relevant
- Provide specific, actionable answers when possible
- Use a professional but approachable tone`;
      
      console.log('Enhanced Chat - Using context, system prompt length:', systemPrompt.length);
    } else {
      systemPrompt += `No relevant documents were found for this query. Let the user know that you don't have specific company information about their question, but offer to help in other ways if possible.

Since no relevant documents were found:
- Acknowledge that you don't have specific company information on this topic
- Suggest what types of documents might contain this information
- Offer general guidance if appropriate
- Encourage the user to upload relevant documents if they have them`;
      
      console.log('Enhanced Chat - No context found, using fallback prompt');
    }

    // Step 3: Prepare conversation context for better responses
    let conversationContext = '';
    if (actualConversationId) {
      try {
        const history = await enhancedRagService.getConversationHistory(actualConversationId, 3);
        if (history.length > 0) {
          conversationContext = history.map(turn => 
            `Human: ${turn.userMessage}\nAssistant: ${turn.assistantResponse.substring(0, 200)}...`
          ).join('\n\n');
        }
      } catch (historyError) {
        console.warn('Failed to get conversation history:', historyError.message);
      }
    }

    // Step 4: Build the user message with context
    let userMessage = message;
    if (conversationContext) {
      userMessage = `Previous conversation:\n${conversationContext}\n\nCurrent question: ${message}`;
    }

    // Step 5: Send to AI with enhanced configuration
    const aiRequest = {
      model: fluxAiConfig.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 1500, // Increased for more comprehensive responses
      stream: false
    };

    console.log('Enhanced Chat - Sending AI request with conversation ID:', actualConversationId);
    const aiResponse = await makeAiChatRequest(aiRequest);

    // Step 6: Extract the response text properly
    let responseText = '';
    
    if (aiResponse && aiResponse.choices && aiResponse.choices.length > 0) {
      const choice = aiResponse.choices[0];
      
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

    console.log('Enhanced Chat - Extracted response text length:', responseText.length);

    // Step 7: Store conversation turn for context management
    try {
      await enhancedRagService.storeConversationTurn(
        actualConversationId,
        message,
        responseText,
        contextResult.sources
      );
      console.log('Conversation turn stored successfully');
    } catch (storeError) {
      console.warn('Failed to store conversation turn:', storeError.message);
    }

    // Step 8: Calculate processing metrics
    const processingTime = Date.now() - startTime;

    // Step 9: Return comprehensive response
    const finalResponse = {
      success: true,
      response: responseText,
      sources: contextResult.sources,
      foundRelevantContent: contextResult.foundRelevantContent,
      totalDocumentsSearched: contextResult.totalResults || 0,
      query: message,
      conversationId: actualConversationId,
      searchMethods: contextResult.searchMethods || [],
      processingTime,
      metadata: {
        contextLength: contextResult.context.length,
        sourcesCount: contextResult.sources.length,
        aiModel: fluxAiConfig.model,
        promptLength: systemPrompt.length,
        hasConversationContext: !!conversationContext,
        tokenUsage: aiResponse.usage || {}
      }
    };

    console.log('Sending enhanced response to frontend:', {
      success: finalResponse.success,
      responseLength: finalResponse.response.length,
      sourcesCount: finalResponse.sources.length,
      foundRelevantContent: finalResponse.foundRelevantContent,
      conversationId: finalResponse.conversationId,
      processingTime: finalResponse.processingTime
    });

    res.json(finalResponse);

  } catch (error) {
    console.error('Enhanced chat query error:', error);
    
    // Send a comprehensive error response
    res.status(500).json({
      success: false,
      error: 'Failed to process chat query',
      response: 'Sorry, I encountered an error while processing your question. Please try again.',
      message: error.message,
      sources: [],
      foundRelevantContent: false,
      totalDocumentsSearched: 0,
      conversationId: req.body.conversationId || null,
      searchMethods: [],
      processingTime: 0
    });
  }
});

// Get enhanced chat capabilities info
router.get('/info', async (req, res) => {
  try {
    const { DocumentChunk, Document, Conversation, ConversationTurn } = require('../models');
    
    console.log('Getting enhanced chat info...');
    
    // Get counts with comprehensive error handling
    const [totalChunks, totalDocuments, processingDocuments, totalConversations, activeTurns] = await Promise.all([
      DocumentChunk.count().catch(() => 0),
      Document.count({ where: { status: 'processed' } }).catch(() => 0),
      Document.count({ where: { status: 'processing' } }).catch(() => 0),
      Conversation.count().catch(() => 0),
      ConversationTurn.count({ 
        where: { 
          createdAt: { 
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) 
          } 
        } 
      }).catch(() => 0)
    ]);
    
    console.log(`Enhanced chat info: ${totalDocuments} processed docs, ${totalChunks} chunks, ${totalConversations} conversations`);
    
    // Additional debug info
    const recentDocuments = await Document.findAll({
      attributes: ['id', 'originalName', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 3
    }).catch(() => []);
    
    const recentConversations = await Conversation.findAll({
      attributes: ['id', 'title', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 3
    }).catch(() => []);
    
    console.log('Sample documents:', recentDocuments.map(d => ({
      name: d.originalName,
      status: d.status,
      id: d.id
    })));
    
    const response = {
      available: totalChunks > 0,
      totalDocuments,
      totalChunks,
      processingDocuments,
      totalConversations,
      activeTurnsToday: activeTurns,
      capabilities: [
        'Answer questions about uploaded documents',
        'Search across all processed documents with enhanced relevance scoring', 
        'Provide source citations with confidence scores',
        'Filter by document categories and legacy status',
        'Maintain conversation context across multiple turns',
        'Support semantic similarity search',
        'Track conversation history and context'
      ],
      enhancedFeatures: [
        'Multi-stage retrieval with exact, keyword, and semantic matching',
        'Conversation context management',
        'Advanced relevance scoring',
        'Source citation with retrieval methods',
        'Real-time processing metrics'
      ],
      debug: {
        sampleDocuments: recentDocuments.slice(0, 3).map(d => ({
          name: d.originalName,
          status: d.status
        })),
        sampleConversations: recentConversations.map(c => ({
          id: c.id,
          title: c.title,
          isActive: c.isActive
        }))
      }
    };
    
    console.log('Sending enhanced chat info response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('Error getting enhanced chat info:', error);
    res.status(500).json({ 
      error: 'Failed to get chat info',
      available: false,
      totalDocuments: 0,
      totalChunks: 0,
      totalConversations: 0
    });
  }
});

// Get conversation history
router.get('/conversations/:conversationId/history', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 20 } = req.query;
    
    const history = await enhancedRagService.getConversationHistory(
      conversationId, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      conversationId,
      history,
      count: history.length
    });
    
  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation history'
    });
  }
});

// Start new conversation
router.post('/conversations/new', async (req, res) => {
  try {
    const { title, userId = 'system' } = req.body;
    const { Conversation } = require('../models');
    
    const conversation = await Conversation.create({
      userId,
      title: title || 'New Conversation',
      isActive: true
    });
    
    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        userId: conversation.userId,
        createdAt: conversation.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating new conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create new conversation'
    });
  }
});

// Get user conversations
router.get('/conversations', async (req, res) => {
  try {
    const { userId = 'system', limit = 50 } = req.query;
    const { Conversation, ConversationTurn } = require('../models');
    
    const conversations = await Conversation.findAll({
      where: { userId, isActive: true },
      include: [{
        model: ConversationTurn,
        as: 'turns',
        attributes: ['createdAt'],
        limit: 1,
        order: [['createdAt', 'DESC']]
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastActivity: conv.turns?.[0]?.createdAt || conv.createdAt,
      createdAt: conv.createdAt
    }));
    
    res.json({
      success: true,
      conversations: formattedConversations,
      count: formattedConversations.length
    });
    
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

// Enhanced test search endpoint with conversation context
router.get('/test-search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const { conversationId } = req.query;
    
    console.log(`Testing enhanced RAG search for: "${query}"`);
    
    const ragResult = await enhancedRagService.searchDocuments(query, {
      maxResults: 5,
      categories: [],
      excludeLegacy: false,
      includeRelevanceScores: true,
      conversationId
    });
    
    res.json({
      query,
      success: ragResult.success,
      chunksFound: ragResult.chunks?.length || 0,
      totalInDatabase: ragResult.totalFound || 0,
      searchMethods: ragResult.searchMethods || [],
      conversationContext: ragResult.conversationContext || false,
      chunks: ragResult.chunks?.map(chunk => ({
        id: chunk.id,
        documentName: chunk.document?.originalName,
        chunkIndex: chunk.chunkIndex,
        relevanceScore: chunk.relevanceScore,
        retrievalMethod: chunk.method,
        contentPreview: chunk.content?.substring(0, 200) + '...'
      })) || []
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      query: req.params.query
    });
  }
});

// Advanced analytics endpoint for chat performance
router.get('/analytics', async (req, res) => {
  try {
    const { ConversationTurn, Conversation } = require('../models');
    const { Op, fn, col } = require('sequelize');
    
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get conversation metrics
    const [totalTurns, avgProcessingTime, totalConversations] = await Promise.all([
      ConversationTurn.count({
        where: { createdAt: { [Op.gte]: startDate } }
      }),
      ConversationTurn.findOne({
        where: { 
          createdAt: { [Op.gte]: startDate },
          processingTime: { [Op.not]: null }
        },
        attributes: [
          [fn('AVG', col('processingTime')), 'avgTime']
        ]
      }),
      Conversation.count({
        where: { createdAt: { [Op.gte]: startDate } }
      })
    ]);
    
    // Get daily conversation counts
    const dailyActivity = await ConversationTurn.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']]
    });
    
    res.json({
      success: true,
      period: `${days} days`,
      metrics: {
        totalTurns,
        totalConversations,
        avgProcessingTime: avgProcessingTime?.dataValues?.avgTime || 0,
        avgTurnsPerConversation: totalConversations > 0 ? (totalTurns / totalConversations).toFixed(2) : 0
      },
      dailyActivity: dailyActivity.map(item => ({
        date: item.dataValues.date,
        interactions: parseInt(item.dataValues.count)
      }))
    });
    
  } catch (error) {
    console.error('Error getting chat analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat analytics'
    });
  }
});

// Debug endpoint for enhanced features
router.get('/debug/enhanced-features', async (req, res) => {
  try {
    const testQuery = 'employee policy handbook';
    
    // Test enhanced search
    const searchResult = await enhancedRagService.searchDocuments(testQuery, {
      maxResults: 3,
      includeRelevanceScores: true
    });
    
    // Test conversation context
    const testConversationId = 'test-conversation';
    const contextResult = await enhancedRagService.getConversationContext(testConversationId);
    
    res.json({
      success: true,
      enhancedSearch: {
        testQuery,
        chunksFound: searchResult.chunks?.length || 0,
        searchMethods: searchResult.searchMethods || [],
        totalResults: searchResult.totalFound || 0
      },
      conversationContext: {
        testConversationId,
        contextLength: contextResult.length,
        hasContext: contextResult.length > 0
      },
      capabilities: {
        multiStageRetrieval: true,
        conversationManagement: true,
        semanticSearch: false, // Placeholder - would be true with real embeddings
        advancedScoring: true,
        sourceAttribution: true
      }
    });
    
  } catch (error) {
    console.error('Enhanced features debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;