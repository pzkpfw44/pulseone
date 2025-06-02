import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, RefreshCw, FileText, Database, 
  Lightbulb, Clock, Copy, ThumbsUp, ThumbsDown 
} from 'lucide-react';
import api from '../services/api';

const ChatAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectedSources, setConnectedSources] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load initial data
    loadConnectedSources();
    // Add welcome message
    setMessages([{
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI assistant powered by Pulse One. I can help you analyze your HR data, generate insights, and answer questions about your organization. What would you like to explore today?',
      timestamp: new Date(),
      sources: []
    }]);
  }, []);

  const loadConnectedSources = async () => {
    try {
      const response = await api.get('/chat/sources');
      setConnectedSources(response.data || []);
    } catch (error) {
      console.error('Error loading connected sources:', error);
      // Mock data for now
      setConnectedSources([
        { type: 'Pulse 360', status: 'connected', documents: 12 },
        { type: 'Company Policies', status: 'connected', documents: 8 },
        { type: 'Job Descriptions', status: 'connected', documents: 15 }
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/query', {
        message: inputMessage,
        conversationHistory: messages.slice(-5) // Last 5 messages for context
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.response || 'I received your message and I\'m processing it. This is a placeholder response while the RAG system is being built.',
        timestamp: new Date(),
        sources: response.data.sources || [],
        confidence: response.data.confidence || 0.9
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I apologize, but I\'m having trouble processing your request right now. The Pulse One RAG system is still being configured. Please try again later.',
        timestamp: new Date(),
        sources: [],
        error: true
      };

      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What are the key insights from our latest 360 feedback data?",
    "Show me performance trends across departments",
    "What are our most common training needs?",
    "Generate a summary of employee engagement metrics",
    "What leadership development opportunities should we prioritize?"
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Chat Assistant</h1>
            <p className="text-gray-600">Powered by advanced RAG technology and Flux AI</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              <span className="inline-flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Connected to {connectedSources.length} data sources
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with connected sources */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Connected Data Sources</h3>
          <div className="space-y-3 mb-6">
            {connectedSources.map((source, index) => (
              <div key={index} className="bg-white p-3 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{source.type}</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                    <span className="text-xs text-green-600">Connected</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{source.documents} documents indexed</p>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-gray-900 mb-4">Suggested Questions</h3>
          <div className="space-y-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(question)}
                className="w-full text-left text-sm text-gray-600 hover:text-blue-600 p-2 rounded hover:bg-white transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl flex ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white ml-3' 
                      : 'bg-gray-100 text-gray-600 mr-3'
                  }`}>
                    {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message content */}
                  <div className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : message.error 
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold mb-2">Sources:</p>
                          <div className="space-y-1">
                            {message.sources.map((source, index) => (
                              <div key={index} className="text-xs bg-white rounded px-2 py-1 text-gray-700">
                                <FileText className="w-3 h-3 inline mr-1" />
                                {source.name || `Source ${index + 1}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message metadata */}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.type === 'bot' && !message.error && (
                        <>
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button className="text-xs text-gray-400 hover:text-green-600">
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button className="text-xs text-gray-400 hover:text-red-600">
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {message.confidence && (
                        <span className="text-xs text-gray-400">
                          {Math.round(message.confidence * 100)}% confident
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl flex space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your HR data, policies, or analytics..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;