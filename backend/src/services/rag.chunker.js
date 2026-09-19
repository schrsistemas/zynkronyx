const crypto = require('node:crypto');

function hash(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function normalize(content) { return String(content || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
function estimateTokens(content) { return Math.max(1, Math.ceil(String(content).split(/\s+/).filter(Boolean).length * 1.3)); }

function chunkText(content, options = {}) {
  const normalized = normalize(content);
  if (!normalized) return [];
  const maxChars = Math.max(500, Math.min(Number(options.maxChars || 2400), 12000));
  const overlap = Math.max(0, Math.min(Number(options.overlap || 240), Math.floor(maxChars / 3)));
  const parts = normalized.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  const push = (value) => { const text = value.trim(); if (text) chunks.push({ index: chunks.length, content: text, hash: hash(text), tokenCount: estimateTokens(text) }); };

  for (const part of parts) {
    if (!current) { current = part; continue; }
    if ((current + '\n\n' + part).length <= maxChars) current += '\n\n' + part;
    else { push(current); current = part; }
  }
  push(current);

  return chunks.map((chunk, i) => {
    if (i === 0 || overlap === 0) return chunk;
    const suffix = chunks[i - 1].content.slice(Math.max(0, chunks[i - 1].content.length - overlap)).trim();
    const contentWithOverlap = suffix ? suffix + '\n\n' + chunk.content : chunk.content;
    return { ...chunk, index: i, content: contentWithOverlap, hash: hash(contentWithOverlap), tokenCount: estimateTokens(contentWithOverlap) };
  });
}

module.exports = { normalize, chunkText, hash, estimateTokens };
