import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const maxDuration = 30;
const MAX = 8 * 1024 * 1024;

/** Extracts plain text from an uploaded CV (pdf, docx, txt, md). Nothing is stored. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX) return NextResponse.json({ error: "File is over 8 MB." }, { status: 413 });
    const name = file.name.toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());
    let text = "";
    if (name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (name.endsWith(".docx")) {
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } else if (/\.(txt|md|markdown)$/.test(name)) {
      text = buf.toString("utf8");
    } else {
      return NextResponse.json({ error: "Use a PDF, DOCX, TXT or MD file." }, { status: 415 });
    }
    text = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 40) return NextResponse.json({ error: "No readable text found. A scanned PDF needs OCR; paste the text instead." }, { status: 422 });
    return NextResponse.json({ text, name: file.name });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read file" }, { status: 500 });
  }
}
