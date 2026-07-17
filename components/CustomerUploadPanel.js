'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  CUSTOMER_FIELD_ALIASES,
  IMPORT_BATCH_SIZE,
  REQUIRED_CUSTOMER_FIELDS,
} from '@/lib/customer-upload';

export default function CustomerUploadPanel() {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [importResults, setImportResults] = useState([]);

  const handleParse = async () => {
    if (!file) {
      toast.error('Choose an Excel file first');
      return;
    }

    setParsing(true);
    setParseResult(null);
    setImportRows([]);
    setImportProgress(null);
    setImportResults([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/customers/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Parse failed');

      setParseResult(data);
      setImportRows(data.importRows ?? []);

      if (data.missingRequiredColumns?.length) {
        toast.error(`Could not find columns for: ${data.missingRequiredColumns.join(', ')}`);
      } else {
        toast.success(`Ready: ${data.summary.valid} of ${data.summary.total} rows`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!importRows.length) {
      toast.error('Parse a file first');
      return;
    }

    if (!window.confirm(`Create ${importRows.length} customers in MarketTime? This cannot be undone.`)) {
      return;
    }

    setImporting(true);
    setImportResults([]);
    const allResults = [];
    let succeeded = 0;
    let failed = 0;

    try {
      for (let offset = 0; offset < importRows.length; offset += IMPORT_BATCH_SIZE) {
        const batch = importRows.slice(offset, offset + IMPORT_BATCH_SIZE);
        setImportProgress({
          done: offset,
          total: importRows.length,
          current: batch[0]?.companyName,
        });

        const res = await fetch('/api/admin/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: batch }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Import batch failed');

        for (const result of data.results ?? []) {
          allResults.push(result);
          if (result.ok) succeeded += 1;
          else failed += 1;
        }

        setImportResults([...allResults]);
      }

      setImportProgress({ done: importRows.length, total: importRows.length, current: null });
      toast.success(`Import complete: ${succeeded} created, ${failed} failed`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const progressPct = importProgress
    ? Math.round((importProgress.done / importProgress.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-8">
      <h2 className="font-bold text-[#1a1d26] mb-2" style={{ fontFamily: "'Baloo 2', cursive" }}>
        Bulk Customer Upload
      </h2>
      <p className="text-sm text-[#5f6980] mb-4">
        Upload an Excel file (.xlsx or .xls) to create customers in MarketTime (one API call per row).
        Columns can be in any order. Required per row: <strong>name</strong>, <strong>email</strong>, <strong>state</strong>, <strong>country</strong>, <strong>city</strong>, <strong>address</strong>, <strong>zip</strong>, and <strong>phone</strong> (country defaults to US when absent).
      </p>

      <details className="mb-4 text-xs text-[#5f6980]">
        <summary className="cursor-pointer font-semibold text-[#1a1d26] mb-2">Supported export formats</summary>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <span className="font-medium text-[#1a1d26]">US Divers</span> — CSTNAM, NAME, EMAIL, STATE, Country, ADR1, ADR2, ADR4, ZIPCD, PHN, CSTNO
          </li>
          <li>
            <span className="font-medium text-[#1a1d26]">Allen Gerber retailers</span> — Customer Name, ShipTo Name, ShipTo Address, Email, City, ST, Zip, Phone
          </li>
        </ul>
      </details>

      <details className="mb-4 text-xs text-[#5f6980]">
        <summary className="cursor-pointer font-semibold text-[#1a1d26] mb-2">Recognized column headers</summary>
        <p className="mt-2 mb-2">Required (one column each): name, email, state, country</p>
        <ul className="list-disc pl-5 space-y-1">
          {REQUIRED_CUSTOMER_FIELDS.map((field) => (
            <li key={field}>
              <span className="font-medium text-[#1a1d26]">{CUSTOMER_FIELD_ALIASES[field][0]}</span>
              {' — also: '}
              {CUSTOMER_FIELD_ALIASES[field].slice(1).join(', ')}
            </li>
          ))}
        </ul>
        <p className="mt-3 mb-2">Optional:</p>
        <ul className="list-disc pl-5 space-y-0.5">
          {Object.entries(CUSTOMER_FIELD_ALIASES)
            .filter(([field]) => !REQUIRED_CUSTOMER_FIELDS.includes(field))
            .map(([field, aliases]) => (
              <li key={field}>{aliases.join(', ')}</li>
            ))}
        </ul>
      </details>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setParseResult(null);
            setImportRows([]);
            setImportResults([]);
          }}
          className="text-sm text-[#5f6980] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f7f8fa] file:text-[#1a1d26]"
        />
        <button
          onClick={handleParse}
          disabled={!file || parsing || importing}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #00aeef, #33c1ff)' }}
        >
          {parsing ? 'Parsing…' : 'Parse & preview (dry run)'}
        </button>
        <button
          onClick={handleImport}
          disabled={!importRows.length || parsing || importing}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
        >
          {importing ? `Importing… ${progressPct}%` : `Import ${importRows.length || ''} customers`}
        </button>
      </div>

      {parseResult && (
        <div className="text-sm px-4 py-3 rounded-lg bg-[#f7f8fa] text-[#1a1d26] mb-4 space-y-2">
          <p>
            <strong>{parseResult.filename}</strong> — sheet &quot;{parseResult.sheetName}&quot;:
            {' '}{parseResult.summary.valid} valid, {parseResult.summary.invalid} skipped
          </p>
          {parseResult.missingRequiredColumns?.length > 0 && (
            <p className="text-red-700">
              Could not match required columns: {parseResult.missingRequiredColumns.join(', ')}
            </p>
          )}
          {parseResult.columnMapping?.length > 0 && (
            <p className="text-xs text-[#5f6980]">
              Matched: {parseResult.columnMapping.map((m) => `${m.label} → "${m.column}"`).join('; ')}
            </p>
          )}
          {parseResult.validationIssues?.length > 0 && (
            <div>
              <p className="font-semibold text-amber-800">Validation issues (sample):</p>
              <ul className="text-xs text-amber-900 mt-1 space-y-1">
                {parseResult.validationIssues.map((issue) => (
                  <li key={issue.index}>
                    Row {issue.index + 1} ({issue.companyName}): {issue.errors.join('; ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parseResult.samplePayloads?.length > 0 && (
            <details>
              <summary className="cursor-pointer font-semibold">Sample MarketTime payloads</summary>
              <pre className="mt-2 text-xs overflow-x-auto bg-white p-3 rounded-lg border border-black/[0.06]">
                {JSON.stringify(parseResult.samplePayloads, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {importing && importProgress && (
        <div className="mb-4">
          <div className="h-2 bg-[#eef0f4] rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
            />
          </div>
          <p className="text-xs text-[#5f6980] mt-1">
            {importProgress.done} / {importProgress.total}
            {importProgress.current ? ` — ${importProgress.current}` : ''}
          </p>
        </div>
      )}

      {importResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto text-xs border border-black/[0.06] rounded-lg">
          <table className="w-full">
            <thead className="bg-[#f7f8fa] sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Row</th>
                <th className="px-3 py-2 text-left">Company</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {importResults.map((r) => (
                <tr key={r.index} className="border-t border-black/[0.04]">
                  <td className="px-3 py-1.5">{r.index + 1}</td>
                  <td className="px-3 py-1.5">{r.companyName}</td>
                  <td className={`px-3 py-1.5 ${r.ok ? 'text-green-700' : 'text-red-700'}`}>
                    {r.ok ? `Created${r.recordID ? ` (${r.recordID})` : ''}` : r.detail?.slice(0, 240)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
