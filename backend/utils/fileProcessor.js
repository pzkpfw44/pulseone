// backend/utils/fileProcessor.js
const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

class FileProcessor {
  constructor() {
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.warningFileSize = 50 * 1024 * 1024; // 50MB
    this.supportedTypes = {
      'application/pdf': this.extractFromPDF,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.extractFromDOCX,
      'application/msword': this.extractFromDOC,
      'text/plain': this.extractFromTXT,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': this.extractFromXLSX,
      'application/vnd.ms-excel': this.extractFromXLS,
      'text/csv': this.extractFromCSV,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': this.extractFromPPTX
    };
  }

  // Main processing entry point
  async processFile(filePath, originalName, mimeType) {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // File size validation
      const sizeValidation = this.validateFileSize(fileSize, originalName);
      
      // Extract content based on file type
      const contentData = await this.extractContent(filePath, mimeType, originalName);
      
      // Generate metadata
      const metadata = await this.generateMetadata(contentData, fileSize, originalName);

      return {
        success: true,
        extractedText: contentData.text,
        metadata: metadata,
        warnings: sizeValidation.warnings,
        contentStats: contentData.stats,
        processingInfo: {
          fileSize,
          mimeType,
          extractionMethod: contentData.method,
          processingTime: Date.now()
        }
      };

    } catch (error) {
      console.error('File processing error:', error);
      return {
        success: false,
        error: error.message,
        extractedText: '',
        metadata: {}
      };
    }
  }

  // File size validation with warnings
  validateFileSize(fileSize, filename) {
    const warnings = [];
    
    if (fileSize > this.maxFileSize) {
      throw new Error(`File "${filename}" exceeds maximum size limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }
    
    if (fileSize > this.warningFileSize) {
      warnings.push({
        type: 'large_file',
        message: `File "${filename}" is ${(fileSize / (1024 * 1024)).toFixed(1)}MB. Consider optimizing for better processing performance.`,
        suggestion: 'Try compressing images or removing unnecessary media elements.'
      });
    }

    // Check for potentially oversized files with little content
    const extension = path.extname(filename).toLowerCase();
    if (['.ppt', '.pptx'].includes(extension) && fileSize > 20 * 1024 * 1024) {
      warnings.push({
        type: 'potential_oversized_media',
        message: 'PowerPoint file appears to contain high-resolution images that may not be necessary for text extraction.',
        suggestion: 'Consider saving as PDF or reducing image resolution if only text content is needed.'
      });
    }

    return { warnings, isValid: true };
  }

  // Content extraction dispatcher
  async extractContent(filePath, mimeType, originalName) {
    const processor = this.supportedTypes[mimeType];
    
    if (!processor) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    return await processor.call(this, filePath, originalName);
  }

  // PDF content extraction
  async extractFromPDF(filePath, originalName) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer, {
        // Optimize for text extraction, ignore images
        max: 0, // No page limit
        version: 'v1.10.100'
      });

      return {
        text: this.cleanExtractedText(data.text),
        method: 'pdf-parse',
        stats: {
          pages: data.numpages,
          textLength: data.text.length,
          wordCount: this.countWords(data.text)
        }
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  // DOCX content extraction
  async extractFromDOCX(filePath, originalName) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = this.cleanExtractedText(result.value);

      return {
        text: text,
        method: 'mammoth',
        stats: {
          textLength: text.length,
          wordCount: this.countWords(text),
          warnings: result.messages
        }
      };
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }

  // DOC content extraction (legacy)
  async extractFromDOC(filePath, originalName) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = this.cleanExtractedText(result.value);

      return {
        text: text,
        method: 'mammoth-legacy',
        stats: {
          textLength: text.length,
          wordCount: this.countWords(text)
        }
      };
    } catch (error) {
      throw new Error(`DOC extraction failed: ${error.message}`);
    }
  }

  // Plain text extraction
  async extractFromTXT(filePath, originalName) {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      const cleanText = this.cleanExtractedText(text);

      return {
        text: cleanText,
        method: 'direct-read',
        stats: {
          textLength: cleanText.length,
          wordCount: this.countWords(cleanText)
        }
      };
    } catch (error) {
      throw new Error(`TXT extraction failed: ${error.message}`);
    }
  }

  // Excel content extraction
  async extractFromXLSX(filePath, originalName) {
    try {
      const workbook = XLSX.readFile(filePath);
      let allText = '';
      let sheetNames = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_txt(worksheet);
        allText += `\n=== Sheet: ${sheetName} ===\n${sheetText}\n`;
        sheetNames.push(sheetName);
      });

      const cleanText = this.cleanExtractedText(allText);

      return {
        text: cleanText,
        method: 'xlsx',
        stats: {
          sheets: sheetNames.length,
          sheetNames: sheetNames,
          textLength: cleanText.length,
          wordCount: this.countWords(cleanText)
        }
      };
    } catch (error) {
      throw new Error(`XLSX extraction failed: ${error.message}`);
    }
  }

  // Legacy Excel extraction
  async extractFromXLS(filePath, originalName) {
    return await this.extractFromXLSX(filePath, originalName);
  }

  // CSV content extraction
  async extractFromCSV(filePath, originalName) {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      const cleanText = this.cleanExtractedText(text);

      // Parse CSV to get basic stats
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0] ? lines[0].split(',').length : 0;

      return {
        text: cleanText,
        method: 'csv-direct',
        stats: {
          rows: lines.length,
          columns: headers,
          textLength: cleanText.length,
          wordCount: this.countWords(cleanText)
        }
      };
    } catch (error) {
      throw new Error(`CSV extraction failed: ${error.message}`);
    }
  }

  // PowerPoint content extraction
  async extractFromPPTX(filePath, originalName) {
    try {
      // For now, we'll extract basic text using a simple approach
      // In production, you might want to use a more sophisticated PPTX parser
      const text = `PowerPoint file: ${originalName}\n[Text extraction from PPTX files requires additional processing - placeholder for now]`;
      
      return {
        text: text,
        method: 'pptx-placeholder',
        stats: {
          textLength: text.length,
          wordCount: this.countWords(text),
          note: 'PPTX extraction is basic - consider converting to PDF for better text extraction'
        }
      };
    } catch (error) {
      throw new Error(`PPTX extraction failed: ${error.message}`);
    }
  }

  // Clean extracted text
  cleanExtractedText(text) {
    if (!text) return '';
    
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with processing
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  }

  // Count words in text
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Generate file metadata
  async generateMetadata(contentData, fileSize, originalName) {
    const extension = path.extname(originalName).toLowerCase();
    
    return {
      originalName,
      extension,
      fileSize,
      fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
      extractionMethod: contentData.method,
      contentStats: contentData.stats,
      textPreview: contentData.text ? contentData.text.substring(0, 500) + '...' : '',
      wordCount: contentData.stats.wordCount || 0,
      extractedAt: new Date().toISOString(),
      qualityScore: this.calculateQualityScore(contentData)
    };
  }

  // Calculate content quality score
  calculateQualityScore(contentData) {
    let score = 0;
    
    // Base score for successful extraction
    score += 30;
    
    // Word count score (more words = higher quality for documents)
    const wordCount = contentData.stats.wordCount || 0;
    if (wordCount > 100) score += 20;
    if (wordCount > 500) score += 20;
    if (wordCount > 1000) score += 20;
    
    // Penalize very short content
    if (wordCount < 50) score -= 30;
    
    // Bonus for structured content
    if (contentData.text && contentData.text.includes('\n')) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  // Get supported file types for frontend
  getSupportedTypes() {
    return {
      mimeTypes: Object.keys(this.supportedTypes),
      extensions: ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.csv', '.pptx'],
      maxSize: this.maxFileSize,
      warningSize: this.warningFileSize
    };
  }
}

module.exports = new FileProcessor();