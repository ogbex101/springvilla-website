"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveGoals, type State } from "@/app/member/actions";
import { btn, input } from "@/components/admin/ui";

export function GoalsEditor({ initial }: { initial: string[] }) {
  const [goals, setGoals] = useState(initial.length ? initial : [""]);
  const [state, setState] = useState<State>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <ul className="space-y-2">
        {goals.map((g, i) => (
          <li key={i} className="flex gap-2">
            <label className="sr-only" htmlFor={`goal-${i}`}>Goal {i + 1}</label>
            <input id={`goal-${i}`} className={input} value={g} maxLength={160} placeholder="e.g. Give a five-minute talk at an office session" onChange={(e) => setGoals(goals.map((x, k) => (k === i ? e.target.value : x)))} />
            <button type="button" className={btn.ghost} aria-label={`Remove goal ${i + 1}`} onClick={() => setGoals(goals.filter((_, k) => k !== i))}><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {goals.length < 8 && <button type="button" className={btn.secondary} onClick={() => setGoals([...goals, ""])}><Plus className="size-4" aria-hidden /> Add a goal</button>}
        <button type="button" className={btn.primary} disabled={pending} onClick={() => start(async () => setState(await saveGoals(goals)))}>{pending ? "Saving…" : "Save goals"}</button>
      </div>
      {state && <p role={state.error ? "alert" : "status"} className="mt-2 text-small">{state.error ?? state.message}</p>}
    </div>
  );
}
