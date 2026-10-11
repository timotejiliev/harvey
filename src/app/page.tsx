"use client";
import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import Pipeline from "@/components/Pipeline";
import AddJob from "@/components/AddJob";
import JobDetail from "@/components/JobDetail";
import ProfileView from "@/components/ProfileView";
import Library from "@/components/Library";
import SettingsView from "@/components/SettingsView";
import Onboarding from "@/components/Onboarding";
import { hasProfileData } from "@/lib/profile";

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
  const onboarding = !hasProfileData(data.profile) || (!data.settings.apiKey && data.settings.provider !== "openai-compatible");

  return (
    <>
      {showOnboarding && (
        <Onboarding close={(to) => { setShowOnboarding(false); if (to === "profile") setView({ name: "profile" }); if (to === "add") setView({ name: "add" }); }} />
      )}
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand"><i />Donna</div>
          <nav className="nav">
            {nav.map(([n, l]) => (
              <button key={n} className={view.name === n || (n === "pipeline" && view.name === "job") ? "on" : ""} onClick={() => setView({ name: n } as View)}>{l}</button>
            ))}
          </nav>
        </div>
      </header>
      <main className="main" key={view.name + (view.name === "job" ? view.id : "")}>
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
