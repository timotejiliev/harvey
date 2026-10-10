import type { TemplateId } from "./types";
import { mdToHtml, esc } from "./markdown";

export const TEMPLATES: { id: TemplateId; name: string; blurb: string }[] = [
  { id: "classic", name: "Classic", blurb: "Serif, single column, traditional. Safest for conservative industries." },
  { id: "modern", name: "Modern", blurb: "Clean sans-serif with an accent colour. Good default for tech." },
  { id: "compact", name: "Compact", blurb: "Dense layout that fits more on two pages." },
];

const BASE = `
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #111; line-height: 1.38; }
h1 { margin: 0 0 2px; } h2 { margin: 14px 0 4px; } h3 { margin: 8px 0 2px; }
p { margin: 3px 0; } ul { margin: 2px 0 4px; padding-left: 18px; } li { margin: 1px 0; }
a { color: inherit; }
`;

const CSS: Record<TemplateId, string> = {
  classic: `body{font-family:Georgia,'Times New Roman',serif;font-size:11pt}
h1{font-size:22pt;text-align:center} h1+p{text-align:center;color:#444}
h2{font-size:12pt;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #111;padding-bottom:2px}
h3{font-size:11pt}`,
  modern: `body{font-family:Inter,'Helvetica Neue',Arial,sans-serif;font-size:10.5pt}
h1{font-size:24pt;color:#1d4ed8} h1+p{color:#555}
h2{font-size:11pt;text-transform:uppercase;letter-spacing:.08em;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:2px}
h3{font-size:10.5pt}`,
  compact: `body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;line-height:1.28}
h1{font-size:18pt} h1+p{color:#444}
h2{font-size:10pt;text-transform:uppercase;border-bottom:1px solid #999;margin-top:9px}
h3{font-size:9.5pt;margin-top:5px} ul{padding-left:14px}`,
};

/** Cover letters use the same visual identity but flow as plain paragraphs. */
export function renderDocHtml(md: string, template: TemplateId, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${BASE}${CSS[template]}</style></head><body>${mdToHtml(md)}</body></html>`;
}
