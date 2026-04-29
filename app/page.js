'use client';

import { useMemo, useState } from 'react';

function parseUrls(text) {
  return String(text || '')
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function detectDelimiter(text) {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim()) || '';
  return [',', ';', '\t']
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function parseCsv(text, delimiter = 'auto') {
  const cleanText = String(text || '').replace(/^\uFEFF/, '');
  const chosenDelimiter = delimiter === 'auto' ? detectDelimiter(cleanText) : delimiter;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const char = cleanText[i];
    const next = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === chosenDelimiter && !inQuotes) {
      row.push(field.trim());
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function extractUrlsFromCsv(text, columnName = 'auto', delimiter = 'auto') {
  const rows = parseCsv(text, delimiter);
  if (!rows.length) return { urls: [], headers: [], rowCount: 0, usedColumn: 'auto' };

  const firstRow = rows[0];
  const hasHeader = firstRow.some((cell) => /url|link|loc|pagina|page/i.test(cell)) || firstRow.every((cell) => !isHttpUrl(cell));
  const headers = hasHeader ? firstRow : firstRow.map((_, index) => `Kolom ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  let columnIndex = -1;
  let usedColumn = 'alle kolommen';

  if (columnName !== 'auto') {
    columnIndex = headers.findIndex((header) => header === columnName);
    usedColumn = columnName;
  } else {
    const preferredIndex = headers.findIndex((header) => /^(url|urls|link|links|loc|pagina|page)$/i.test(header.trim()));
    if (preferredIndex >= 0) {
      columnIndex = preferredIndex;
      usedColumn = headers[preferredIndex];
    }
  }

  const values = columnIndex >= 0 ? dataRows.map((row) => row[columnIndex]) : dataRows.flat();
  const urls = [...new Set(values.map((value) => String(value || '').trim()).filter(isHttpUrl))];
  return { urls, headers, rowCount: dataRows.length, usedColumn };
}

function validate({ host, apiKey, urls }) {
  const errors = [];
  const cleanHost = host.trim();

  if (!cleanHost) errors.push('Vul een host in.');
  if (!apiKey.trim()) errors.push('Vul je IndexNow API key in.');
  if (!urls.length) errors.push('Voeg minimaal één URL toe.');

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) errors.push(`${url} is geen HTTP(S)-URL.`);
      if (cleanHost && parsed.host !== cleanHost) errors.push(`${url} hoort niet bij host ${cleanHost}.`);
    } catch {
      errors.push(`${url} is geen geldige URL.`);
    }
  }

  return [...new Set(errors)];
}

export default function Page() {
  const [host, setHost] = useState('www.example.com');
  const [apiKey, setApiKey] = useState('');
  const [keyLocation, setKeyLocation] = useState('https://www.example.com/indexnow.txt');
  const [urlsText, setUrlsText] = useState('https://www.example.com/pagina-1\nhttps://www.example.com/blog/artikel');
  const [endpoint, setEndpoint] = useState('/api/indexnow');
  const [csvColumn, setCsvColumn] = useState('auto');
  const [csvDelimiter, setCsvDelimiter] = useState('auto');
  const [csvMode, setCsvMode] = useState('replace');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [lastCsvText, setLastCsvText] = useState('');
  const [message, setMessage] = useState(null);
  const [csvMessage, setCsvMessage] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const urls = useMemo(() => parseUrls(urlsText), [urlsText]);
  const errors = useMemo(() => validate({ host, apiKey, urls }), [host, apiKey, urls]);
  const payload = useMemo(() => ({
    host: host.trim(),
    key: apiKey.trim(),
    ...(keyLocation.trim() ? { keyLocation: keyLocation.trim() } : {}),
    urlList: urls,
  }), [host, apiKey, keyLocation, urls]);

  function importCsv(text) {
    const result = extractUrlsFromCsv(text, csvColumn, csvDelimiter);
    setCsvHeaders(result.headers);

    if (!result.urls.length) {
      setCsvMessage({ type: 'error', text: 'Geen geldige HTTP(S)-URLs gevonden in dit CSV-bestand.' });
      return;
    }

    setUrlsText((current) => {
      if (csvMode === 'append') return [...new Set([...parseUrls(current), ...result.urls])].join('\n');
      return result.urls.join('\n');
    });

    try {
      const detectedHost = new URL(result.urls[0]).host;
      if (!host.trim() || host.includes('example.com')) setHost(detectedHost);
      if (!keyLocation.trim() || keyLocation.includes('example.com')) setKeyLocation(`https://${detectedHost}/indexnow.txt`);
    } catch {}

    setCsvMessage({ type: 'success', text: `${result.urls.length} URL(s) geïmporteerd uit ${result.rowCount} rij(en). Kolom: ${result.usedColumn}.` });
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setLastCsvText(text);
    importCsv(text);
    event.target.value = '';
  }

  async function submitUrls() {
    setMessage(null);
    if (errors.length) {
      setMessage({ type: 'error', text: errors.join(' ') });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const text = await response.text().catch(() => '');
      const statusText = {
        200: 'Ok — URL(s) succesvol aangeboden.',
        400: 'Bad request — ongeldig formaat.',
        403: 'Forbidden — je IP is niet toegestaan of de key is ongeldig.',
        405: 'Method Not Allowed — endpoint accepteert geen POST.',
        422: 'Unprocessable Entity — URLs horen niet bij host of protocol klopt niet.',
        429: 'Too Many Requests — te veel verzoeken.',
      };
      setMessage({
        type: response.ok ? 'success' : 'error',
        text: `${response.status}: ${statusText[response.status] || 'Onbekende response'}${text ? ` — ${text.slice(0, 300)}` : ''}`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Request mislukt.' });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Beveiligde IndexNow tool</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Stuur snel URLs naar IndexNow</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Deze Vercel-app is met IP-allowlist beveiligd. Standaard is alleen 92.65.51.76 toegestaan.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            <label className="block">
              <span className="mb-2 block font-semibold">Host</span>
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={host} onChange={(e) => setHost(e.target.value)} />
            </label>

            <label className="block">
              <span className="mb-2 block font-semibold">IndexNow key</span>
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Bijvoorbeeld: 8f2c..." />
            </label>

            <label className="block">
              <span className="mb-2 block font-semibold">Key location</span>
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={keyLocation} onChange={(e) => setKeyLocation(e.target.value)} />
            </label>

            <label className="block">
              <span className="mb-2 block font-semibold">Endpoint</span>
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
              <p className="mt-2 text-sm text-slate-500">Laat standaard op /api/indexnow staan.</p>
            </label>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="mb-3 font-semibold">CSV upload</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2" value={csvColumn} onChange={(e) => setCsvColumn(e.target.value)}>
                  <option value="auto">Kolom automatisch</option>
                  {csvHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2" value={csvDelimiter} onChange={(e) => setCsvDelimiter(e.target.value)}>
                  <option value="auto">Delimiter automatisch</option>
                  <option value=",">Komma</option>
                  <option value=";">Puntkomma</option>
                  <option value="\t">Tab</option>
                </select>
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2" value={csvMode} onChange={(e) => setCsvMode(e.target.value)}>
                  <option value="replace">Vervang URLs</option>
                  <option value="append">Voeg toe</option>
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50">
                  Kies CSV-bestand
                  <input className="hidden" type="file" accept=".csv,text/csv,text/plain" onChange={handleCsvUpload} />
                </label>
                <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50" onClick={() => lastCsvText ? importCsv(lastCsvText) : setCsvMessage({ type: 'error', text: 'Upload eerst een CSV-bestand.' })}>Herimporteer</button>
              </div>
              {csvMessage && <p className={`mt-3 rounded-2xl p-3 text-sm ${csvMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>{csvMessage.text}</p>}
            </section>

            <label className="block">
              <span className="mb-2 block font-semibold">URLs ({urls.length})</span>
              <textarea className="min-h-56 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" value={urlsText} onChange={(e) => setUrlsText(e.target.value)} />
            </label>

            {errors.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{errors.map((error) => <p key={error}>{error}</p>)}</div>}

            <button className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60" disabled={isSending} onClick={submitUrls}>
              {isSending ? 'Versturen...' : 'Verstuur naar IndexNow'}
            </button>

            {message && <div className={`rounded-2xl p-4 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>{message.text}</div>}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold">JSON payload</h2>
              <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(payload, null, 2)}</pre>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold">IP beveiliging</h2>
              <p className="text-sm text-slate-600">Standaard toegestaan: <code>92.65.51.76</code>. Pas dit aan via Vercel Environment Variable <code>ALLOWED_IPS</code>, bijvoorbeeld <code>92.65.51.76,1.2.3.4</code>.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
