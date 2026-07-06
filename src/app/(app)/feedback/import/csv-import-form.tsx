"use client";

import { useState } from "react";
import Papa from "papaparse";
import { importFeedbackCsv, type ImportRow, type ImportResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Step = "upload" | "map" | "preview" | "result";

const NONE = "__none__";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map columns" },
  { key: "preview", label: "Preview" },
  { key: "result", label: "Done" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors duration-300 ${
                i < currentIndex
                  ? "bg-primary text-primary-foreground"
                  : i === currentIndex
                    ? "bg-primary-soft text-primary-soft-foreground ring-2 ring-primary/40"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentIndex ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${i === currentIndex ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-3 h-px w-8 transition-colors duration-300 ${
                i < currentIndex ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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

  return (
    <div>
      <StepIndicator current={step} />

      {step === "upload" && (
        <div className="max-w-lg animate-slide-up">
          <label className="group block cursor-pointer rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary-soft/30">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto mb-3 h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Click to choose a CSV file, or drag one here.
          </label>
          <FieldError>{parseError}</FieldError>
        </div>
      )}

      {step === "map" && (
        <Card className="max-w-lg animate-slide-up p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {fileName}: {rawRows.length} row{rawRows.length === 1 ? "" : "s"} found.
            </p>

            <div>
              <Label htmlFor="channelName">Channel for this import</Label>
              <Input
                id="channelName"
                type="text"
                list="import-channel-suggestions"
                required
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. App Store Reviews"
              />
              <datalist id="import-channel-suggestions">
                {channelNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div>
              <Label htmlFor="contentColumn">Feedback content column</Label>
              <Select id="contentColumn" value={contentColumn} onChange={(e) => setContentColumn(e.target.value)}>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="customerColumn">
                Customer name column <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Select id="customerColumn" value={customerColumn} onChange={(e) => setCustomerColumn(e.target.value)}>
                <option value={NONE}>None</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="tagsColumn">
                Tags column <span className="font-normal text-muted-foreground">(optional, comma-separated)</span>
              </Label>
              <Select id="tagsColumn" value={tagsColumn} onChange={(e) => setTagsColumn(e.target.value)}>
                <option value={NONE}>None</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>

            <Button type="button" disabled={!channelName.trim()} onClick={() => setStep("preview")}>
              Preview import
            </Button>
          </div>
        </Card>
      )}

      {step === "preview" && (
        <div className="max-w-2xl animate-slide-up space-y-4">
          <p className="text-sm text-muted-foreground">
            Importing {rawRows.length} row{rawRows.length === 1 ? "" : "s"} into{" "}
            <span className="font-medium text-foreground">{channelName}</span>. First{" "}
            {Math.min(5, rawRows.length)} shown below.
          </p>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-2 font-medium">Content</th>
                  <th className="p-2 font-medium">Customer</th>
                  <th className="p-2 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {buildRows()
                  .slice(0, 5)
                  .map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="max-w-xs truncate p-2">{row.content}</td>
                      <td className="p-2">{row.customerName || "—"}</td>
                      <td className="p-2">{row.tags || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
          <FieldError>{parseError}</FieldError>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep("map")}>
              Back
            </Button>
            <Button type="button" loading={isImporting} onClick={handleImport}>
              {isImporting ? "Importing…" : `Import ${rawRows.length} rows`}
            </Button>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <Card className="max-w-lg animate-scale-in p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm">
              Imported <span className="font-medium text-foreground">{result.succeeded}</span> of{" "}
              {result.totalRows} rows.
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {result.errors.length} row{result.errors.length === 1 ? "" : "s"} failed:
              </p>
              <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                {result.errors.map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
