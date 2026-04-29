'use client';

import React, { useMemo, useState } from 'react';

function Icon({ name, className = 'h-4 w-4' }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  const icons = {
    send: (
      <svg {...common}>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22 11 13 2 9 22 2Z" />
      </svg>
    ),
    upload: (
      <svg {...common}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8 12 3 7 8" />
        <path d="M12 3v12" />
      </svg>
    ),
    key: (
      <svg {...common}>
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="M12 11 22 1" />
        <path d="M17 6 19 8" />
        <path d="M14 9 16 11" />
      </svg>
    ),
    globe: (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 0 20" />
        <path d="M12 2a15.3 15.3 0 0 0 0 20" />
      </svg>
    ),
    list: (
      <svg {...common}>
        <path d="m3 17 2 2 4-4" />
        <path d="m3 7 2 2 4-4" />
        <path d="M13 6h8" />
        <path d="M13 12h8" />
        <path d="M13 18h8" />
      </svg>
    ),
    alert: (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
    check: (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    copy: (
      <svg {...common}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    ),
  };

  return icons[name] || null;
}

function parseUrls(urlsText) {
  return urlsText
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function isLikelyUrl(value) {
  const clean = String(value || '').trim();
  if (!clean) return false;
  try {
    const parsed = new URL(clean);
    return /^https?:$/.test(parsed.protocol);
  } catch {
    return false;
  }
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

function detectDelimiter(text) {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim()) || '';
  const candidates = [',', ';', '\t'];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function extractUrlsFromCsv(text, columnName = 'auto', delimiter = 'auto') {
  const rows = parseCsv(text, delimiter);
  if (!rows.length) {
    return { urls: [], headers: [], rowCount: 0, usedColumn: 'auto' };
  }

  const firstRow = rows[0];
  const hasHeader = firstRow.some((cell) => /url|link|loc|pagina|page/i.test(cell)) ||
    firstRow.every((cell) => !isLikelyUrl(cell));
  const headers = hasHeader ? firstRow : firstRow.map((_, index) => `Kolom ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;

  let columnIndex = -1;
  let usedColumn = 'auto';

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

  const values = columnIndex >= 0
    ? dataRows.map((row) => row[columnIndex])
    : dataRows.flat();

  const urls = [...new Set(values.map((value) => String(value || '').trim()).filter(isLikelyUrl))];
  return { urls, headers, rowCount: dataRows.length, usedColumn };
}

function getValidationErrors({ host, apiKey, urls }) {
  const cleanHost = host.trim();
  const errors = [];

  if (!cleanHost) errors.push('Vul een host in, bijvoorbeeld www.example.com.');
  if (!apiKey.trim()) errors.push('Vul je IndexNow API key in.');
  if (!urls.length) errors.push('Voeg minimaal één URL toe.');

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) errors.push(`${url} is geen HTTP(S)-URL.`);
      if (cleanHost && parsed.host !== cleanHost) errors.push(`${url} hoort niet bij host ${cleanHost}.`);
    } catch {
      errors.push(`${url} is geen geldige URL.`);
    }
  }

  return [...new Set(errors)];
}

function runSelfTests() {
  return [
    {
      name: 'Parseert URLs per regel en komma',
      pass: JSON.stringify(parseUrls('https://a.nl/1\nhttps://a.nl/2, https://a.nl/3')) ===
        JSON.stringify(['https://a.nl/1', 'https://a.nl/2', 'https://a.nl/3']),
    },
    {
      name: 'Parseert CSV met url-header',
      pass: JSON.stringify(extractUrlsFromCsv('url,title\nhttps://a.nl/1,Eerste\nhttps://a.nl/2,Tweede').urls) ===
        JSON.stringify(['https://a.nl/1', 'https://a.nl/2']),
    },
    {
      name: 'Parseert CSV met puntkomma als delimiter',
      pass: JSON.stringify(extractUrlsFromCsv('url;titel\nhttps://a.nl/1;Eerste', 'auto', 'auto').urls) ===
        JSON.stringify(['https://a.nl/1']),
    },
    {
      name: 'Parseert CSV met quotes en komma in veld',
      pass: JSON.stringify(extractUrlsFromCsv('url,title\n"https://a.nl/1","Titel, met komma"').urls) ===
        JSON.stringify(['https://a.nl/1']),
    },
    {
      name: 'Geldige payload geeft geen validatiefouten',
      pass: getValidationErrors({
        host: 'www.example.com',
        apiKey: 'abc123',
        urls: ['https://www.example.com/pagina'],
      }).length === 0,
    },
    {
      name: 'URL buiten host wordt afgekeurd',
      pass: getValidationErrors({
        host: 'www.example.com',
        apiKey: 'abc123',
        urls: ['https://anders.nl/pagina'],
      }).some((error) => error.includes('hoort niet bij host')),
    },
    {
      name: 'Ongeldige URL wordt afgekeurd',
      pass: getValidationErrors({
        host: 'www.example.com',
        apiKey: 'abc123',
        urls: ['geen-url'],
      }).some((error) => error.includes('geen geldige URL')),
    },
    {
      name: 'Ontbrekende key wordt afgekeurd',
      pass: getValidationErrors({
        host: 'www.example.com',
        apiKey: '',
        urls: ['https://www.example.com/pagina'],
      }).some((error) => error.includes('IndexNow API key')),
    },
  ];
}

export default function IndexNowSubmitterApp() {
  const [host, setHost] = useState('www.example.com');
  const [apiKey, setApiKey] = useState('');
  const [keyLocation, setKeyLocation] = useState('https://www.example.com/indexnow.txt');
  const [urlsText, setUrlsText] = useState('https://www.example.com/pagina-1\nhttps://www.example.com/blog/artikel');
  const [endpoint, setEndpoint] = useState('/api/indexnow');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [csvInfo, setCsvInfo] = useState(null);
  const [csvColumn, setCsvColumn] = useState('auto');
  const [csvDelimiter, setCsvDelimiter] = useState('auto');
  const [csvMode, setCsvMode] = useState('replace');
  const [lastCsvText, setLastCsvText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);

  const urls = useMemo(() => parseUrls(urlsText), [urlsText]);

  const detectedHost = useMemo(() => {
    try {
      if (!urls.length) return '';
      return new URL(urls[0]).host;
    } catch {
      return '';
    }
  }, [urls]);

  const payload = useMemo(() => ({
    host: host.trim(),
    key: apiKey.trim(),
    ...(keyLocation.trim() ? { keyLocation: keyLocation.trim() } : {}),
    urlList: urls,
  }), [host, apiKey, keyLocation, urls]);

  const validationErrors = useMemo(() => getValidationErrors({ host, apiKey, urls }), [host, apiKey, urls]);

  const statusText = {
    200: 'Ok — URL(s) succesvol aangeboden.',
    400: 'Bad request — ongeldig formaat.',
    403: 'Forbidden — key niet geldig of key-bestand niet gevonden.',
    405: 'Method Not Allowed — /api/indexnow accepteert geen POST. Controleer je Vercel API-route.',
    422: 'Unprocessable Entity — URLs horen niet bij de host of key/protocol klopt niet.',
    429: 'Too Many Requests — te veel verzoeken, mogelijk spamdetectie.',
  };

  function importCsvText(text, selectedColumn = csvColumn, selectedDelimiter = csvDelimiter) {
    const extraction = extractUrlsFromCsv(text, selectedColumn, selectedDelimiter);
    setCsvHeaders(extraction.headers);
    setCsvInfo({
      type: extraction.urls.length ? 'success' : 'error',
      message: extraction.urls.length
        ? `${extraction.urls.length} URL(s) gevonden in ${extraction.rowCount} rij(en). Kolom: ${extraction.usedColumn}.`
        : 'Geen geldige HTTP(S)-URLs gevonden in dit CSV-bestand.',
    });

    if (!extraction.urls.length) return;

    setUrlsText((current) => {
      if (csvMode === 'append') {
        const merged = [...new Set([...parseUrls(current), ...extraction.urls])];
        return merged.join('\n');
      }
      return extraction.urls.join('\n');
    });

    if (extraction.urls[0]) {
      try {
        const detected = new URL(extraction.urls[0]).host;
        if (!host.trim() || host.includes('example.com')) {
          setHost(detected);
          if (!keyLocation.trim() || keyLocation.includes('example.com')) {
            setKeyLocation(`https://${detected}/indexnow.txt`);
          }
        }
      } catch {
        // Validatie toont fouten apart.
      }
    }
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setLastCsvText(text);
      importCsvText(text);
    } catch (error) {
      setCsvInfo({
        type: 'error',
        message: `CSV kon niet worden gelezen: ${error?.message || 'onbekende fout'}`,
      });
    } finally {
      event.target.value = '';
    }
  }

  function reimportCsv() {
    if (!lastCsvText) {
      setCsvInfo({ type: 'error', message: 'Upload eerst een CSV-bestand.' });
      return;
    }
    importCsvText(lastCsvText);
  }

  async function submitUrls() {
    setResult(null);
    if (validationErrors.length) {
      setResult({ type: 'error', message: validationErrors.join(' ') });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text().catch(() => '');

      setResult({
        type: response.ok ? 'success' : 'error',
        status: response.status,
        message: statusText[response.status] || `Onbekende response: HTTP ${response.status}`,
        detail: responseText ? responseText.slice(0, 500) : undefined,
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Verzoek naar /api/indexnow is mislukt. Controleer of de Vercel deployment klaar is en de API-route bestaat.',
        detail: error?.message || 'Geen foutdetails beschikbaar.',
      });
    } finally {
      setIsSending(false);
    }
  }

  async function copyPayload() {
    const text = JSON.stringify(payload, null, 2);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setResult({ type: 'success', message: 'Payload gekopieerd naar je klembord.' });
      } else {
        throw new Error('Clipboard API niet beschikbaar.');
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Automatisch kopiëren lukte niet. Selecteer de JSON-payload en kopieer handmatig.',
        detail: error?.message,
      });
    }
  }

  function useDetectedHost() {
    if (detectedHost) {
      setHost(detectedHost);
      if (!keyLocation.trim() || keyLocation.includes('example.com')) {
        setKeyLocation(`https://${detectedHost}/indexnow.txt`);
      }
    }
  }

  const passedTests = testResults.filter((test) => test.pass).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">IndexNow tool</p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Stuur snel URLs naar IndexNow</h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                Vercel-klare app: upload een CSV-bestand of plak URLs en verstuur ze via de ingebouwde proxy.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-5 py-4 text-sm text-slate-700">
              <div className="font-semibold">URLs klaar</div>
              <div className="text-3xl font-bold">{urls.length}</div>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-semibold"><Icon name="globe" /> Host</span>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="www.example.com"
                />
                <button
                  type="button"
                  onClick={useDetectedHost}
                  disabled={!detectedHost}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Detecteer
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-semibold"><Icon name="key" /> IndexNow key</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Bijvoorbeeld: 8f2c..."
              />
              <p className="mt-2 text-sm text-slate-500">Zorg dat deze key ook als UTF-8 .txt-bestand op je website staat.</p>
            </label>

            <label className="block">
              <span className="mb-2 font-semibold">Key location</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                value={keyLocation}
                onChange={(e) => setKeyLocation(e.target.value)}
                placeholder="https://www.example.com/indexnow.txt"
              />
            </label>

            <label className="block">
              <span className="mb-2 font-semibold">Endpoint</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/indexnow"
              />
              <p className="mt-2 text-sm text-slate-500">Laat dit op <code>/api/indexnow</code> staan voor Vercel.</p>
            </label>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold"><Icon name="upload" /> CSV upload</div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Kolom</span>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400" value={csvColumn} onChange={(e) => setCsvColumn(e.target.value)}>
                    <option value="auto">Automatisch</option>
                    {csvHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Scheidingsteken</span>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400" value={csvDelimiter} onChange={(e) => setCsvDelimiter(e.target.value)}>
                    <option value="auto">Automatisch</option>
                    <option value=",">Komma</option>
                    <option value=";">Puntkomma</option>
                    <option value="\t">Tab</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Importmodus</span>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400" value={csvMode} onChange={(e) => setCsvMode(e.target.value)}>
                    <option value="replace">Vervang huidige URLs</option>
                    <option value="append">Voeg toe aan huidige URLs</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50">
                  <Icon name="upload" /> Kies CSV-bestand
                  <input type="file" accept=".csv,text/csv,text/plain" onChange={handleCsvUpload} className="hidden" />
                </label>
                <button type="button" onClick={reimportCsv} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50">
                  Herimporteer met instellingen
                </button>
              </div>

              <p className="mt-2 text-sm text-slate-500">Ondersteunt komma, puntkomma en tab. Bij “Automatisch” zoekt de app naar kolommen zoals url, link, loc, pagina of page.</p>

              {csvInfo && (
                <div className={`mt-3 rounded-2xl p-3 text-sm ${csvInfo.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                  {csvInfo.message}
                </div>
              )}
            </section>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-semibold"><Icon name="list" /> URLs</span>
              <textarea
                className="min-h-56 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-slate-400"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder="Eén URL per regel"
              />
              <p className="mt-2 text-sm text-slate-500">Eén URL per regel, of gescheiden met komma’s.</p>
            </label>

            {validationErrors.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="mb-1 flex items-center gap-2 font-semibold"><Icon name="alert" /> Controleer dit eerst</div>
                <ul className="list-disc pl-5">
                  {validationErrors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={submitUrls} disabled={isSending} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                <Icon name="send" /> {isSending ? 'Versturen...' : 'Verstuur naar IndexNow'}
              </button>
              <button type="button" onClick={copyPayload} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold hover:bg-slate-50">
                <Icon name="copy" /> Kopieer payload
              </button>
            </div>

            {result && (
              <div className={`rounded-2xl p-4 text-sm ${result.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                <div className="flex items-center gap-2 font-semibold">
                  {result.type === 'success' ? <Icon name="check" /> : <Icon name="alert" />}
                  {result.status ? `HTTP ${result.status}` : 'Resultaat'}
                </div>
                <p className="mt-1">{result.message}</p>
                {result.detail && <p className="mt-1 whitespace-pre-wrap opacity-80">{result.detail}</p>}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold">JSON payload</h2>
              <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(payload, null, 2)}</pre>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Ingebouwde tests</h2>
                <button type="button" onClick={() => setTestResults(runSelfTests())} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Run tests</button>
              </div>
              {testResults.length === 0 ? (
                <p className="text-sm text-slate-600">Nog niet uitgevoerd.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">{passedTests}/{testResults.length} tests geslaagd</p>
                  <ul className="space-y-1">
                    {testResults.map((test) => (
                      <li key={test.name} className={test.pass ? 'text-emerald-700' : 'text-red-700'}>{test.pass ? '✓' : '✗'} {test.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold">Vercel deployment</h2>
              <ol className="space-y-2 text-sm text-slate-700">
                <li>1. Upload deze map naar GitHub.</li>
                <li>2. Importeer de repository in Vercel.</li>
                <li>3. Framework preset: Next.js.</li>
                <li>4. Build command: <code>next build</code>.</li>
                <li>5. Deploy en test <code>/api/indexnow</code>.</li>
              </ol>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold">CSV voorbeeld</h2>
              <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{`url,title
https://www.example.com/pagina-1,Pagina 1
https://www.example.com/blog/artikel,Blog artikel`}</pre>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold">Checklist</h2>
              <ol className="space-y-2 text-sm text-slate-700">
                <li>1. Genereer een IndexNow key.</li>
                <li>2. Plaats de key als `.txt`-bestand op je domein.</li>
                <li>3. Upload een CSV of voeg URLs handmatig toe.</li>
                <li>4. Voeg alleen URLs toe die nieuw, aangepast of verwijderd zijn.</li>
                <li>5. Controleer ontvangst in Bing Webmaster Tools.</li>
              </ol>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
