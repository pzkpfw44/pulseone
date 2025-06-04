// backend/routes/conversation.routes.js
const express = require('express');
const router = express.Router();
const { Conversation, ConversationTurn } = require('../models');
const { Op } = require('sequelize');

// Get all conversations for a user
router.get('/', async (req, res) => {
  try {
    const { 
      userId = 'system', 
      limit = 50, 
      offset = 0, 
      includeInactive = false 
    } = req.query;

    const whereClause = { userId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const conversations = await Conversation.findAndCountAll({
      where: whereClause,
      include: [{
        model: ConversationTurn,
        as: 'turns',
        attributes: ['id', 'userMessage', 'createdAt'],
        limit: 1,
        order: [['createdAt', 'DESC']],
        required: false
      }],
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedConversations = conversations.rows.map(conv => ({
      id: conv.id,
      title: conv.title,
      isActive: conv.isActive,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage: conv.turns[0]?.userMessage?.substring(0, 100) || null,
      lastActivity: conv.turns[0]?.createdAt || conv.createdAt,
      turnCount: conv.turns.length
    }));

    res.json({
      success: true,
      conversations: formattedConversations,
      pagination: {
        total: conversations.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: conversations.count > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

// Create a new conversation
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      userId = 'system',
      context = {} 
    } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Conversation title is required'
      });
    }

    const conversation = await Conversation.create({
      userId,
      title: title.trim(),
      context,
      isActive: true
    });

    res.status(201).json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        userId: conversation.userId,
        context: conversation.context,
        isActive: conversation.isActive,
        createdAt: conversation.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});

// Get a specific conversation with its turns
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { 
      includeTurns = true, 
      turnLimit = 50,
      turnOffset = 0 
    } = req.query;

    const includeOptions = [];
    
    if (includeTurns === 'true') {
      includeOptions.push({
        model: ConversationTurn,
        as: 'turns',
        order: [['createdAt', 'ASC']],
        limit: parseInt(turnLimit),
        offset: parseInt(turnOffset),
        attributes: [
          'id', 'userMessage', 'assistantResponse', 'sources', 
          'metadata', 'relevanceScore', 'processingTime', 'createdAt'
        ]
      });
    }

    const conversation = await Conversation.findByPk(conversationId, {
      include: includeOptions
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const response = {
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        userId: conversation.userId,
        context: conversation.context,
        isActive: conversation.isActive,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    };

    if (includeTurns === 'true' && conversation.turns) {
      response.conversation.turns = conversation.turns.map(turn => ({
        id: turn.id,
        userMessage: turn.userMessage,
        assistantResponse: turn.assistantResponse,
        sources: JSON.parse(turn.sources || '[]'),
        metadata: turn.metadata || {},
        relevanceScore: turn.relevanceScore,
        processingTime: turn.processingTime,
        createdAt: turn.createdAt
      }));

      response.conversation.turnCount = conversation.turns.length;
    }

    res.json(response);

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation'
    });
  }
});

// Update conversation metadata
router.put('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title, context, isActive } = req.body;

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (context !== undefined) updateData.context = context;
    if (isActive !== undefined) updateData.isActive = isActive;

    await conversation.update(updateData);

    res.json({
      success: true,
      message: 'Conversation updated successfully',
      conversation: {
        id: conversation.id,
        title: conversation.title,
        userId: conversation.userId,
        context: conversation.context,
        isActive: conversation.isActive,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation'
    });
  }
});

// Delete conversation (soft delete - mark as inactive)
router.delete('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { hardDelete = false } = req.query;

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    if (hardDelete === 'true') {
      // Hard delete - remove conversation and all turns
      await ConversationTurn.destroy({
        where: { conversationId }
      });
      await conversation.destroy();
      
      res.json({
        success: true,
        message: 'Conversation permanently deleted'
      });
    } else {
      // Soft delete - mark as inactive
      await conversation.update({ isActive: false });
      
      res.json({
        success: true,
        message: 'Conversation archived (soft deleted)'
      });
    }

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation'
    });
  }
});

// Add a turn to a conversation
router.post('/:conversationId/turns', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const {
      userMessage,
      assistantResponse,
      sources = [],
      metadata = {},
      relevanceScore = null,
      processingTime = null
    } = req.body;

    if (!userMessage || !assistantResponse) {
      return res.status(400).json({
        success: false,
        error: 'Both userMessage and assistantResponse are required'
      });
    }

    // Verify conversation exists
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Create the conversation turn
    const turn = await ConversationTurn.create({
      conversationId,
      userMessage,
      assistantResponse,
      sources: JSON.stringify(sources),
      metadata,
      relevanceScore,
      processingTime
    });

    // Update conversation's updatedAt timestamp
    await conversation.update({ updatedAt: new Date() });

    res.status(201).json({
      success: true,
      turn: {
        id: turn.id,
        conversationId: turn.conversationId,
        userMessage: turn.userMessage,
        assistantResponse: turn.assistantResponse,
        sources: JSON.parse(turn.sources),
        metadata: turn.metadata,
        relevanceScore: turn.relevanceScore,
        processingTime: turn.processingTime,
        createdAt: turn.createdAt
      }
    });

  } catch (error) {
    console.error('Error adding conversation turn:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add conversation turn'
    });
  }
});

// Get conversation turns with pagination
router.get('/:conversationId/turns', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { 
      limit = 50, 
      offset = 0, 
      order = 'ASC' 
    } = req.query;

    // Verify conversation exists
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const turns = await ConversationTurn.findAndCountAll({
      where: { conversationId },
      order: [['createdAt', order.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'userMessage', 'assistantResponse', 'sources',
        'metadata', 'relevanceScore', 'processingTime', 'createdAt'
      ]
    });

    const formattedTurns = turns.rows.map(turn => ({
      id: turn.id,
      userMessage: turn.userMessage,
      assistantResponse: turn.assistantResponse,
      sources: JSON.parse(turn.sources || '[]'),
      metadata: turn.metadata || {},
      relevanceScore: turn.relevanceScore,
      processingTime: turn.processingTime,
      createdAt: turn.createdAt
    }));

    res.json({
      success: true,
      turns: formattedTurns,
      pagination: {
        total: turns.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: turns.count > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching conversation turns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation turns'
    });
  }
});

// Get conversation analytics
router.get('/:conversationId/analytics', async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify conversation exists
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Get conversation analytics
    const turns = await ConversationTurn.findAll({
      where: { conversationId },
      attributes: [
        'processingTime', 'relevanceScore', 'metadata', 'createdAt'
      ]
    });

    if (turns.length === 0) {
      return res.json({
        success: true,
        analytics: {
          totalTurns: 0,
          avgProcessingTime: 0,
          avgRelevanceScore: 0,
          conversationDuration: 0,
          sourcesUsed: 0
        }
      });
    }

    // Calculate analytics
    const processingTimes = turns
      .filter(turn => turn.processingTime !== null)
      .map(turn => turn.processingTime);
    
    const relevanceScores = turns
      .filter(turn => turn.relevanceScore !== null)
      .map(turn => turn.relevanceScore);

    const allSources = turns.flatMap(turn => {
      try {
        return JSON.parse(turn.sources || '[]');
      } catch {
        return [];
      }
    });

    const conversationStart = new Date(turns[0].createdAt);
    const conversationEnd = new Date(turns[turns.length - 1].createdAt);
    const conversationDuration = conversationEnd - conversationStart;

    const analytics = {
      totalTurns: turns.length,
      avgProcessingTime: processingTimes.length > 0 
        ? Math.round(processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length)
        : 0,
      avgRelevanceScore: relevanceScores.length > 0
        ? Math.round((relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length) * 100) / 100
        : 0,
      conversationDuration: Math.round(conversationDuration / 1000), // in seconds
      sourcesUsed: allSources.length,
      uniqueDocuments: [...new Set(allSources.map(source => source.filename))].length,
      conversationStarted: conversationStart,
      lastActivity: conversationEnd
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching conversation analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation analytics'
    });
  }
});

// Search conversations
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      userId = 'system',
      limit = 20,
      offset = 0
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchQuery = query.trim();

    // Search in conversation titles and turn content
    const conversations = await Conversation.findAndCountAll({
      where: {
        userId,
        isActive: true,
        [Op.or]: [
          { title: { [Op.like]: `%${searchQuery}%` } },
          { '$turns.userMessage$': { [Op.like]: `%${searchQuery}%` } },
          { '$turns.assistantResponse$': { [Op.like]: `%${searchQuery}%` } }
        ]
      },
      include: [{
        model: ConversationTurn,
        as: 'turns',
        attributes: ['userMessage', 'assistantResponse', 'createdAt'],
        required: false
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updatedAt', 'DESC']],
      distinct: true
    });

    const formattedResults = conversations.rows.map(conv => {
      const relevantTurns = conv.turns.filter(turn => 
        turn.userMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        turn.assistantResponse.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        matchingTurns: relevantTurns.length,
        lastMatchingTurn: relevantTurns[relevantTurns.length - 1] || null
      };
    });

    res.json({
      success: true,
      query: searchQuery,
      results: formattedResults,
      pagination: {
        total: conversations.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: conversations.count > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error searching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search conversations'
    });
  }
});

// Export conversation
router.get('/:conversationId/export', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { format = 'json' } = req.query;

    const conversation = await Conversation.findByPk(conversationId, {
      include: [{
        model: ConversationTurn,
        as: 'turns',
        order: [['createdAt', 'ASC']],
        attributes: [
          'userMessage', 'assistantResponse', 'sources',
          'metadata', 'relevanceScore', 'processingTime', 'createdAt'
        ]
      }]
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const exportData = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        turnCount: conversation.turns.length
      },
      turns: conversation.turns.map(turn => ({
        userMessage: turn.userMessage,
        assistantResponse: turn.assistantResponse,
        sources: JSON.parse(turn.sources || '[]'),
        metadata: turn.metadata,
        relevanceScore: turn.relevanceScore,
        processingTime: turn.processingTime,
        timestamp: turn.createdAt
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    if (format === 'txt') {
      // Export as plain text
      let textExport = `Conversation: ${conversation.title}\n`;
      textExport += `Created: ${conversation.createdAt}\n`;
      textExport += `Turns: ${conversation.turns.length}\n`;
      textExport += '\n' + '='.repeat(50) + '\n\n';

      conversation.turns.forEach((turn, index) => {
        textExport += `Turn ${index + 1} (${turn.createdAt})\n`;
        textExport += `Human: ${turn.userMessage}\n\n`;
        textExport += `Assistant: ${turn.assistantResponse}\n\n`;
        
        const sources = JSON.parse(turn.sources || '[]');
        if (sources.length > 0) {
          textExport += 'Sources: ' + sources.map(s => s.filename).join(', ') + '\n';
        }
        textExport += '\n' + '-'.repeat(30) + '\n\n';
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.txt"`);
      res.send(textExport);
    } else {
      // Export as JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.json"`);
      res.json(exportData);
    }

  } catch (error) {
    console.error('Error exporting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export conversation'
    });
  }
});

module.exports = router;