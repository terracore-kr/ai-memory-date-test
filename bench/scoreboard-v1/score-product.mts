// scoreboard-v1 시험 2 채점 (모델 없음). 실행: npx tsx bench/scoreboard-v1/score-product.mts [answers] > RESULT-product.txt
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { grade } from "../modelswap-v2/lib.mts"
import { customers, REPS, TYPES, PRODUCT_SYS, productMessages, ANSWER_MODEL, type Fact } from "./common.mts"
const here = new URL("./", import.meta.url), file = process.argv[2] ?? "answers-product.jsonl"
const shaS = (s: string) => createHash("sha256").update(s).digest("hex")
const F = new Map<string, Fact>(); for (const c of customers) for (const f of c.facts) F.set(f.id, f)
const reqSha = (qid: string) => { const c = customers.find((x) => x.facts.some((f) => f.id === qid))!; return shaS(JSON.stringify({ model: ANSWER_MODEL, system: PRODUCT_SYS, messages: productMessages(c, F.get(qid)!) })) }
const Q = [...F.keys()], ofType = (ty: string) => Q.filter((q) => F.get(q)!.type === ty)
const pct = (a: number, b: number) => `${a}/${b} (${((100 * a) / b).toFixed(1)}%)`
const rows = readFileSync(new URL(file, here), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.phase === "answer")
const seen = new Map<string, any>(), problems: string[] = []
for (const r of rows) { const k = `${r.rep}|${r.qid}`; if (seen.has(k)) problems.push(`중복 ${k}`); seen.set(k, r) }
for (const rep of REPS) for (const q of Q) { const r = seen.get(`${rep}|${q}`); if (!r) { problems.push(`빠짐 ${rep}|${q}`); continue } if (r.requestSha !== reqSha(q)) problems.push(`요청 불일치 ${rep}|${q}`) }
let out = `# scoreboard-v1 시험 2 — belcore 제품 평가 (운영 API)\n고객사가 보관한 대화 기록 전체(6회차)와 질문을 POST /api/v1/chat에 보내고, API가 돌려준 답을 그대로 채점했다. 검색부터 답변까지 포함한 제품 결과다. 고객 15명(지어낸 사람) · 질문 360개 · 3회 반복 다수결 · 요청 모델 ${ANSWER_MODEL}.\n시험 1(같은 답변 모델로 기억만 비교)과 재는 방식이 다르므로 한 표에 섞지 않는다.\n\n`
if (problems.length) { console.log(out + "판정 불가 — 실행 기록이 완전하지 않다:\n" + problems.slice(0, 20).join("\n")); process.exit(2) }
const ok = (rep: number, q: string) => { const r = seen.get(`${rep}|${q}`); return r.status === 200 && typeof r.answer === "string" && grade(F.get(q)!, r.answer).ok }
const maj = (q: string) => REPS.filter((rep) => ok(rep, q)).length >= 2
out += `## 1. 다수결 정답\n| 유형 | belcore /v1/chat |\n|---|---|\n`
for (const ty of TYPES) out += `| ${ty} | ${pct(ofType(ty).filter(maj).length, ofType(ty).length)} |\n`
const total = Q.filter(maj).length
out += `| **합계** | **${pct(total, 360)}** |\n회차별 정답 수: ${REPS.map((rep) => Q.filter((q) => ok(rep, q)).length).join("·")}\n`
out += `\n## 2. 경로\n장기기억 경로(memory: long-term) ${rows.filter((r) => r.memory === "long-term").length}/${rows.length} · degraded ${rows.filter((r) => r.degraded === true).length} · 감정 지시어가 붙은 응답 ${rows.filter((r) => r.directiveActive === true).length} · 응답 모델 ${[...new Set(rows.map((r) => r.model))].join(", ")} · 지연 중앙값 ${[...rows.map((r) => r.ms)].sort((a, b) => a - b)[Math.floor(rows.length / 2)]}ms\n`
const dateN = ofType("date").filter(maj).length, corrN = ofType("corrected").filter(maj).length
out += `\n## 3. 사전 판정 (PREREG.md 6절)\n`
out += `- 판정 P2 장기기억 경로가 1,080회 모두에서 쓰였다: ${rows.filter((r) => r.memory === "long-term").length} → **${rows.every((r) => r.memory === "long-term") ? "맞음" : "틀림"}** (예상: 맞음)\n`
out += `- 판정 P3 정정 60문항 다수결 정답이 50개 이상이다: ${corrN} → **${corrN >= 50 ? "맞음" : "틀림"}** (예상: 맞음, 확신 낮음)\n`
out += `- 판정 P4 "말한 날짜" 30문항 다수결 정답이 15개 이하다: ${dateN} → **${dateN <= 15 ? "맞음" : "틀림"}** (예상: 맞음, 확신 낮음 — 검색이 날짜 알림 메시지를 고르지 않을 수 있다)\n`
out += `\n## 4. 비용\n응답에 적힌 사용량으로 계산한 답변 모델 비용 $${rows.reduce((t, r) => t + (r.usd ?? 0), 0).toFixed(5)} (임베딩 비용 제외)\n\n통과 수는 보안 합격 수치가 아니다.\n`
console.log(out)
