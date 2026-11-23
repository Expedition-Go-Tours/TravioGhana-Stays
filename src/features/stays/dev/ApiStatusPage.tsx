import { useState } from "react";
import config from "@/config";
import { getAuthToken } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Download, RefreshCw, XCircle } from "@/features/stays/icons";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysButton from "../components/StaysButton";
import { PROBES, runProbes, summarize, type ProbeOutcome, type ProbeResult } from "./apiProbes";

/**
 * Dev-only API status page — `/stays/dev/api-status`.
 *
 * Calls every Stays read endpoint against the live API with the signed-in
 * session and reports, per endpoint: HTTP status, timing, and whether the
 * response carries the fields our mapping code reads. GET only (see
 * `apiProbes.ts`). Registered only in development builds, so it is absent
 * from the production bundle.
 */
const OUTCOME_STYLES: Record<ProbeOutcome, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  "shape-mismatch": { label: "Shape mismatch", className: "bg-amber-50 text-amber-800 border-amber-200" },
  unavailable: { label: "Not available", className: "bg-slate-100 text-slate-700 border-slate-200" },
  error: { label: "Error", className: "bg-red-50 text-red-700 border-red-200" },
  skipped: { label: "Skipped", className: "bg-slate-50 text-slate-500 border-slate-200" },
};

function downloadReport(results: ProbeResult[]) {
  const report = {
    generatedAt: new Date().toISOString(),
    apiBaseURL: config.api.baseURL,
    dataSource: config.stays.dataSource,
    summary: summarize(results),
    // Status codes, field names and row counts only — no response bodies.
    results,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stays-api-status-${report.generatedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ApiStatusPage() {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [running, setRunning] = useState(false);

  const liveMode = config.stays.dataSource === "api";
  const signedIn = Boolean(getAuthToken());
  const canRun = liveMode && signedIn && !running;
  const summary = summarize(results);

  const run = async () => {
    setRunning(true);
    setResults([]);
    try {
      await runProbes(PROBES, (result) => setResults((prev) => [...prev, result]));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <StaysPageHeader
        title="API status (dev only)"
        subtitle={`Read-only check of ${PROBES.length} Stays endpoints against ${config.api.baseURL}`}
        actions={
          <>
            <StaysButton variant="primary" onClick={run} disabled={!canRun}>
              <RefreshCw size={16} className={cn(running && "animate-spin")} />
              {running ? "Checking…" : results.length ? "Run again" : "Run checks"}
            </StaysButton>
            <StaysButton onClick={() => downloadReport(results)} disabled={running || results.length === 0}>
              <Download size={16} />
              Export JSON
            </StaysButton>
          </>
        }
      />

      {!liveMode && (
        <StaysCard className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">This dev server is in mock mode.</p>
          <p className="mt-1 text-sm text-amber-900/80">
            The checks need the live API. Start the dev server with <code>VITE_STAYS_DATA_SOURCE=api</code>{" "}
            (your <code>.env</code> already sets it — use <code>npm run dev</code>, not <code>npm run dev:mock</code>),
            then sign in.
          </p>
        </StaysCard>
      )}
      {liveMode && !signedIn && (
        <StaysCard className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Sign in first.</p>
          <p className="mt-1 text-sm text-amber-900/80">The checks use your session. Sign in, then come back to this page.</p>
        </StaysCard>
      )}

      <StaysCard className="mb-4">
        <p className="text-sm text-body">
          Only <strong>GET</strong> requests are sent. The export contains status codes, field names and row
          counts — no response bodies, so no guest or business data.
        </p>
        {results.length > 0 && (
          <p className="mt-3 text-sm text-ink" aria-live="polite">
            {summary.ok} OK · {summary.shapeMismatch} shape mismatch · {summary.unavailable} not available ·{" "}
            {summary.error} error · {summary.skipped} skipped
            {running && ` · ${results.length}/${PROBES.length} done`}
          </p>
        )}
      </StaysCard>

      {results.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Endpoint</th>
                <th className="px-4 py-3 font-semibold">Result</th>
                <th className="px-4 py-3 font-semibold">HTTP</th>
                <th className="px-4 py-3 text-right font-semibold">ms</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const style = OUTCOME_STYLES[result.outcome];
                const Icon = result.outcome === "ok" ? CheckCircle2 : result.outcome === "error" ? XCircle : AlertTriangle;
                return (
                  <tr key={result.id} className="border-t border-hairline align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{result.fn}</p>
                      <p className="text-xs text-muted">{result.module}</p>
                      {result.url && <p className="mt-1 break-all font-mono text-xs text-body">GET {result.url}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", style.className)}>
                        <Icon size={12} /> {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{result.status ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{result.ms ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-body">
                      {result.rows !== undefined && <p>{result.rows} row(s) checked</p>}
                      {result.error && <p className="text-red-700">{result.error}</p>}
                      {result.issues.map((issue) => (
                        <p key={`${issue.path}-${issue.problem}`}>
                          <code>{issue.path}</code>: {issue.problem}
                        </p>
                      ))}
                      {result.notes.map((note) => (
                        <p key={note} className="text-muted">{note}</p>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
