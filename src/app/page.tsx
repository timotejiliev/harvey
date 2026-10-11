"use client";
import { useEffect, useState, type ReactNode } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import Pipeline from "@/components/Pipeline";
import AddJob from "@/components/AddJob";
import JobDetail from "@/components/JobDetail";
import ProfileView from "@/components/ProfileView";
import Library from "@/components/Library";
import SettingsView from "@/components/SettingsView";
import Onboarding from "@/components/Onboarding";
import { hasProfileData } from "@/lib/profile";
import { pipelineLine } from "@/lib/donna";
import { speak } from "@/lib/voice";

const svg = (d: ReactNode) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
const ICON: Record<string, ReactNode> = {
  pipeline: svg(<><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="10" rx="1.5" /><rect x="17" y="4" width="4" height="13" rx="1.5" /></>),
  add: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>),
  profile: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>),
  library: svg(<><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></>),
  settings: svg(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>),
};

type View = { name: "pipeline" } | { name: "add" } | { name: "job"; id: string } | { name: "profile" } | { name: "library" } | { name: "settings" };

function Shell() {
  const { ready, data } = useStore();
  const [view, setView] = useState<View>({ name: "pipeline" });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [prefill, setPrefill] = useState<{ url?: string; title?: string; text?: string }>();

  // Bookmarklet handshake: tell the opener we are ready, then accept the posting.
  useEffect(() => {
    if (!new URLSearchParams(location.search).get("bm") || !window.opener) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.donna !== 1 || typeof e.data.text !== "string") return;
      setPrefill({ url: String(e.data.url ?? ""), title: String(e.data.title ?? ""), text: e.data.text });
      setView({ name: "add" });
    };
    window.addEventListener("message", onMsg);
    window.opener.postMessage("donna-ready", "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Open the onboarding once, for new users only (not when arriving via the bookmarklet).
  useEffect(() => {
    if (ready && !data.profile.onboarded && !new URLSearchParams(location.search).get("bm")) setShowOnboarding(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;
  const nav: [View["name"], string][] = [["pipeline", "Pipeline"], ["add", "Add jobs"], ["profile", "Profile"], ["library", "Stories & answers"], ["settings", "Settings"]];
  const today = new Date().toISOString().slice(0, 10);
  const line = pipelineLine({ jobs: data.jobs.length, due: data.jobs.filter((j) => j.followUpDate && j.followUpDate <= today && !["Rejected", "Withdrawn", "Offer"].includes(j.status)).length, ready: data.jobs.filter((j) => j.status === "Ready to apply").length });
  const onboarding = !hasProfileData(data.profile) || (!data.settings.apiKey && data.settings.provider !== "openai-compatible");

  return (
    <>
      {showOnboarding && (
        <Onboarding close={(to) => { setShowOnboarding(false); if (to) setView({ name: to } as View); }} />
      )}
      <div className="desk">
        <div className="window">
          <aside className="side">
            <div className="brand">Donna</div>
            <nav className="nav">
              {nav.map(([n, l]) => (
                <button key={n} className={view.name === n || (n === "pipeline" && view.name === "job") ? "on" : ""} onClick={() => setView({ name: n } as View)}>
                  {ICON[n]}<span>{l}</span>
                  {n === "pipeline" && data.jobs.length > 0 && <em className="count">{data.jobs.length}</em>}
                </button>
              ))}
            </nav>
            <div className="says">
              <span className="eyebrow">Donna says</span>
              <p>{line.text}</p>
              {data.settings.voice.mode !== "off" && <button onClick={() => speak(data.settings, line.text, { id: line.id })}>Hear it</button>}
            </div>
          </aside>
      <main className="pane" key={view.name + (view.name === "job" ? view.id : "")}>
        {onboarding && view.name === "pipeline" && (
          <div className="banner"><b>Get started:</b> 1) add your AI key in <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: "settings" }); }}>Settings</a>, 2) build your profile in <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: "profile" }); }}>Profile</a>, 3) add a job.</div>
        )}
        {view.name === "pipeline" && <Pipeline open={(id) => setView({ name: "job", id })} goAdd={() => setView({ name: "add" })} />}
        {view.name === "add" && <AddJob prefill={prefill} done={(id) => { setPrefill(undefined); setView(id ? { name: "job", id } : { name: "pipeline" }); }} />}
        {view.name === "job" && <JobDetail id={view.id} back={() => setView({ name: "pipeline" })} />}
        {view.name === "profile" && <ProfileView talk={() => setShowOnboarding(true)} />}
        {view.name === "library" && <Library />}
        {view.name === "settings" && <SettingsView />}
      </main>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
