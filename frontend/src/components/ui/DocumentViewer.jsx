// frontend/src/components/ui/DocumentViewer.jsx - Document Preview Modal
import React, { useState } from 'react';
import { X, Download, Share, Eye, FileText, Copy, Check } from 'lucide-react';

const DocumentViewer = ({ document, isOpen, onClose, onDownload }) => {
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState('formatted');

  if (!isOpen || !document) return null;

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(document.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleDownload = (format) => {
    if (onDownload) {
      onDownload(format);
    }
  };

  const formatContent = (content) => {
    if (!content) return '';

    // Convert markdown-like formatting to HTML for display
    let formattedContent = content
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 text-gray-900">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3 text-gray-900">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-2 text-gray-900">$1</h3>')
      // Bullet points
      .replace(/^\* (.*)$/gm, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^\+ (.*)$/gm, '<li class="ml-4 mb-1">• $1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br />');

    // Wrap in paragraphs
    if (!formattedContent.includes('<h1>') && !formattedContent.includes('<li>')) {
      formattedContent = `<p class="mb-4">${formattedContent}</p>`;
    }

    return formattedContent;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {document.metadata?.templateTitle || document.title || 'Generated Document'}
              </h2>
              <p className="text-sm text-gray-500">
                Generated on {new Date(document.metadata?.generatedAt || Date.now()).toLocaleString()}
                {document.metadata?.language && ` • ${document.metadata.language}`}
                {document.metadata?.wordCount && ` • ${document.metadata.wordCount} words`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveFormat('formatted')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeFormat === 'formatted'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-4 h-4 mr-1 inline" />
                Formatted
              </button>
              <button
                onClick={() => setActiveFormat('raw')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeFormat === 'raw'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4 mr-1 inline" />
                Raw Text
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleCopyContent}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>

            <div className="relative group">
              <button className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
              </button>
              
              {/* Download Dropdown */}
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download as PDF
                  </button>
                  <button
                    onClick={() => handleDownload('docx')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download as DOCX
                  </button>
                  <button
                    onClick={() => handleDownload('txt')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download as TXT
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeFormat === 'formatted' ? (
            <div 
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formatContent(document.content || '') 
              }}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-full border">
              {document.content || 'No content available'}
            </div>
          )}
        </div>

        {/* Footer with Document Info */}
        {document.metadata && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {document.metadata.legalFramework && (
                <div>
                  <span className="font-medium text-gray-700">Legal Framework:</span>
                  <p className="text-gray-600">{document.metadata.legalFramework}</p>
                </div>
              )}
              {document.metadata.targetAudience && (
                <div>
                  <span className="font-medium text-gray-700">Target Audience:</span>
                  <p className="text-gray-600">{document.metadata.targetAudience.join(', ')}</p>
                </div>
              )}
              {document.metadata.estimatedLength && (
                <div>
                  <span className="font-medium text-gray-700">Length:</span>
                  <p className="text-gray-600">{document.metadata.estimatedLength}</p>
                </div>
              )}
              {document.metadata.tokenUsage && (
                <div>
                  <span className="font-medium text-gray-700">AI Usage:</span>
                  <p className="text-gray-600">{document.metadata.tokenUsage.total_tokens || 0} tokens</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;