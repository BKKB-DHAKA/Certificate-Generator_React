import { useEffect, useRef, useState } from 'react';
import { drawCertificate, fontsNeeded, NAME_FONTS, W, H, SCALE } from './certificate.js';
import { guessFields, readDocument, toLines } from './ocr.js';

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const INITIAL = {
  name: 'Ayesha Rahman',
  award: 'Web Development',
  content:
    'In recognition of outstanding dedication, skill and successful completion of the full-stack web development program.',
  date: today(),
  org: '',
  signatureText: 'Md. Karim',
  nameFont: 'script',
};

const TARGETS = [
  ['name', 'Name'],
  ['award', 'Award'],
  ['content', 'Content'],
  ['org', 'Organization'],
  ['signatureText', 'Signature'],
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

export default function App() {
  const canvasRef = useRef(null);
  const [form, setForm] = useState(INITIAL);
  const [tpl, setTpl] = useState(null);
  const [sigImg, setSigImg] = useState(null);

  // OCR state
  const [docUrl, setDocUrl] = useState('');
  const [lang, setLang] = useState('eng');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState([]);
  const [filled, setFilled] = useState([]);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    loadImage(`${import.meta.env.BASE_URL}template.png`).then(setTpl);
  }, []);

  // Redraw: font load howar por canvas e draw kore
  useEffect(() => {
    if (!tpl) return;
    let cancelled = false;
    const data = { ...form, signatureImg: sigImg };
    (async () => {
      try {
        await Promise.all(fontsNeeded(form).map(([f, t]) => document.fonts.load(f, t || 'a')));
      } catch {
        /* font load fail korleo fallback font diye draw hobe */
      }
      if (cancelled) return;
      const ctx = canvasRef.current.getContext('2d');
      drawCertificate(ctx, tpl, data);
    })();
    return () => {
      cancelled = true;
    };
  }, [form, tpl, sigImg]);

  const fileBase = () => `certificate-${(form.name || 'untitled').trim().replace(/\s+/g, '-')}`;

  const downloadPng = () => {
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${fileBase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H] });
    pdf.addImage(canvasRef.current.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, W, H);
    pdf.save(`${fileBase()}.pdf`);
  };

  const onSignatureFile = async (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSigImg(await loadImage(url));
  };

  const onDocument = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Image file (JPG/PNG/WebP) upload korun.');
      return;
    }
    setError('');
    setBusy(true);
    setProgress(0);
    setLines([]);
    setFilled([]);
    setDocUrl(URL.createObjectURL(file));
    try {
      const text = await readDocument(file, lang, setProgress);
      const ls = toLines(text);
      setLines(ls);
      const guess = guessFields(ls);
      if (Object.keys(guess).length) {
        setForm((f) => ({ ...f, ...guess }));
        setFilled(Object.keys(guess));
      }
      if (!ls.length) setError('Kono text pawa jayni. Aro clear / high-res image diye try korun.');
    } catch (err) {
      setError(`OCR fail korse: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const assign = (line, target) => {
    if (!target) return;
    setForm((f) => ({ ...f, [target]: line }));
    setFilled((a) => (a.includes(target) ? a : [...a, target]));
  };

  const labelOf = (k) => TARGETS.find(([key]) => key === k)?.[1] || k;

  return (
    <div className="app">
      <header className="top">
        <h1>Certificate Generator</h1>
        <p>Details type korun ba document er chobi upload korun. Certificate ta sathe sathe update hobe.</p>
      </header>

      <main className="layout">
        <section className="panel">
          <fieldset>
            <legend>Certificate details</legend>

            <label>
              Recipient name
              <input value={form.name} onChange={set('name')} placeholder="Full name" />
            </label>

            <div className="seg" role="group" aria-label="Name style">
              {Object.entries(NAME_FONTS).map(([key, f]) => (
                <button
                  key={key}
                  type="button"
                  className={form.nameFont === key ? 'on' : ''}
                  onClick={() => setForm((s) => ({ ...s, nameFont: key }))}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <label>
              Award for
              <input value={form.award} onChange={set('award')} placeholder="Web Development" />
            </label>

            <label>
              Content
              <textarea rows={3} value={form.content} onChange={set('content')} />
              <small>Max 2 line e boshbe, boro hole font auto choto hobe.</small>
            </label>

            <div className="row">
              <label>
                Date
                <input type="date" value={form.date} onChange={set('date')} />
              </label>
              <label>
                Organization <span className="opt">(optional)</span>
                <input value={form.org} onChange={set('org')} placeholder="Your organization" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Signature</legend>
            <label>
              Type signature
              <input value={form.signatureText} onChange={set('signatureText')} />
            </label>
            <div className="sigrow">
              <label className="filebtn">
                Upload signature image
                <input type="file" accept="image/*" onChange={(e) => onSignatureFile(e.target.files[0])} hidden />
              </label>
              {sigImg && (
                <button type="button" className="link" onClick={() => setSigImg(null)}>
                  Remove image
                </button>
              )}
            </div>
            <small>Image dile typed signature er jaygay image boshbe. White background auto mishe jabe.</small>
          </fieldset>

          <fieldset>
            <legend>Fill from a document</legend>

            <div className="row">
              <label>
                Document language
                <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={busy}>
                  <option value="eng">English</option>
                  <option value="ben">বাংলা</option>
                  <option value="eng+ben">English + বাংলা</option>
                </select>
              </label>
            </div>

            <label
              className={`drop ${drag ? 'over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                onDocument(e.dataTransfer.files[0]);
              }}
            >
              {docUrl ? <img src={docUrl} alt="Uploaded document" /> : <span>Document er image ekhane drop korun ba click kore select korun</span>}
              <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => onDocument(e.target.files[0])} />
            </label>

            {busy && (
              <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
                <div style={{ width: `${Math.round(progress * 100)}%` }} />
                <span>Text porchi… {Math.round(progress * 100)}%</span>
              </div>
            )}
            {error && <p className="error">{error}</p>}

            {filled.length > 0 && !busy && (
              <p className="ok">Auto-filled: {filled.map(labelOf).join(', ')}. Certificate e ekbar check kore nin.</p>
            )}

            {lines.length > 0 && !busy && (
              <div className="lines">
                <p className="hint">Pawa text. Je line ta lagbe tar pashe field select korun.</p>
                <ul>
                  {lines.map((l, i) => (
                    <li key={`${i}-${l}`}>
                      <span>{l}</span>
                      <select value="" onChange={(e) => assign(l, e.target.value)} aria-label={`Use "${l}" as`}>
                        <option value="">Use as…</option>
                        {TARGETS.map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </fieldset>
        </section>

        <section className="stage">
          <div className="sheet-wrap">
            <canvas ref={canvasRef} width={W * SCALE} height={H * SCALE} className="sheet" aria-label="Certificate preview" />
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={downloadPdf} disabled={!tpl}>
              Download PDF
            </button>
            <button type="button" className="ghost" onClick={downloadPng} disabled={!tpl}>
              Download PNG
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
