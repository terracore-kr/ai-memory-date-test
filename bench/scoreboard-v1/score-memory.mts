// scoreboard-v1 시험 1 채점 (모델 없음). 실행: npx tsx bench/scoreboard-v1/score-memory.mts [answers] [tools] [dated] > RESULT-memory.txt
import { readFileSync } from "node:fs"
import { grade } from "../modelswap-v2/lib.mts"
import { customers, STORES, REPS, TYPES } from "./common.mts"
const here = new URL("./", import.meta.url)
const aF = process.argv[2] ?? "answers-memory.jsonl"
const F = new Map(customers.flatMap((c) => c.facts.map((f) => [f.id, { f, c }] as const)))
const Q = [...F.keys()]
const ofType = (ty: string) => Q.filter((q) => F.get(q)!.f.type === ty)
const pct = (a: number, b: number) => `${a}/${b} (${((100 * a) / b).toFixed(1)}%)`
const NAME: Record<string, string> = { mem0: "Mem0 오픈소스판 2.2.1", langmem: "LangMem 0.0.30", dated: "날짜를 보존하는 실험용 저장소" }
let out = "# Re-scored raw answers for the memory comparison\n"
// 2. 답
const rows = readFileSync(new URL(aF, here), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.phase === "answer")
const seen = new Map<string, any>(), problems: string[] = []
for (const r of rows) { const k = `${r.store}|${r.rep}|${r.qid}`; if (seen.has(k)) problems.push(`중복 ${k}`); seen.set(k, r) }
for (const s of STORES) for (const rep of REPS) for (const q of Q) if (!seen.has(`${s}|${rep}|${q}`)) problems.push(`missing ${s}|${rep}|${q}`)
if (problems.length) { console.log(out + "\n판정 불가 — 실행 기록이 완전하지 않다:\n" + problems.slice(0, 20).join("\n")); process.exit(2) }
const ok = (s: string, rep: number, q: string) => { const r = seen.get(`${s}|${rep}|${q}`); return r.finish === "stop" && grade(F.get(q)!.f, r.answer).ok }
const maj = (s: string, q: string) => REPS.filter((rep) => ok(s, rep, q)).length >= 2
const tot = (s: string) => Q.filter((q) => maj(s, q)).length
out += `\n## 2. 다수결 정답 (360문항)\n| 유형 | ${STORES.map((s) => NAME[s]).join(" | ")} |\n|---|---|---|---|\n`
for (const ty of TYPES) out += `| ${ty} | ${STORES.map((s) => pct(ofType(ty).filter((q) => maj(s, q)).length, ofType(ty).length)).join(" | ")} |\n`
out += `| **합계** | ${STORES.map((s) => `**${pct(tot(s), 360)}**`).join(" | ")} |\n회차별 정답 수: ${STORES.map((s) => `${s} ${REPS.map((rep) => Q.filter((q) => ok(s, rep, q)).length).join("·")}`).join(" / ")}\n`
out += `\n정정 문항(60개 × 3회) 오답의 모양:\n`
for (const s of STORES) {
  const wrong = ofType("corrected").flatMap((q) => REPS.map((rep) => ({ q, r: seen.get(`${s}|${rep}|${q}`) }))).filter(({ q, r }) => !(r.finish === "stop" && grade(F.get(q)!.f, r.answer).ok))
  const a = (r: any) => r.answer.toLowerCase(), f = (q: string) => F.get(q)!.f
  const ho = (q: string, r: any) => (f(q).mustNot ?? []).some((b) => a(r).includes(b)), hn = (q: string, r: any) => f(q).must[0].some((m) => a(r).includes(m))
  const unk = wrong.filter(({ r }) => /unknown/.test(a(r))).length, old = wrong.filter(({ q, r }) => ho(q, r) && !hn(q, r)).length, both = wrong.filter(({ q, r }) => ho(q, r) && hn(q, r)).length
  out += `- ${NAME[s]}: 오답 ${wrong.length} — unknown ${unk}, 옛 값을 답함 ${old}, 옛 값과 새 값을 함께 답함 ${both}, 그 밖 ${wrong.length - unk - old - both}\n`
}
// 3. 사전 판정
const band = (s: string) => { const p = REPS.map((rep) => Q.filter((q) => ok(s, rep, q)).length); return Math.max(2, Math.max(...p) - Math.min(...p)) }
const dateOf = (s: string) => ofType("date").filter((q) => maj(s, q)).length, corrOf = (s: string) => ofType("corrected").filter((q) => maj(s, q)).length
out += `\n## 3. 사전 판정 (PREREG.md 6절)\n`
for (const s of ["mem0", "langmem"]) { const b = Math.max(band("dated"), band(s)); out += `- 판정 M1-${s} 실험용 저장소 합계가 ${NAME[s]}보다 흔들림 폭(${b})을 넘게 높다: ${tot("dated")} vs ${tot(s)} → **${tot("dated") - tot(s) > b ? "맞음" : "틀림"}** (예상: 맞음)\n` }
out += `- 판정 M2 Mem0의 "말한 날짜" 30문항 다수결 정답이 15개 이하다: ${dateOf("mem0")}개 → **${dateOf("mem0") <= 15 ? "맞음" : "틀림"}** (예상: 맞음)\n`
for (const s of STORES) out += `- 판정 M4-${s} 정정 60문항 다수결 정답이 54개 이상이다: ${corrOf(s)}개 → **${corrOf(s) >= 54 ? "맞음" : "틀림"}** (예상: 맞음)\n`
out += `\n## 4. 비용\n답 단계 기록 비용 $${rows.reduce((t, r) => t + (r.usd ?? 0), 0).toFixed(5)}\n\n통과 수는 보안 합격 수치가 아니다.\n`
console.log(out)
