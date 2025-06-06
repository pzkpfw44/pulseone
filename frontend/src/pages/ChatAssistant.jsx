import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, FileText, AlertCircle, Loader2, X } from 'lucide-react';
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
      console.log('Chat info loaded:', response.data); // Debug log
    } catch (error) {
      console.error('Error loading chat info:', error);
    }
  };

  // Format AI response text to improve readability
  const formatAiResponse = (text) => {
    if (!text) return text;
    
    // Convert bullet points and improve formatting
    let formatted = text
      // Convert asterisks to bullet points
      .replace(/\* \*\*(.*?)\*\*:/g, '• **$1**:')
      .replace(/\*\*(.*?)\*\*/g, '**$1**')
      // Convert tabs to proper indentation
      .replace(/\t\+/g, '  •')
      .replace(/\t/g, '    ')
      // Improve spacing around sections
      .replace(/\n\* /g, '\n• ')
      .replace(/\n\n\*/g, '\n\n•')
      // Clean up multiple spaces
      .replace(/  +/g, ' ')
      // Ensure proper line breaks before bullet points
      .replace(/([^\n])\n• /g, '$1\n\n• ');
    
    return formatted;
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
      console.log('Sending chat request:', inputMessage);

      const response = await api.post('/chat/query', {
        message: inputMessage,
        excludeLegacy: false,
        categories: []
      });

      console.log('Full chat response:', response.data);

      // Enhanced response parsing
      let aiResponseText = '';
      
      if (response.data.success === false) {
        aiResponseText = response.data.error || 'Sorry, I encountered an error while processing your question.';
      } else if (response.data.response) {
        aiResponseText = formatAiResponse(response.data.response);
      } else if (response.data.message) {
        aiResponseText = formatAiResponse(response.data.message);
      } else if (response.data.answer) {
        aiResponseText = formatAiResponse(response.data.answer);
      } else {
        console.warn('Unexpected response format:', response.data);
        aiResponseText = 'Sorry, I received an unexpected response format.';
      }

      console.log('Formatted AI response text:', aiResponseText);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
        sources: response.data.sources || [],
        foundRelevantContent: response.data.foundRelevantContent,
        totalDocumentsSearched: response.data.totalDocumentsSearched,
        rawResponse: response.data
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Sorry, I encountered an error while processing your question.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `Network error: ${error.message}`;
      }
      
      const errorMessageObj = {
        id: Date.now() + 1,
        type: 'error',
        content: errorMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessageObj]);
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

  // Component to render formatted text with markdown-like styling
  const FormattedText = ({ text }) => {
    const lines = text.split('\n');
    
    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
          if (line.trim() === '') return <br key={index} />;
          
          // Handle bullet points
          if (line.includes('•')) {
            const [indent, content] = line.split('•');
            const indentLevel = indent.length;
            return (
              <div key={index} className={`flex items-start ${indentLevel > 0 ? 'ml-4' : ''}`}>
                <span className="text-gray-600 mr-2 mt-1">•</span>
                <span className="flex-1">{content.trim()}</span>
              </div>
            );
          }
          
          // Handle bold text
          if (line.includes('**')) {
            const parts = line.split(/(\*\*.*?\*\*)/);
            return (
              <p key={index} className="mb-1">
                {parts.map((part, partIndex) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </p>
            );
          }
          
          // Regular text
          return <p key={index} className="mb-1">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Chat Assistant</h1>
          <p className="text-gray-600">Ask questions about your uploaded documents</p>
        </div>
        <button 
          onClick={loadChatInfo}
          className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Chat Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Knowledge Base Status</h3>
            {chatInfo ? (
              <p className="text-sm text-blue-700 mt-1">
                {chatInfo.available ? (
                  `Ready to answer questions from ${chatInfo.totalDocuments} documents (${chatInfo.totalChunks} searchable sections)`
                ) : (
                  'No documents available. Upload documents in Knowledge Feed to get started.'
                )}
              </p>
            ) : (
              <p className="text-sm text-blue-700 mt-1">Loading knowledge base status...</p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-lg shadow-sm border flex flex-col h-96">
        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p>Start a conversation by asking about your documents</p>
              <p className="text-sm mt-2">Try: "What are the pillars of the leadership model?" or "Summarize the main points"</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3/4 p-4 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-charcoal-600 text-white' 
                    : message.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {message.type === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="text-sm">
                      <FormattedText text={message.content} />
                    </div>
                  )}
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
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
                      {message.foundRelevantContent !== undefined && (
                        <span className="ml-2">
                          | Found relevant content: {message.foundRelevantContent ? 'Yes' : 'No'}
                        </span>
                      )}
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

      {/* Development Helper */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-yellow-800">Development Mode</p>
          <p className="text-yellow-700">Check browser console for detailed API logs</p>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;