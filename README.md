# Certificate Generator (React + Vite)

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> dist/
```

## Features
- Name, award, content, date, organization input -> certificate e live preview
- Signature: type kora (script font) ba image upload (white background auto mishe jay)
- Document image upload -> OCR (Tesseract.js, English/Bangla) -> auto-fill + line theke field assign
- Download PNG (2120x1634) ba PDF (landscape)

## Template / position change
- Template image: `public/template.png` (1060x817)
- Shob position `src/certificate.js` er `LAYOUT` object e. Number change korle text sorbe.
- Template er size alada hole `W`, `H` update korun.

## Note
OCR browser e cholay, 100% accurate noy. Tai auto-fill er por field gulo check kore nite hobe.
Prothombar OCR e language data download hoy (internet lagbe).
