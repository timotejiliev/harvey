"use client";

/** Donna's presence: a warm, breathing light. Quickens while she speaks, swirls while she thinks. */
export default function Orb({ state = "idle", size = 220 }: { state?: "idle" | "speaking" | "thinking"; size?: number }) {
  return (
    <div className={`orb ${state}`} style={{ width: size, height: size }} aria-hidden>
      <div className="orb-glow" />
      <div className="orb-body">
        <i className="b1" /><i className="b2" /><i className="b3" />
        <span className="orb-core" />
      </div>
    </div>
  );
}
