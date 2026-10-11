"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { defaultData, defaultVoice } from "./defaults";
import { migrateProfile } from "./profile";
import type { AppData } from "./types";

const KEY = "donna:data:v1";
const OLD_KEY = "harvey:data:v1"; // pre-rename data is picked up automatically

/**
 * Persistence is isolated here. v1 stores in the browser (zero setup).
 * To move to Supabase, replace load/save below; see supabase/schema.sql.
 */
function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (!raw) return defaultData;
    const d = JSON.parse(raw) as AppData;
    return {
      ...defaultData, ...d,
      settings: { ...defaultData.settings, ...d.settings, voice: { ...defaultVoice, ...d.settings?.voice } },
      profile: migrateProfile(d.profile),
    };
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

export { uid } from "./id";
