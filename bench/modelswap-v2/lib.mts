// 실행기와 채점기가 함께 쓰는 고정 정의(모델 이름, 지시문, 두 저장소의 모양). 부작용 없음.
import type { Customer, Fact } from "./data.mts"

export const MODEL_A = "openai/gpt-4.1-mini"
export const MODEL_B = "openai/gpt-4.1"
export const ANSWER_SYS =
  "You answer a question about one customer using only the memory records provided. The records are everything known about this customer. If records disagree, the more recent one is correct. Answer in as few words as possible, with no explanation. If the records do not contain the answer, reply exactly: unknown"
export const answerPrompt = (c: Customer, lines: string, question: string) => `Customer: ${c.name}\nMemory records:\n${lines}\n\nQuestion: ${question}`

// ── 채점 규칙 (PREREG.md 4절). 규칙 기반, 모델 호출 없음 ──
const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `
const has = (n: string, phrase: string) => n.includes(` ${phrase.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `)
const pos = (n: string, phrase: string) => n.indexOf(` ${phrase.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `)
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
/** 답 안에 정답 날짜가 있는가. ISO, "June 9", "9 June", "Jun 9th", "6/9/2026"(월/일)을 받는다. */
export function hasDate(answer: string, iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number)
  if (answer.includes(iso)) return true
  const a = answer.toLowerCase().replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
  const mon = `(?:${MONTHS[m - 1]}|${MONTHS[m - 1].slice(0, 3)})\\.?`
  if (new RegExp(`\\b${mon}\\s+0?${d}\\b(?!\\d)`).test(a) || new RegExp(`\\b0?${d}\\s+(?:of\\s+)?${mon}(?![a-z])`).test(a)) return true
  return new RegExp(`\\b0?${m}/0?${d}/(?:${y}|${String(y).slice(2)})\\b`).test(a)
}
const NUMWORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]
/** 답에 처음 나오는 수(숫자 또는 zero~twelve 낱말). 없으면 null. */
export function firstNumber(answer: string): number | null {
  const m = norm(answer).match(/ (\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) /)
  if (!m) return null
  return /^\d+$/.test(m[1]) ? Number(m[1]) : NUMWORDS.indexOf(m[1])
}
/**
 * 정답 여부 (PREREG.md 4절).
 * tokens: 정답 낱말이 있어야 하고, 금지 낱말이 함께 있으면 정답 낱말이 먼저 나온 경우만 정답(both=true로 표시).
 * date: 정답 날짜가 있으면 정답. number: 답의 첫 수가 정답과 같으면 정답. yesno: 첫 낱말이 yes/no로 정답과 같으면 정답.
 * unknown: 답에 unknown이 있고 금지 낱말이 없으면 정답.
 */
export function grade(f: Fact, answer: string): { ok: boolean; both: boolean } {
  const n = norm(answer)
  if (f.kind === "date") return { ok: hasDate(answer, f.date!), both: false }
  if (f.kind === "number") return { ok: firstNumber(answer) === f.number, both: false }
  if (f.kind === "yesno") { const w = n.trim().split(" ")[0]; return { ok: (w === "yes" || w === "no") && (w === "yes") === f.yes, both: false } }
  if (f.kind === "unknown") return { ok: has(n, "unknown") && !(f.mustNot ?? []).some((b) => has(n, b)), both: false }
  const mustOk = f.must.every((alts) => alts.some((a) => has(n, a)))
  const bad = (f.mustNot ?? []).filter((b) => has(n, b))
  if (!mustOk) return { ok: false, both: false }
  if (bad.length === 0) return { ok: true, both: false }
  const firstMust = Math.min(...f.must.flatMap((alts) => alts.map((a) => pos(n, a)).filter((p) => p >= 0)))
  const firstBad = Math.min(...bad.map((b) => pos(n, b)))
  return { ok: firstMust < firstBad, both: true }
}

/**
 * 모델에 보여준 글(프롬프트)에 이 질문의 근거가 온전히 있는가. 모델 호출 없이 읽는다.
 * - 근거 표지가 모두 기록 줄에 있어야 한다. 날짜가 필요한 근거는 그 날짜가 같은 줄에 있어야 한다.
 * - 정정 문항: 새 값의 줄에 날짜가 없는데 옛 값의 줄도 함께 있으면, 어느 쪽이 새 값인지 가릴 근거가 없으므로 불완전하다.
 * - 답이 없는 질문(ev가 비어 있음)은 항상 true.
 */
export function evidenceIn(prompt: string, f: Fact): boolean {
  const lines = prompt.split("\n").filter((x) => x.startsWith("- ")).map((x) => x.toLowerCase())
  for (const e of f.ev) if (!lines.some((x) => x.includes(e.marker) && (!e.date || x.includes(e.date)))) return false
  if (f.oldMarker) {
    const dated = (x: string) => /\[said \d{4}-\d{2}-\d{2}\]/.test(x)
    const newLines = lines.filter((x) => x.includes(f.ev[0].marker)), oldLines = lines.filter((x) => x.includes(f.oldMarker!) && !x.includes(f.ev[0].marker))
    if (oldLines.length > 0 && !(newLines.every(dated) && oldLines.every(dated))) return false
  }
  return true
}
