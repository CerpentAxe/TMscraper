"use client";

import { FormEvent, useState } from "react";

type RunSummary = {
  startFrom: string;
  lastProcessedTmNumber: string | null;
  stopReason: string;
  processed: number;
  skippedInvalid: number;
  imagesStored: number;
};

export default function ManualRunForm() {
  const [startFrom, setStartFrom] = useState("");
  const [maxItems, setMaxItems] = useState("150");
  const [manualSecret, setManualSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunSummary | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/cron/trademarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-manual-secret": manualSecret
        },
        body: JSON.stringify({
          startFrom: startFrom.trim() || undefined,
          maxItems: Number(maxItems) || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Run failed");
      }

      setResult(data as RunSummary);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <label>
        Manual trigger secret
        <input
          value={manualSecret}
          onChange={(event) => setManualSecret(event.target.value)}
          type="password"
          required
          style={{ width: "100%", padding: 8 }}
        />
      </label>

      <label>
        Start from (optional, format yyyy/12345)
        <input
          value={startFrom}
          onChange={(event) => setStartFrom(event.target.value)}
          placeholder="2026/20052"
          style={{ width: "100%", padding: 8 }}
        />
      </label>

      <label>
        Max items this run
        <input
          value={maxItems}
          onChange={(event) => setMaxItems(event.target.value)}
          type="number"
          min={1}
          max={2000}
          style={{ width: "100%", padding: 8 }}
        />
      </label>

      <button type="submit" disabled={loading} style={{ padding: "8px 12px", width: 180 }}>
        {loading ? "Running..." : "Run ingestion now"}
      </button>

      {error ? <p style={{ color: "crimson" }}>Error: {error}</p> : null}

      {result ? (
        <pre style={{ backgroundColor: "#f4f4f4", padding: 12, borderRadius: 6 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
