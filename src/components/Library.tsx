"use client";
import { useStore, uid } from "@/lib/store";
import { Field } from "./ui";

export default function Library() {
  const { data, update } = useStore();
  return (
    <>
      <h1>Stories & answers</h1>
      <p className="sub">Reusable material. Stories feed interview prep; saved answers feed application form drafts.</p>
      <h2>Story bank (STAR+R)</h2>
      {data.stories.map((s) => (
        <div className="card" key={s.id}>
          <Field label="Title"><input value={s.title} onChange={(e) => update((d) => ({ ...d, stories: d.stories.map((x) => x.id === s.id ? { ...x, title: e.target.value } : x) }))} /></Field>
          <div className="grid2">
            {(["situation", "action", "result", "reflection"] as const).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                <textarea style={{ minHeight: 70 }} value={s[k]} onChange={(e) => update((d) => ({ ...d, stories: d.stories.map((x) => x.id === s.id ? { ...x, [k]: e.target.value } : x) }))} />
              </Field>
            ))}
          </div>
          <button className="btn danger" style={{ marginTop: 10 }} onClick={() => update((d) => ({ ...d, stories: d.stories.filter((x) => x.id !== s.id) }))}>Remove</button>
        </div>
      ))}
      <button className="btn ghost" onClick={() => update((d) => ({ ...d, stories: [...d.stories, { id: uid(), title: "New story", situation: "", action: "", result: "", reflection: "" }] }))}>+ Add story</button>

      <h2>Answer bank</h2>
      {data.answers.map((a) => (
        <div className="card" key={a.id}>
          <Field label="Question"><input value={a.question} onChange={(e) => update((d) => ({ ...d, answers: d.answers.map((x) => x.id === a.id ? { ...x, question: e.target.value } : x) }))} /></Field>
          <Field label="Answer"><textarea style={{ minHeight: 70 }} value={a.answer} onChange={(e) => update((d) => ({ ...d, answers: d.answers.map((x) => x.id === a.id ? { ...x, answer: e.target.value } : x) }))} /></Field>
          <button className="btn danger" style={{ marginTop: 10 }} onClick={() => update((d) => ({ ...d, answers: d.answers.filter((x) => x.id !== a.id) }))}>Remove</button>
        </div>
      ))}
      <button className="btn ghost" onClick={() => update((d) => ({ ...d, answers: [...d.answers, { id: uid(), question: "e.g. Are you authorised to work in the UK?", answer: "" }] }))}>+ Add answer</button>
    </>
  );
}
