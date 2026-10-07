// Certificate drawing logic. All positions are in template pixels (1060 x 817).
// Template change korle shudhu LAYOUT er number gulo adjust korlei hobe.

export const W = 1060;
export const H = 817;
export const SCALE = 2; // export quality (2x = 2120 x 1634)

export const SERIF = '"Cormorant Garamond","Noto Serif Bengali",Georgia,serif';
export const NAME_FONTS = {
  script: { label: 'Script', css: '"Great Vibes","Noto Serif Bengali",cursive', weight: 400 },
  serif: { label: 'Classic serif', css: SERIF, weight: 600 },
};
const SIGN_FONT = '"Allura","Noto Serif Bengali",cursive';

const COLORS = { navy: '#1b2f7e', gold: '#8f6210', ink: '#3b3322', blue: '#3f63d8' };

export const LAYOUT = {
  cx: 533, // center of the dotted lines
  maxW: 700,
  intro: { y: 402, size: 22 },
  name: { y: 459, size: 56, min: 18 },
  award: { y: 509, size: 26 },
  content: { yOne: 553, yTwo1: 541, yTwo2: 564, size: 21, min: 14, maxW: 730 },
  org: { y: 616, size: 26 },
  date: { cx: 430, y: 668, maxW: 125, size: 22 },
  sign: { cx: 637, y: 668, boxW: 130, boxH: 52, maxW: 135 },
  // Template e "ETIAM SIT AMET..." placeholder text ache. Oi jayga ta upor-niche
  // er clean pixel row theke smooth gradient diye dheke deya hoy.
  cover: { x: 262, w: 546, y0: 593, y1: 624, topRow: 591, botRow: 626 },
};

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Canvas e Bangla/Google font use korar age font load hoyeche kina ensure korar jonno.
export function fontsNeeded(d) {
  const nf = NAME_FONTS[d.nameFont] || NAME_FONTS.script;
  return [
    [`${nf.weight} 40px ${nf.css}`, d.name],
    [`italic 400 20px ${SERIF}`, `${d.content} for outstanding achievement in`],
    [`700 20px ${SERIF}`, d.award],
    [`600 24px ${SERIF}`, `${d.org} ${formatDate(d.date)}`],
    [`400 30px ${SIGN_FONT}`, d.signatureText],
  ];
}

function wrap(ctx, text, maxW) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (!cur || ctx.measureText(t).width <= maxW) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitOneLine(ctx, text, maxW, size, min, fontOf) {
  let s = size;
  ctx.font = fontOf(s);
  while (s > min && ctx.measureText(text).width > maxW) {
    s -= 1;
    ctx.font = fontOf(s);
  }
  return s;
}

export function drawCertificate(ctx, img, d) {
  const L = LAYOUT;
  ctx.save();
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, W, H);

  // placeholder text cover (column-by-column vertical gradient)
  const c = L.cover;
  const top = ctx.getImageData(c.x * SCALE, c.topRow * SCALE, c.w * SCALE, 1).data;
  const bot = ctx.getImageData(c.x * SCALE, c.botRow * SCALE, c.w * SCALE, 1).data;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < c.w * SCALE; i++) {
    const g = ctx.createLinearGradient(0, c.y0 * SCALE, 0, c.y1 * SCALE);
    g.addColorStop(0, `rgb(${top[i * 4]},${top[i * 4 + 1]},${top[i * 4 + 2]})`);
    g.addColorStop(1, `rgb(${bot[i * 4]},${bot[i * 4 + 1]},${bot[i * 4 + 2]})`);
    ctx.fillStyle = g;
    ctx.fillRect(c.x * SCALE + i, c.y0 * SCALE, 1, (c.y1 - c.y0) * SCALE);
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // 1) intro line
  ctx.fillStyle = COLORS.ink;
  ctx.font = `italic 400 ${L.intro.size}px ${SERIF}`;
  ctx.fillText('This certificate is proudly presented to', L.cx, L.intro.y);

  // 2) recipient name
  const name = (d.name || '').trim();
  if (name) {
    const nf = NAME_FONTS[d.nameFont] || NAME_FONTS.script;
    fitOneLine(ctx, name, L.maxW, L.name.size, L.name.min, (s) => `${nf.weight} ${s}px ${nf.css}`);
    ctx.fillStyle = COLORS.navy;
    ctx.fillText(name, L.cx, L.name.y);
  }

  // 3) award line:  "for outstanding achievement in <Award>"
  const award = (d.award || '').trim();
  if (award) {
    const pre = 'for outstanding achievement in ';
    const preFont = (s) => `italic 400 ${Math.round(s * 0.85)}px ${SERIF}`;
    const awFont = (s) => `700 ${s}px ${SERIF}`;
    let s = L.award.size;
    const widthAt = (sz) => {
      ctx.font = preFont(sz);
      const a = ctx.measureText(pre).width;
      ctx.font = awFont(sz);
      return a + ctx.measureText(award).width;
    };
    while (s > 14 && widthAt(s) > L.maxW) s -= 1;
    const total = widthAt(s);
    let x = L.cx - total / 2;
    ctx.textAlign = 'left';
    ctx.font = preFont(s);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(pre, x, L.award.y);
    x += ctx.measureText(pre).width;
    ctx.font = awFont(s);
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(award, x, L.award.y);
    ctx.textAlign = 'center';
  }

  // 4) content paragraph (max 2 lines, auto shrink)
  const content = (d.content || '').trim();
  if (content) {
    const k = L.content;
    let size = k.size;
    let lines;
    for (;;) {
      ctx.font = `italic 400 ${size}px ${SERIF}`;
      lines = wrap(ctx, content, k.maxW);
      if (lines.length <= 2 || size <= k.min) break;
      size -= 1;
    }
    if (lines.length > 2) {
      const words = lines.slice(1).join(' ').split(' ');
      let second = words.join(' ');
      while (words.length && ctx.measureText(`${second}…`).width > k.maxW) {
        words.pop();
        second = words.join(' ');
      }
      lines = [lines[0], `${second}…`];
    }
    ctx.fillStyle = COLORS.ink;
    if (lines.length === 1) ctx.fillText(lines[0], L.cx, k.yOne);
    else {
      ctx.fillText(lines[0], L.cx, k.yTwo1);
      ctx.fillText(lines[1], L.cx, k.yTwo2);
    }
  }

  // 5) organization (placeholder text er jayga e)
  const org = (d.org || '').trim();
  if (org) {
    ctx.fillStyle = COLORS.blue;
    const fontOf = (s) => `600 ${s}px ${SERIF}`;
    const s = fitOneLine(ctx, org.toUpperCase(), L.maxW, L.org.size, 14, fontOf);
    ctx.font = fontOf(s);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText(org.toUpperCase(), L.cx, L.org.y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // 6) date
  const date = formatDate(d.date);
  if (date) {
    ctx.fillStyle = COLORS.navy;
    const fontOf = (s) => `600 ${s}px ${SERIF}`;
    fitOneLine(ctx, date, L.date.maxW, L.date.size, 11, fontOf);
    ctx.fillText(date, L.date.cx, L.date.y);
  }

  // 7) signature: image upload thakle image, na hole typed script
  const sg = L.sign;
  if (d.signatureImg) {
    const im = d.signatureImg;
    const r = Math.min(sg.boxW / im.width, sg.boxH / im.height);
    const w = im.width * r;
    const h = im.height * r;
    ctx.globalCompositeOperation = 'multiply'; // white background gayeb hoye jabe
    ctx.drawImage(im, sg.cx - w / 2, sg.y + 4 - h, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else if ((d.signatureText || '').trim()) {
    const t = d.signatureText.trim();
    ctx.fillStyle = COLORS.navy;
    fitOneLine(ctx, t, sg.maxW, 38, 16, (s) => `400 ${s}px ${SIGN_FONT}`);
    ctx.fillText(t, sg.cx, sg.y);
  }

  ctx.restore();
}
