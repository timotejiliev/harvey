"use client";

/** Donna's mark: a disc split down the middle. The halves part when she speaks. */
export function Glyph({ size = 44 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path className="gl l" d="M24 4a20 20 0 0 0 0 40z" fill="currentColor" />
      <path className="gl r" d="M24 4a20 20 0 0 1 0 40z" fill="currentColor" />
    </svg>
  );
}

const LABEL = { idle: "Listening", speaking: "Speaking", thinking: "Reading" } as const;

export default function Presence({ state = "idle", size = 64 }: { state?: "idle" | "speaking" | "thinking"; size?: number }) {
  return (
    <div className={`presence ${state}`}>
      <div className="plate"><div className="plate-in"><Glyph size={size} /></div></div>
      <span className="pstatus"><i />{LABEL[state]}</span>
    </div>
  );
}
