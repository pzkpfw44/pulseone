// backend/utils/documentChunker.js
class DocumentChunker {
  constructor() {
    this.chunkSize = 1000; // Characters per chunk
    this.chunkOverlap = 200; // Overlap between chunks
  }

  // Main chunking method
  chunkDocument(text, documentId, filename) {
  console.log(`[Chunking] Starting chunking for: ${filename}`);
  console.log(`[Chunking] Input text length: ${text?.length || 0} characters`);
  
  if (!text || text.trim().length === 0) {
    console.warn(`[Chunking] No text content to chunk for: ${filename}`);
    return [];
  }

  const cleanText = this.cleanText(text);
  console.log(`[Chunking] Cleaned text length: ${cleanText.length} characters`);
  
  // Debug: Log first 200 characters to see what we're working with
  console.log(`[Chunking] Text preview: "${cleanText.substring(0, 200)}..."`);
  
  // If text is very short, create a single chunk
  if (cleanText.length < 500) {
    console.log(`[Chunking] Text too short for multiple chunks, creating single chunk`);
    return [{
      documentId,
      chunkIndex: 0,
      content: cleanText,
      wordCount: this.countWords(cleanText),
      startPosition: 0,
      endPosition: cleanText.length
    }];
  }

  const chunks = [];
  
  // First, try to split by meaningful sections
  const sections = this.identifyDocumentSections(cleanText);
  console.log(`[Chunking] Identified ${sections.length} document sections`);
  
  if (sections.length > 1) {
    // Process each section
    sections.forEach((section, index) => {
      const sectionChunks = this.chunkSection(section.content, documentId, index * 1000);
      chunks.push(...sectionChunks);
    });
  } else {
    // Fall back to paragraph-based chunking
    console.log(`[Chunking] Using paragraph-based chunking`);
    const paragraphChunks = this.chunkByParagraphs(cleanText, documentId);
    chunks.push(...paragraphChunks);
  }

  // Post-process chunks to ensure quality
  const processedChunks = this.postProcessChunks(chunks, filename);
  
  console.log(`[Chunking] Created ${processedChunks.length} chunks for: ${filename}`);
  processedChunks.forEach((chunk, index) => {
    console.log(`[Chunking] Chunk ${index}: ${chunk.wordCount} words, ${chunk.content.length} chars`);
  });
  
  return processedChunks;
}

// New method to identify document sections
identifyDocumentSections(text) {
  const sections = [];
  
  // Look for common section markers
  const sectionPatterns = [
    /^#{1,6}\s+(.+)$/gm, // Markdown headers
    /^([A-Z][A-Z\s]{3,}):?\s*$/gm, // ALL CAPS headers
    /^\d+\.\s+([^\.]+)$/gm, // Numbered sections
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):?\s*$/gm, // Title Case headers
  ];
  
  let matches = [];
  sectionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        header: match[1] || match[0],
        type: 'header'
      });
    }
  });
  
  // Sort by position
  matches.sort((a, b) => a.index - b.index);
  
  if (matches.length === 0) {
    // No clear sections found, return whole text as one section
    return [{ content: text, header: 'Document Content' }];
  }
  
  // Create sections based on headers
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const content = text.substring(start, end).trim();
    
    if (content.length > 50) { // Only include substantial sections
      sections.push({
        header: matches[i].header,
        content: content
      });
    }
  }
  
  return sections.length > 0 ? sections : [{ content: text, header: 'Document Content' }];
}

// Enhanced paragraph-based chunking
chunkByParagraphs(text, documentId) {
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let currentStart = 0;
  let chunkIndex = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    // Skip very short paragraphs that are likely formatting artifacts
    if (paragraph.length < 20) continue;
    
    const testChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    
    if (testChunk.length > this.chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(this.createChunk(
        currentChunk.trim(),
        chunkIndex,
        currentStart,
        currentStart + currentChunk.length,
        documentId
      ));
      
      // Start new chunk with overlap
      const overlapText = this.getOverlapText(currentChunk, this.chunkOverlap);
      currentChunk = overlapText ? overlapText + '\n\n' + paragraph : paragraph;
      currentStart = currentStart + currentChunk.length - (overlapText?.length || 0);
      chunkIndex++;
    } else {
      currentChunk = testChunk;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(this.createChunk(
      currentChunk.trim(),
      chunkIndex,
      currentStart,
      currentStart + currentChunk.length,
      documentId
    ));
  }
  
  return chunks;
}

// Chunk a single section
chunkSection(sectionContent, documentId, baseOffset) {
  if (sectionContent.length <= this.chunkSize) {
    return [this.createChunk(sectionContent, 0, baseOffset, baseOffset + sectionContent.length, documentId)];
  }
  
  // Use paragraph-based chunking for the section
  return this.chunkByParagraphs(sectionContent, documentId);
}

// Post-process chunks to improve quality
postProcessChunks(chunks, filename) {
  return chunks.filter(chunk => {
    // Remove chunks that are too short or seem like artifacts
    if (chunk.content.length < 30) {
      console.log(`[Chunking] Filtering out short chunk: "${chunk.content.substring(0, 50)}..."`);
      return false;
    }
    
    // Remove chunks that are mostly repetitive characters
    const uniqueChars = new Set(chunk.content.toLowerCase().replace(/\s/g, '')).size;
    if (uniqueChars < 10 && chunk.content.length > 100) {
      console.log(`[Chunking] Filtering out repetitive chunk: "${chunk.content.substring(0, 50)}..."`);
      return false;
    }
    
    // Remove chunks that are mostly URLs or metadata
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = chunk.content.match(urlPattern) || [];
    const urlLength = urls.join('').length;
    if (urlLength > chunk.content.length * 0.5) {
      console.log(`[Chunking] Filtering out URL-heavy chunk: "${chunk.content.substring(0, 50)}..."`);
      return false;
    }
    
    return true;
  }).map((chunk, index) => ({
    ...chunk,
    chunkIndex: index // Re-index after filtering
  }));
}

  // Create chunk object
  createChunk(content, index, start, end, documentId) {
    return {
      documentId,
      chunkIndex: index,
      content: content,
      wordCount: this.countWords(content),
      startPosition: start,
      endPosition: end
    };
  }

  // Get overlap text from end of chunk
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) return text;
    
    // Try to break at sentence or word boundary
    const overlap = text.slice(-overlapSize);
    const sentenceBreak = overlap.lastIndexOf('. ');
    
    if (sentenceBreak > overlapSize / 2) {
      return overlap.slice(sentenceBreak + 2);
    }
    
    const wordBreak = overlap.lastIndexOf(' ');
    if (wordBreak > 0) {
      return overlap.slice(wordBreak + 1);
    }
    
    return overlap;
  }

  // Clean text for chunking
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Count words
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  // Search chunks by keyword
  searchChunks(chunks, query, maxResults = 5) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = chunks.map(chunk => {
      const content = chunk.content.toLowerCase();
      let score = 0;
      
      // Exact phrase bonus
      if (content.includes(query.toLowerCase())) {
        score += 10;
      }
      
      // Individual word matches
      queryWords.forEach(word => {
        const matches = (content.match(new RegExp(word, 'g')) || []).length;
        score += matches;
      });
      
      return { ...chunk, relevanceScore: score };
    });

    return scored
      .filter(chunk => chunk.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }
}

module.exports = new DocumentChunker();