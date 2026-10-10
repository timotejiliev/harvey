export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

/** Minimal markdown → HTML: headings, bullets, paragraphs, bold/italic/links. */
export function mdToHtml(md: string): string {
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const line of md.replace(/\r/g, "").split("\n")) {
    const t = line.trimEnd();
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    const li = t.match(/^\s*[-*•]\s+(.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (li) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(li[1])}</li>`); }
    else if (!t.trim()) { closeList(); }
    else { closeList(); out.push(`<p>${inline(t)}</p>`); }
  }
  closeList();
  return out.join("\n");
}

export type Block =
  | { kind: "h1" | "h2" | "h3" | "p" | "li"; text: string };

export function mdToBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  for (const line of md.replace(/\r/g, "").split("\n")) {
    const t = line.trimEnd();
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    const li = t.match(/^\s*[-*•]\s+(.*)$/);
    if (h) blocks.push({ kind: (`h${h[1].length}`) as "h1" | "h2" | "h3", text: h[2] });
    else if (li) blocks.push({ kind: "li", text: li[1] });
    else if (t.trim()) blocks.push({ kind: "p", text: t });
  }
  return blocks;
}

export const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
