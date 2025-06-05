const documentChunker = require('../documentChunker');

describe('documentChunker.chunkDocument', () => {
  test('returns a single chunk for short text', () => {
    const text = 'This is a short document for testing.';
    const chunks = documentChunker.chunkDocument(text, 1, 'short.txt');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(documentChunker.cleanText(text));
  });

  test('creates multiple chunks with overlap for longer text', () => {
    const paragraph = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
    const longText = paragraph.repeat(10) + '\n\n' + paragraph.repeat(10);
    const chunks = documentChunker.chunkDocument(longText, 2, 'long.txt');

    expect(chunks.length).toBeGreaterThan(1);

    const expectedOverlap = documentChunker.getOverlapText(
      chunks[0].content,
      documentChunker.chunkOverlap
    ).trim();

    expect(chunks[1].content.startsWith(expectedOverlap)).toBe(true);
  });
});
