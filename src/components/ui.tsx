"use client";
import { useState, type ReactNode } from "react";
import { mdToHtml } from "@/lib/markdown";

/** Wraps an async action with busy/error state. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, setError, run };
}

export function Md({ text }: { text: string }) {
  return <div className="md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function scoreClass(s: number) {
  return s >= 4 ? "s-hi" : s >= 3 ? "s-mid" : "s-lo";
}

export function Score({ value }: { value?: number }) {
  if (value == null) return <span className="score-chip none">Not scored</span>;
  return <span className={`score-chip ${scoreClass(value)}`}>{value.toFixed(1)}</span>;
}

/** Label on the left, control on the right, dotted rule between rows. */
export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="frow">
      <div className="frow-l"><b>{label}</b>{hint && <span>{hint}</span>}</div>
      <div className="frow-r">{children}</div>
    </div>
  );
}
