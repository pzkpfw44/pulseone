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
    console.log(`[PDF Extraction] Starting extraction for: ${originalName}`);
    
    const dataBuffer = await fs.readFile(filePath);
    console.log(`[PDF Extraction] File size: ${dataBuffer.length} bytes`);
    
    // Try multiple extraction approaches
    let extractedText = '';
    let extractionMethod = 'unknown';
    let warnings = [];

    try {
      // Primary extraction method
      const data = await pdfParse(dataBuffer, {
        max: 0, // No page limit
        version: 'v1.10.100',
        // Additional options for better text extraction
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });

      extractedText = data.text;
      extractionMethod = 'pdf-parse-primary';
      
      console.log(`[PDF Extraction] Primary method extracted ${data.text.length} characters from ${data.numpages} pages`);
      
      // If we got very little text, try alternative extraction
      if (data.text.length < 100) {
        console.log(`[PDF Extraction] Low text content (${data.text.length} chars), trying alternative extraction`);
        
        try {
          // Alternative extraction with different options
          const altData = await pdfParse(dataBuffer, {
            max: 0,
            // Try with different settings
            normalizeWhitespace: true,
            disableCombineTextItems: true
          });
          
          if (altData.text.length > extractedText.length) {
            extractedText = altData.text;
            extractionMethod = 'pdf-parse-alternative';
            console.log(`[PDF Extraction] Alternative method improved extraction to ${altData.text.length} characters`);
          }
        } catch (altError) {
          console.warn(`[PDF Extraction] Alternative method failed: ${altError.message}`);
        }
      }

      // Check if extraction seems successful
      if (extractedText.length < 50) {
        warnings.push({
          type: 'warning',
          message: `Very little text extracted (${extractedText.length} characters)`,
          suggestion: 'PDF may contain mostly images or be password protected. Consider converting to a text-based format.'
        });
      }

      // Check for common PDF issues
      if (extractedText.includes('�') || extractedText.includes('\\u')) {
        warnings.push({
          type: 'warning',
          message: 'Possible encoding issues detected in extracted text',
          suggestion: 'Some characters may not have been extracted correctly.'
        });
      }

      const cleanText = this.cleanExtractedText(extractedText);
      
      console.log(`[PDF Extraction] Final extraction: ${cleanText.length} characters (cleaned from ${extractedText.length})`);

      return {
        text: cleanText,
        method: extractionMethod,
        stats: {
          pages: data.numpages || 0,
          textLength: cleanText.length,
          originalTextLength: extractedText.length,
          wordCount: this.countWords(cleanText),
          extractionQuality: this.assessExtractionQuality(cleanText, dataBuffer.length)
        },
        warnings: warnings,
        debug: {
          firstPagePreview: extractedText.substring(0, 500),
          hasMetadata: !!data.metadata,
          pdfVersion: data.version,
          fileSize: dataBuffer.length
        }
      };

    } catch (pdfError) {
      console.error(`[PDF Extraction] pdf-parse failed: ${pdfError.message}`);
      
      // Try to provide helpful error information
      let errorMessage = `PDF extraction failed: ${pdfError.message}`;
      let suggestions = [];
      
      if (pdfError.message.includes('Invalid PDF')) {
        suggestions.push('File may be corrupted or not a valid PDF');
      } else if (pdfError.message.includes('password')) {
        suggestions.push('PDF appears to be password protected');
      } else if (pdfError.message.includes('encryption')) {
        suggestions.push('PDF uses encryption that prevents text extraction');
      } else {
        suggestions.push('Try converting the PDF to a different format or reducing file size');
      }

      throw new Error(`${errorMessage}. Suggestions: ${suggestions.join(', ')}`);
    }

  } catch (error) {
    console.error(`[PDF Extraction] Fatal error for ${originalName}:`, error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

// Add this helper method to assess extraction quality
assessExtractionQuality(text, fileSize) {
  if (!text || text.length === 0) return 0;
  
  const fileSizeMB = fileSize / (1024 * 1024);
  const textToFileSizeRatio = text.length / fileSize;
  
  let score = 50; // Base score
  
  // Text length scoring
  if (text.length > 1000) score += 20;
  else if (text.length > 500) score += 10;
  else if (text.length < 100) score -= 30;
  
  // Text to file size ratio (indicates how much actual text vs images/formatting)
  if (textToFileSizeRatio > 0.01) score += 20; // Good ratio
  else if (textToFileSizeRatio < 0.001) score -= 20; // Poor ratio, likely image-heavy
  
  // Check for meaningful content patterns
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 5) score += 10;
  
  // Check for repeated characters or gibberish
  const repeatedChars = text.match(/(.)\1{5,}/g);
  if (repeatedChars && repeatedChars.length > 3) score -= 15;
  
  return Math.max(0, Math.min(100, score));
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