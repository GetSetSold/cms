import type { FormCondition, FormField, FormSection } from "@/lib/types";

/** The rules behind conditional questions, answers shown inside later questions, number limits and
 *  answer-driven repeat counts. Pure functions, shared by the public form and the builder, so the
 *  two can never disagree about what a setting means. */

export type Row = Record<string, string>;
export type Value = string | Row[];
export type Values = Record<string, Value>;

/** State/DOM id of a question: namespaced by section so two questions that share a key stay independent. */
export const uid = (sectionId: string, key: string) => `${sectionId}__${key}`;

/** Keys the editor produces are [a-z0-9_]; `{key}` inside a label shows that question's answer. */
export const TOKEN_RE = /\{([a-z0-9_]+)\}/gi;
/** Extra tokens that are valid in a repeatable entry's title. */
export const ENTRY_TOKENS = ["n", "count"];

export const NUMERIC_TYPES: FormField["type"][] = ["number", "decimal", "currency"];
export const OPS_WITHOUT_VALUE: FormCondition["op"][] = ["answered"];
export const DEFAULT_REPEAT_CAP = 12;

export type Resolved = {
  /** key -> id of the FIRST question in the form with that key (later ones can't be referenced). */
  keyToUid: Map<string, string>;
  /** key -> the first question with that key (so limits of a referenced question can be looked up). */
  fields: Map<string, FormField>;
  /** ids of the top-level questions currently shown. */
  visible: Set<string>;
};

const text = (v: Value | undefined) => (typeof v === "string" ? v.trim() : "");

/** The answer to a question, as seen by other questions: nothing if it's hidden, unknown or empty. */
function answerOf(key: string, values: Values, keyToUid: Map<string, string>, visible: Set<string>): string {
  const id = keyToUid.get(key);
  if (!id || !visible.has(id)) return "";
  return text(values[id]);
}

function conditionMet(c: FormCondition, values: Values, keyToUid: Map<string, string>, visible: Set<string>, sourceType?: FormField["type"]): boolean {
  const a = answerOf(c.field, values, keyToUid, visible);
  // A question whose source is unanswered / hidden / missing simply isn't shown yet — for every operator.
  if (!a) return false;
  const want = (c.value ?? "").trim();
  switch (c.op) {
    case "answered": return true;
    case "equals":
      // for a tick-several question, "equals" means "that option is ticked"
      return sourceType === "multiple_choice" ? a.split(",").some((x) => x.trim().toLowerCase() === want.toLowerCase()) : a.toLowerCase() === want.toLowerCase();
    case "not_equals":
      return sourceType === "multiple_choice" ? !a.split(",").some((x) => x.trim().toLowerCase() === want.toLowerCase()) : a.toLowerCase() !== want.toLowerCase();
    case "greater_than": return Number.isFinite(Number(a)) && Number.isFinite(Number(want)) && Number(a) > Number(want);
    case "less_than": return Number.isFinite(Number(a)) && Number.isFinite(Number(want)) && Number(a) < Number(want);
    default: return true;
  }
}

/** Work out, in form order, which questions are shown. A question can only depend on EARLIER ones,
 *  and a hidden question's leftover answer counts as unanswered — so hiding one question
 *  cleanly hides everything that depended on it. */
export function resolve(sections: FormSection[], values: Values): Resolved {
  const keyToUid = new Map<string, string>();
  const fields = new Map<string, FormField>();
  const visible = new Set<string>();
  const types = new Map<string, FormField["type"]>();
  for (const sec of sections) {
    for (const f of sec.fields) {
      const id = uid(sec.id, f.key);
      const shown = !f.show_if || conditionMet(f.show_if, values, keyToUid, visible, types.get(f.show_if.field));
      if (!keyToUid.has(f.key)) { keyToUid.set(f.key, id); fields.set(f.key, f); types.set(f.key, f.type); }
      if (shown) visible.add(id);
    }
  }
  return { keyToUid, fields, visible };
}

/** Replace {key} in a label with the person's answer, or ___ until they've answered. Unknown tokens
 *  are left as typed so a typo is visible. `extra` supplies tokens like {n}. */
export function pipe(label: string, values: Values, r: Resolved, extra: Record<string, string> = {}): string {
  return label.replace(TOKEN_RE, (whole, key: string) => {
    if (key in extra) return extra[key];
    if (!r.keyToUid.has(key)) return whole;
    const a = answerOf(key, values, r.keyToUid, r.visible);
    return a ? a.split(",").map((x) => x.trim()).join(", ") : "___";
  });
}

/** Effective min/max for a number question: its own fixed limits, tightened by the answer to its
 *  "no higher than…" source. The source's limit is ignored until it has a numeric answer. */
function answerNumber(key: string | undefined, values: Values, r: Resolved): number | undefined {
  if (!key) return undefined;
  const n = Number(answerOf(key, values, r.keyToUid, r.visible));
  return Number.isFinite(n) ? n : undefined;
}

export function limitsFor(f: FormField, values: Values, r: Resolved): { min?: number; max?: number } {
  let max = f.max_value;
  if (f.max_from) {
    const n = Number(answerOf(f.max_from, values, r.keyToUid, r.visible));
    if (Number.isFinite(n) && answerOf(f.max_from, values, r.keyToUid, r.visible) !== "") max = max === undefined ? n : Math.min(max, n);
  }
  return { min: f.min_value, max };
}

/** For a repeatable group whose size follows an answer: how many entries to show (0 until answered). */
/** Free-add mode bounds: the fixed min/max, tightened by whatever an earlier answer currently
 *  allows. Each side is independent — a form can set just a minimum, just a maximum, or both. */
export function entryBounds(f: FormField, values: Values, r: Resolved): { min?: number; max?: number } {
  const fromMin = answerNumber(f.min_entries_from, values, r);
  const fromMax = answerNumber(f.max_entries_from, values, r);
  const min = [f.min_entries, fromMin].filter((n) => n !== undefined) as number[];
  const max = [f.max_entries, fromMax].filter((n) => n !== undefined) as number[];
  return { min: min.length ? Math.max(...min) : undefined, max: max.length ? Math.min(...max) : undefined };
}

export function repeatCount(f: FormField, values: Values, r: Resolved): number | undefined {
  if (!f.repeat_from) return undefined;
  const raw = answerOf(f.repeat_from, values, r.keyToUid, r.visible);
  let n = Number(raw);
  if (!raw || !Number.isFinite(n) || n < 1) return 0;
  // Never show more entries than the question it follows allows (e.g. "working" can't exceed "adults"),
  // so a mistyped 5 doesn't spawn five forms while the real limit is 2.
  const src = r.fields.get(f.repeat_from);
  const srcMax = src ? limitsFor(src, values, r).max : undefined;
  if (srcMax !== undefined) n = Math.min(n, srcMax);
  return Math.max(0, Math.min(Math.floor(n), f.max && f.max > 0 ? f.max : DEFAULT_REPEAT_CAP));
}

/** Problems with a question's logic settings, for the builder to show: anything that points at a
 *  question that isn't EARLIER in the form (missing, renamed away, or further down). */
export function brokenRefs(f: FormField, earlierKeys: Set<string>): string[] {
  const out: string[] = [];
  const check = (key: string | undefined, what: string) => { if (key && !earlierKeys.has(key)) out.push(`${what} refers to “${key}”, which isn't a question above this one.`); };
  check(f.show_if?.field, "“Show only when”");
  check(f.max_from, "“No higher than”");
  check(f.repeat_from, "“Number of entries”");
  check(f.min_entries_from, "“Minimum required”");
  check(f.max_entries_from, "“Maximum allowed”");
  const tokens = (str: string | undefined, allowed: string[], what: string) => {
    for (const m of (str ?? "").matchAll(TOKEN_RE)) if (!allowed.includes(m[1]) && !earlierKeys.has(m[1])) out.push(`${what} uses {${m[1]}}, which isn't a question above this one.`);
  };
  tokens(f.label, [], "The question text");
  tokens(f.entry_label, ENTRY_TOKENS, "The entry title");
  return out;
}

export type Step =
  /** `only`: on a section that also holds a paginating subform, the OTHER questions get their own
   *  step first (listed here so that step doesn't re-render the subform too); undefined elsewhere. */
  | { kind: "section"; sectionIndex: number; only?: string[] }
  /** One entry of a subform whose size follows an answer AND is set to paginate — its own step,
   *  showing just that entry, so a count of 6 doesn't become one very long page. */
  | { kind: "entry"; sectionIndex: number; fieldKey: string; entryIndex: number; total: number };

/** The subform in this section (if any) that's set to paginate its entries. A section can freely
 *  mix this with other questions — those just get a normal step of their own, ahead of the entries. */
export function paginatedEntryField(sec: FormSection): FormField | null {
  return sec.fields.find((f) => f.type === "subform" && f.repeat_from && f.paginate_entries) ?? null;
}

/** The step list for a form: normally one step per section-with-visible-content. A section holding
 *  a paginated subform contributes an extra step for its other questions (if it has any) plus one
 *  step per current entry (0 if the count isn't answered yet, so it's skipped like any empty section). */
export function buildSteps(sections: FormSection[], values: Values, r: Resolved): Step[] {
  const steps: Step[] = [];
  sections.forEach((sec, si) => {
    const visibleFields = sec.fields.filter((f) => r.visible.has(uid(sec.id, f.key)));
    if (!visibleFields.length) return;
    const pf = paginatedEntryField(sec);
    if (!pf) { steps.push({ kind: "section", sectionIndex: si }); return; }
    const others = visibleFields.filter((f) => f.key !== pf.key);
    if (others.length) steps.push({ kind: "section", sectionIndex: si, only: others.map((f) => f.key) });
    const n = repeatCount(pf, values, r) ?? 0;
    for (let i = 0; i < n; i++) steps.push({ kind: "entry", sectionIndex: si, fieldKey: pf.key, entryIndex: i, total: n });
  });
  return steps;
}
