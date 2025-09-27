import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import * as mammoth from 'mammoth';

// Configure worker for bundlers; Vite will serve the file correctly
GlobalWorkerOptions.workerSrc = pdfWorker;

export async function parseResume(file) {
  const ext = (file.name || '').toLowerCase().split('.').pop();
  let text = '';
  if (ext === 'pdf') {
    text = await parsePdf(file);
  } else if (ext === 'docx') {
    text = await parseDocx(file);
  } else {
    throw new Error('Unsupported file type. Please upload PDF or DOCX.');
  }
  const fields = extractFields(text);
  return { text, fields };
}

async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    text += strings.join(' ') + '\n';
  }
  return text;
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').replace(/\u0000/g, '');
}

function extractFields(text) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  const emailMatch = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = cleaned.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?|\d{3}[\s-]?)\d{3}[\s-]?\d{4}/);
  const lines = (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const blacklist = [
    'resume', 'curriculum', 'summary', 'experience', 'education', 'skills', 'projects', 'contact',
    'technical', 'languages', 'databases', 'frameworks', 'concepts', 'tools', 'platforms',
    'certifications', 'score', 'sslc', 'cbse', 'board', 'percentage', 'gpa', 'work', 'objective',
  ];
  let name = '';

  // 1) Explicit label
  const explicit = lines.find((l) => /^\s*name\s*[:\-]\s+/i.test(l));
  if (explicit) {
    name = explicit.replace(/^\s*name\s*[:\-]\s+/i, '').trim();
  }

  // 2) Top-of-doc heuristic: first 40 lines, prefer short, clean name-like lines
  if (!name) {
    for (let i = 0; i < Math.min(lines.length, 40); i++) {
      const line = lines[i];
      const lc = line.toLowerCase();
      if (blacklist.some((b) => lc.includes(b))) continue;
      // Exclude lines with digits or heavy punctuation often found in headers
      if (/[0-9%()\/,]/.test(line)) continue;
      const tokens = line.split(/\s+/).filter((w) => /^(?=.{2,})[A-Za-z][A-Za-z'\.\-]+$/.test(w));
      if (tokens.length >= 2 && tokens.length <= 4) {
        const capCount = tokens.filter((w) => /^[A-Z][a-zA-Z'\.\-]+$/.test(w)).length;
        const allCapsCount = tokens.filter((w) => /^[A-Z]{2,}$/.test(w)).length;
        if (capCount + allCapsCount >= Math.min(2, tokens.length)) {
          name = tokens.join(' ');
          break;
        }
      }
    }
  }

  // 3) Use line before/after the email line if present, with stricter filters
  if (!name && emailMatch) {
    const emailLineIdx = lines.findIndex((l) => l.includes(emailMatch[0]));
    const around = [lines[emailLineIdx - 1], lines[emailLineIdx + 1]].filter(Boolean);
    for (const candidateLine of around) {
      if (/[0-9%()\/,]/.test(candidateLine)) continue;
      const words = candidateLine.split(/\s+/).filter((w) => /^(?=.{2,})[A-Za-z][A-Za-z'\.\-]+$/.test(w));
      if (words.length >= 2 && words.length <= 4) {
        name = words.join(' ');
        break;
      }
    }
  }

  // 4) Fallback: derive from email local-part (e.g., john.doe -> John Doe)
  if (!name && emailMatch) {
    const local = emailMatch[0].split('@')[0];
    const cleanedLocal = local.replace(/\d+/g, '');
    const parts = cleanedLocal.split(/[._-]+/).filter(Boolean).slice(0, 3);
    if (parts.length >= 1) {
      name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
  }

  return {
    name: name || null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
  };
}