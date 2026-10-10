"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { defaultData } from "./defaults";
import type { AppData } from "./types";

const KEY = "harvey:data:v1";

/**
 * Persistence is isolated here. v1 stores in the browser (zero setup).
 * To move to Supabase, replace load/save below; see supabase/schema.sql.
 */
function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData;
    const d = JSON.parse(raw) as AppData;
    return { ...defaultData, ...d, settings: { ...defaultData.settings, ...d.settings }, profile: { ...defaultData.profile, ...d.profile } };
  } catch {
    return defaultData;
  }
}

interface Ctx {
  data: AppData;
  ready: boolean;
  update: (fn: (d: AppData) => AppData) => void;
  replace: (d: AppData) => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => { setData(load()); loaded.current = true; setReady(true); }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota/private mode */ }
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);
  const replace = useCallback((d: AppData) => setData(d), []);
  return <StoreCtx.Provider value={{ data, ready, update, replace }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
