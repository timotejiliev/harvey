import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { mdToBlocks, plain } from "./markdown";
import { renderDocHtml } from "./templates";
import type { ExportFormat, TemplateId } from "./types";

function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const fileSafe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "document";

/** PDF = the browser's print-to-PDF of the rendered template, so the text layer stays ATS-readable. */
function printPdf(md: string, template: TemplateId, title: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(renderDocHtml(md, template, title));
  doc.close();
  iframe.onload = null;
  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 250);
}

async function docx(md: string, filename: string) {
  const children = mdToBlocks(md).map((b) => {
    const text = plain(b.text);
    if (b.kind === "h1") return new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text, bold: true })] });
    if (b.kind === "h2") return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true })] });
    if (b.kind === "h3") return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true })] });
    if (b.kind === "li") return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] });
    return new Paragraph({ children: [new TextRun(text)] });
  });
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  download(blob, filename);
}

export async function exportDoc(md: string, format: ExportFormat, template: TemplateId, name: string) {
  const base = fileSafe(name);
  if (format === "pdf") return printPdf(md, template, base);
  if (format === "docx") return docx(md, `${base}.docx`);
  download(new Blob([md], { type: "text/markdown" }), `${base}.md`);
}
