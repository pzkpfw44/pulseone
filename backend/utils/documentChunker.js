// backend/utils/documentChunker.js
class DocumentChunker {
  constructor() {
    this.chunkSize = 1000; // Characters per chunk
    this.chunkOverlap = 200; // Overlap between chunks
  }

  // Main chunking method
  chunkDocument(text, documentId, filename) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const chunks = [];
    const cleanText = this.cleanText(text);
    
    // Split into paragraphs first for better semantic boundaries
    const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentStart = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + paragraph.length > this.chunkSize && currentChunk.length > 0) {
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
        currentChunk = overlapText + '\n\n' + paragraph;
        currentStart = currentStart + currentChunk.length - overlapText.length;
        chunkIndex++;
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }

    // Add final chunk if there's content
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        chunkIndex,
        currentStart,
        currentStart + currentChunk.length,
        documentId
      ));
    }

    console.log(`Created ${chunks.length} chunks for document: ${filename}`);
    return chunks;
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