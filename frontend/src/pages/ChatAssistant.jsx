import React from 'react';
import { MessageSquare } from 'lucide-react';

const ChatAssistant = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Chat Assistant</h1>
        <p className="text-gray-600">Powered by advanced RAG technology and Flux AI</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chat Assistant</h3>
        <p className="text-gray-500">This feature is under development.</p>
      </div>
    </div>
  );
};

export default ChatAssistant;