import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, FileText, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const ChatAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState(null);

  // Load chat capabilities on component mount
  useEffect(() => {
    loadChatInfo();
  }, []);

  const loadChatInfo = async () => {
    try {
      const response = await api.get('/chat/info');
      setChatInfo(response.data);
    } catch (error) {
      console.error('Error loading chat info:', error);
    }
  };

  const sendMessage = async () => {
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
        excludeLegacy: false,
        categories: []
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        sources: response.data.sources || [],
        foundRelevantContent: response.data.foundRelevantContent,
        totalDocumentsSearched: response.data.totalDocumentsSearched
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error while processing your question.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Chat Assistant</h1>
        <p className="text-gray-600">Ask questions about your uploaded documents</p>
      </div>

      {/* Chat Info */}
      {chatInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Knowledge Base Status</h3>
              <p className="text-sm text-blue-700 mt-1">
                {chatInfo.available ? (
                  `Ready to answer questions from ${chatInfo.totalDocuments} documents (${chatInfo.totalChunks} searchable sections)`
                ) : (
                  'No documents available. Upload documents in Knowledge Feed to get started.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="bg-white rounded-lg shadow-sm border flex flex-col h-96">
        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p>Start a conversation by asking about your documents</p>
              <p className="text-sm mt-2">Try: "What is this document about?" or "Summarize the main points"</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3/4 p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-charcoal-600 text-white' 
                    : message.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.sources.map((source, index) => (
                          <div key={index} className="text-xs text-gray-500 flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            <span>{source.filename}</span>
                            {source.relevanceScore && (
                              <span className="ml-2 bg-gray-200 px-1 rounded text-xs">
                                Score: {source.relevanceScore}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Metadata */}
                  {message.totalDocumentsSearched !== undefined && (
                    <div className="mt-2 text-xs text-gray-500">
                      Searched {message.totalDocumentsSearched} document sections
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 p-3 rounded-lg flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your documents..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent resize-none"
              rows="2"
              disabled={isLoading || !chatInfo?.available}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading || !chatInfo?.available}
              className="btn-brand-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          {!chatInfo?.available && (
            <div className="mt-2 text-sm text-amber-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Upload documents first to enable chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;