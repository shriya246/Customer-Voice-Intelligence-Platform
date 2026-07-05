"use client";

import { useState } from "react";
import Papa from "papaparse";
import { importFeedbackCsv, type ImportRow, type ImportResult } from "./actions";

type Step = "upload" | "map" | "preview" | "result";

const NONE = "__none__";

export function CsvImportForm({ channelNames }: { channelNames: string[] }) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [contentColumn, setContentColumn] = useState("");
  const [customerColumn, setCustomerColumn] = useState(NONE);
  const [tagsColumn, setTagsColumn] = useState(NONE);
  const [channelName, setChannelName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setParseError("");
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
      setParseError("Couldn't find any columns in that file.");
      return;
    }
    if (parsed.data.length === 0) {
      setParseError("That file doesn't have any rows.");
      return;
    }

    setFileName(file.name);
    setHeaders(parsed.meta.fields);
    setRawRows(parsed.data);
    setContentColumn(parsed.meta.fields[0]);
    setStep("map");
  }

  function buildRows(): ImportRow[] {
    return rawRows.map((raw) => ({
      content: raw[contentColumn] ?? "",
      customerName: customerColumn !== NONE ? raw[customerColumn] : undefined,
      tags: tagsColumn !== NONE ? raw[tagsColumn] : undefined,
    }));
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const rows = buildRows();
      const res = await importFeedbackCsv(channelName, rows);
      setResult(res);
      setStep("result");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  if (step === "upload") {
    return (
      <div className="max-w-lg">
        <label className="block rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 hover:border-gray-400 dark:border-neutral-700">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          Click to choose a CSV file, or drag one here.
        </label>
        {parseError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {parseError}
          </p>
        )}
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="max-w-lg space-y-4">
        <p className="text-sm text-gray-500">
          {fileName}: {rawRows.length} row{rawRows.length === 1 ? "" : "s"} found.
        </p>

        <div>
          <label htmlFor="channelName" className="block text-sm font-medium">
            Channel for this import
          </label>
          <input
            id="channelName"
            type="text"
            list="import-channel-suggestions"
            required
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g. App Store Reviews"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          <datalist id="import-channel-suggestions">
            {channelNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="contentColumn" className="block text-sm font-medium">
            Feedback content column
          </label>
          <select
            id="contentColumn"
            value={contentColumn}
            onChange={(e) => setContentColumn(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="customerColumn" className="block text-sm font-medium">
            Customer name column <span className="text-gray-400">(optional)</span>
          </label>
          <select
            id="customerColumn"
            value={customerColumn}
            onChange={(e) => setCustomerColumn(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value={NONE}>None</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tagsColumn" className="block text-sm font-medium">
            Tags column <span className="text-gray-400">(optional, comma-separated)</span>
          </label>
          <select
            id="tagsColumn"
            value={tagsColumn}
            onChange={(e) => setTagsColumn(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value={NONE}>None</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!channelName.trim()}
          onClick={() => setStep("preview")}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          Preview import
        </button>
      </div>
    );
  }

  if (step === "preview") {
    const preview = buildRows().slice(0, 5);
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-gray-500">
          Importing {rawRows.length} row{rawRows.length === 1 ? "" : "s"} into{" "}
          <span className="font-medium">{channelName}</span>. First {preview.length} shown below.
        </p>
        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800">
                <th className="p-2 font-normal">Content</th>
                <th className="p-2 font-normal">Customer</th>
                <th className="p-2 font-normal">Tags</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-neutral-800">
                  <td className="max-w-xs truncate p-2">{row.content}</td>
                  <td className="p-2">{row.customerName || "—"}</td>
                  <td className="p-2">{row.tags || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parseError && (
          <p className="text-sm text-red-600" role="alert">
            {parseError}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("map")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Back
          </button>
          <button
            type="button"
            disabled={isImporting}
            onClick={handleImport}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {isImporting ? "Importing..." : `Import ${rawRows.length} rows`}
          </button>
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="max-w-lg">
        <p className="text-sm">
          Imported <span className="font-medium">{result.succeeded}</span> of{" "}
          {result.totalRows} rows.
        </p>
        {result.errors.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-red-600">
              {result.errors.length} row{result.errors.length === 1 ? "" : "s"} failed:
            </p>
            <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-sm text-gray-600 dark:text-gray-400">
              {result.errors.map((e) => (
                <li key={e.row}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
}
