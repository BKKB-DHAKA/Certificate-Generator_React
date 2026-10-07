// Document image theke text ber korar jonno (browser e, free: Tesseract.js).
import { createWorker } from 'tesseract.js';

export async function readDocument(file, lang, onProgress) {
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

export function toLines(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
}

const SKIP = /(father|mother|husband|guardian|পিতা|মাতা|স্বামী|অভিভাবক)/i;

// Common pattern: "Name: ..." / "নাম: ..." theke name, "Course: ..." theke award.
export function guessFields(lines) {
  const out = {};
  for (const line of lines) {
    if (!out.name && !SKIP.test(line)) {
      const m = line.match(
        /^(?:student(?:'s)?\s*|candidate(?:'s)?\s*)?(?:name|নাম)\s*[:：\-–.]*\s*(.{2,})$/i
      );
      if (m) out.name = clean(m[1]);
    }
    if (!out.award) {
      const m = line.match(/^(?:course|program(?:me)?|subject|কোর্স)\s*[:：\-–]\s*(.{2,})$/i);
      if (m) out.award = clean(m[1]);
    }
  }
  return out;
}

function clean(s) {
  return s.replace(/^[\s:：\-–._|]+|[\s|_]+$/g, '').trim();
}
