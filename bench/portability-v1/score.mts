// portability-v1 채점 (모델 없음). 실행: npx tsx bench/portability-v1/score.mts [answers.jsonl] > RESULT.txt
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { grade } from "../modelswap-v2/lib.mts"
import { REPS, TYPES, memoryPrompt } from "../scoreboard-v1/common.mts"
import { customers, CONDITIONS, recordPrompt, transcriptMessages, byId, type ToolMem } from "./common.mts"
const here = new URL("./", import.meta.url), aF = process.argv[2] ?? "answers.jsonl"
const shaS = (s: string) => createHash("sha256").update(s).digest("hex")
const tools = (JSON.parse(readFileSync(new URL("../scoreboard-v1/memory.tools.json", here), "utf8")) as { tools: Record<string, ToolMem[]> }).tools
const F = new Map(customers.flatMap((c) => c.facts.map((f) => [f.id, { f, c }] as const))), Q = [...F.keys()]
const ofType = (t: string) => Q.filter((q) => F.get(q)!.f.type === t), pct = (a: number, b: number) => `${a}/${b} (${((100 * a) / b).toFixed(1)}%)`
const NAME: Record<string, string> = {
  "mem0:exported": "Mem0 내보낸 그대로(도구 순서) — 시험 1 답", "langmem:exported": "LangMem 내보낸 그대로(도구 순서) — 시험 1 답",
  "mem0-by-id": "Mem0 옮긴 뒤(id 순서)", "langmem-by-id": "LangMem 옮긴 뒤(id 순서)",
  "mem0-with-timestamps": "Mem0 + 내보낸 created_at", transcript: "대화 원본을 고객사가 보관(옮기기 전후 같음)",
}
// 답 모으기: 새 실행 + 시험 1(내보낸 그대로)
const A = new Map<string, any>(), problems: string[] = []
const rows = readFileSync(new URL(aF, here), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.phase === "answer")
for (const r of rows) { const k = `${r.cond}|${r.rep}|${r.qid}`; if (A.has(k)) problems.push(`중복 ${k}`); A.set(k, r) }
const old = readFileSync(new URL("../scoreboard-v1/answers-memory.jsonl", here), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.phase === "answer" && r.store !== "dated")
for (const r of old) A.set(`${r.store}:exported|${r.rep}|${r.qid}`, { ...r, inputSha: r.promptSha })
const COLS = ["mem0:exported", "mem0-by-id", "mem0-with-timestamps", "langmem:exported", "langmem-by-id", "transcript"]
const expect = (col: string, c: any, f: any) => col.endsWith(":exported") ? shaS(memoryPrompt(col.split(":")[0] as any, tools as any, c, f)) : col === "transcript" ? shaS(JSON.stringify(transcriptMessages(c, f))) : shaS(recordPrompt(col as any, tools, c, f))
for (const col of COLS) for (const rep of REPS) for (const [q, { f, c }] of F) { const r = A.get(`${col}|${rep}|${q}`); if (!r) { problems.push(`빠짐 ${col}|${rep}|${q}`); continue } if (r.inputSha !== expect(col, c, f)) problems.push(`입력 불일치 ${col}|${rep}|${q}`) }
let out = `# portability-v1 — 기억을 옮긴 뒤에도 맞게 답하는가\n고객 15명(지어낸 사람) · 질문 360개 · 답변 모델 openai/gpt-4.1-mini · 온도 0 · 3회 다수결. 기억은 scoreboard-v1 시험 1에서 한 번 얼린 것(새로 만들지 않음). "옮긴 뒤"는 실제 다른 제품에 넣은 것이 아니라, 내보낸 기록을 바꾸지 않고 순서나 내보낸 시각만 달리 보여 준 모형이다.\n\n`
if (problems.length) { console.log(out + "판정 불가 — 기록이 완전하지 않다:\n" + problems.slice(0, 20).join("\n")); process.exit(2) }
const ok = (col: string, rep: number, q: string) => { const r = A.get(`${col}|${rep}|${q}`); return r.finish === "stop" && grade(F.get(q)!.f, r.answer).ok }
const maj = (col: string, q: string) => REPS.filter((rep) => ok(col, rep, q)).length >= 2
const tot = (col: string) => Q.filter((q) => maj(col, q)).length, typ = (col: string, t: string) => ofType(t).filter((q) => maj(col, q)).length
const perRep = (col: string) => REPS.map((rep) => Q.filter((q) => ok(col, rep, q)).length), spread = (col: string) => Math.max(...perRep(col)) - Math.min(...perRep(col))
// 1. 무료 확인
const m0 = tools.mem0, sessDays = new Set(customers.flatMap((c) => c.sessions))
const createdDays = [...new Set(m0.map((m) => m.created_at!.slice(0, 10)))]
out += `## 1. 내보낸 기록 (모델 호출 없음)\n- Mem0 기록 ${m0.length}개의 created_at 날짜: ${createdDays.join(", ")}. 대화 회차 날짜와 같은 것: ${m0.filter((m) => sessDays.has(m.created_at!.slice(0, 10))).length}개. 내보낸 시각은 "기억을 만든 시각"이지 "말한 날"이 아니다.\n- LangMem 기록 ${tools.langmem.length}개에는 시각 필드가 없다(필드: ${Object.keys(tools.langmem[0]).join(", ")}).\n`
const posOf = (mem: ToolMem[], cid: string, f: any) => { const t = mem.filter((m) => m.customer === cid).map((m) => m.text.toLowerCase()); const n = t.findIndex((x) => x.includes(f.ev[0].marker)), o = t.findIndex((x) => x.includes(f.oldMarker)); return o < 0 || n < 0 ? "none" : n > o ? "later" : "earlier" }
const orderOf: Record<string, (tool: string) => ToolMem[]> = { exported: (t) => tools[t], "by-id": (t) => byId(tools[t]) }
out += `\n정정 60문항에서 새 값 기록이 옛 값 기록보다 뒤에 있는 수(옛 값이 남은 것만):\n| 저장 | 내보낸 순서 | id 순서 |\n|---|---|---|\n`
for (const t of ["mem0", "langmem"]) { const cnt = (o: string) => { const p = ofType("corrected").map((q) => posOf(orderOf[o](t), F.get(q)!.c.id, F.get(q)!.f)); return `${p.filter((x) => x === "later").length}/${p.filter((x) => x !== "none").length}` }; out += `| ${t} | ${cnt("exported")} | ${cnt("by-id")} |\n` }
// 2. 점수
out += `\n## 2. 다수결 정답 (360문항)\n| 유형 | ${COLS.map((c) => NAME[c]).join(" | ")} |\n|${"---|".repeat(COLS.length + 1)}\n`
for (const t of TYPES) out += `| ${t} | ${COLS.map((c) => pct(typ(c, t), ofType(t).length)).join(" | ")} |\n`
out += `| **합계** | ${COLS.map((c) => `**${pct(tot(c), 360)}**`).join(" | ")} |\n회차별: ${COLS.map((c) => `${c} ${perRep(c).join("·")}`).join(" / ")}\n`
// 3. 위치 분석
const posTally = (col: string, tool: string, ord: string) => { const r = { later: [0, 0], earlier: [0, 0] } as Record<string, number[]>; for (const q of ofType("corrected")) { const { f, c } = F.get(q)!; const p = posOf(orderOf[ord](tool), c.id, f); if (p === "none") continue; r[p][1]++; if (maj(col, q)) r[p][0]++ } return r }
const pos = { "mem0-by-id": posTally("mem0-by-id", "mem0", "by-id"), "langmem-by-id": posTally("langmem-by-id", "langmem", "by-id") }
out += `\n## 3. 정정 문항: 줄 위치와 정답 (다수결)\n| 조건 | 새 값이 뒤 | 새 값이 앞 |\n|---|---|---|\n${Object.entries(pos).map(([k, r]) => `| ${NAME[k]} | ${r.later[0]}/${r.later[1]} | ${r.earlier[0]}/${r.earlier[1]} |`).join("\n")}\n`
// 4. 내보낸 시각을 답한 수
const ts = ofType("date").flatMap((q) => REPS.map((rep) => A.get(`mem0-with-timestamps|${rep}|${q}`).answer as string))
const tsHits = ts.filter((a) => /2026-11-23|november 23|nov\.? 23|23 nov/i.test(a)).length
out += `\n## 4. "말한 날짜" 30문항 × 3회에서 내보낸 created_at 날짜(2026-11-23)를 답한 수: ${tsHits}/90 (Mem0 + 내보낸 created_at)\n`
// 5. 판정
const vr = (a: string, b: string) => Math.max(2, spread(a), spread(b))
const v = (name: string, txt: string, res: boolean, exp: boolean) => `- 판정 ${name} ${txt} → **${res ? "맞음" : "틀림"}** (예상: ${exp ? "맞음" : "틀림"})\n`
out += `\n## 5. 사전 판정 (PREREG.md 5절)\n`
out += v("P1", `Mem0 정정 문항 다수결 정답이 옮긴 뒤 45개 이하: ${typ("mem0-by-id", "corrected")} (내보낸 그대로 ${typ("mem0:exported", "corrected")})`, typ("mem0-by-id", "corrected") <= 45, true)
const L = pos["mem0-by-id"].later, E = pos["mem0-by-id"].earlier
out += v("P2", `Mem0 옮긴 뒤 정정 문항: 새 값이 뒤일 때 80% 이상, 앞일 때 20% 이하 정답: ${L[0]}/${L[1]}, ${E[0]}/${E[1]}`, L[1] > 0 && E[1] > 0 && L[0] / L[1] >= 0.8 && E[0] / E[1] <= 0.2, true)
out += v("P3", `LangMem "말한 날짜" 30문항 다수결 정답이 옮긴 뒤 15개 이하: ${typ("langmem-by-id", "date")} (내보낸 그대로 ${typ("langmem:exported", "date")})`, typ("langmem-by-id", "date") <= 15, true)
out += v("P4a", `Mem0 + 내보낸 created_at의 "말한 날짜" 정답이 9개 이하: ${typ("mem0-with-timestamps", "date")}`, typ("mem0-with-timestamps", "date") <= 9, true)
out += v("P4b", `그 90개 답 중 2026-11-23을 답한 것이 10개 이상: ${tsHits}`, tsHits >= 10, true)
out += v("P5", `대화 원본 보관 합계 320 이상이고 "말한 날짜" 25 이상: ${tot("transcript")}, ${typ("transcript", "date")}`, tot("transcript") >= 320 && typ("transcript", "date") >= 25, true)
for (const t of ["mem0-by-id", "langmem-by-id"]) out += v(`P6-${t.split("-")[0]}`, `대화 원본 보관 합계가 ${NAME[t]}보다 흔들림 폭(${vr("transcript", t)})을 넘게 높다: ${tot("transcript")} vs ${tot(t)}`, tot("transcript") - tot(t) > vr("transcript", t), true)
const cost = rows.reduce((s, r) => s + (r.usd ?? 0), 0)
out += `\n## 6. 비용\n이번 실행 답 단계 기록 비용 $${cost.toFixed(5)}\n\n이 시험은 belcore 팀이 만들고 돌렸다. 독립 평가가 아니고 제품 순위가 아니다. 통과 수는 보안 합격 수치가 아니다.\n`
console.log(out)
