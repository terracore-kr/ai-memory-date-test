// scoreboard-v1 ts3 — 날짜를 바뀌는 곳에만 붙이는 v4 배포 후, 메시지별 시각을 함께 보낸 경우의 제품 측정 (운영 API, 유료). 사전 등록: ts3/PREREG.md.
// ts2와 같은 요청(ts3/timed.mts = ts2/timed.mts)·같은 채점.
// fix2와 같은 대화·질문·채점. 바뀐 것: 기록의 모든 메시지에 그 회차 날짜를 timestamp로 붙여 보낸다(질문 메시지에는 안 붙인다).
// 시험 2(run-product.mts)와 같은 요청·같은 채점. 바뀐 것은 운영 배포의 data-protection.ts 하나뿐이다.
//   pilot : 고객 A 1명 × 24문항 × 1회. 장기기억 경로(memory: "long-term")가 실제로 쓰이는지 등 7절 조건을 확인한다.
//   full  : 예비 실행이 통과한 경우에만. 15명 × 24문항 × 3회 = 1,080회.
// 고객사처럼 보관한 대화 기록 전체 + 질문을 POST /api/v1/chat (stateless: emotion·endUserId 없음)에 보내고, API가 돌려준 reply를 그대로 채점한다.
// 환경 변수: BELCORE_API_KEY(시험용 프로젝트 키, 값은 출력·기록하지 않는다), BELCORE_BASE_URL(기본 https://belcore.xyz)
// 실행: npx tsx bench/scoreboard-v1/run-product.mts pilot|full [--mock|--dry-run]
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { customers, REPS, PRODUCT_SYS, PILOT_CUSTOMER, ANSWER_MODEL } from "../common.mts"
import { timedMessages, type TMsg as Msg } from "./timed.mts"
import { MOCK, DRY, sfx, count, usd, pool } from "../meter.mts"
const here = new URL("../", import.meta.url), fixdir = new URL("./", import.meta.url), phase = process.argv[2]
if (phase !== "pilot" && phase !== "full" && phase !== "verdict") throw new Error("usage: ts3/run.mts pilot|verdict|full [--mock|--dry-run]")
const PIN: Record<string, string> = {"PREREG.md": "03a77808ff284b406be076f4c0f28ee27637ab70ab758e1179a1cd83a91f7582", "score.mts": "14cf4d20d4f29ae05dafb660f6c180cf846309bf53ca64666e980ae0e04dc287", "timed.mts": "0ff97a671eb2766f610612b0a52541083481db5f15c40bb6adab571fcafa0d5b", "../common.mts": "3646cb74366725114ee7268059d76e5c9ebc196d96fef57e7459a2c1676ccd53", "../meter.mts": "eb26d700065c61d81528f5ef266d999869b55093a93373ff2a553b4cb166dcca", "../../modelswap-v2/data.mts": "f05b42ba34482879d36106662074644908a8d6049eab1ad3d753f8571ee7884b", "../../modelswap-v2/lib.mts": "184ae9e2750717b388828e239168e8d6e5b6f445ccd1e697d1b4cabeef11bcfe", "../../scale-v1/data.mts": "7bfc9625a3111dd3830f272ee29c2b29259f34a48338e915f1638a1a3bcdfa99"}
const sha = (u: URL) => createHash("sha256").update(readFileSync(u)).digest("hex"), shaS = (s: string) => createHash("sha256").update(s).digest("hex")
if (!MOCK) for (const [rel, h] of Object.entries(PIN)) if (sha(new URL(rel, fixdir)) !== h) throw new Error(`${rel} changed after preregistration`)
const CAP = phase === "pilot" ? 0.1 : 1.5, MAX_ERRORS = 5, MAX_OUT = 200, OVERHEAD = 600, CONCURRENCY = 2
const BASE = process.env.BELCORE_BASE_URL ?? "https://belcore.xyz"
const pilotFile = new URL(`pilot${sfx}.jsonl`, fixdir), verdictFile = new URL(`pilot-verdict${sfx}.json`, fixdir), fullFile = new URL(`answers${sfx}.jsonl`, fixdir)
const jobs = (phase === "pilot" ? [1] : REPS).flatMap((rep) => customers.filter((c) => phase === "full" || c.id === PILOT_CUSTOMER).flatMap((c) => c.facts.map((f) => ({ rep, qid: f.id, messages: timedMessages(c, f) }))))
const bodyOf = (messages: Msg[]) => JSON.stringify({ model: ANSWER_MODEL, system: PRODUCT_SYS, messages })
// 보수적 상한: 대화 기록 전체를 다 보낸다고 보고(제품은 그중 일부만 모델에 넘긴다), 감정 지시어·형식 여유 600토큰, 출력 200토큰.
const bound = jobs.reduce((t, j) => t + usd(count(PRODUCT_SYS) + j.messages.reduce((s, m) => s + count(m.content) + 10, 0) + OVERHEAD, MAX_OUT), 0)
console.log(`${phase}: base ${BASE}, calls ${jobs.length}, conservative bound $${bound.toFixed(4)} (answer model tokens; embeddings excluded), cap $${CAP}${MOCK ? " (mock)" : ""}`)
if (bound > CAP && !MOCK) throw new Error("Cost bound exceeds the ceiling")
if (DRY) process.exit(0)
// verdict: 이미 있는 pilot 기록으로 판정만 다시 계산한다(호출 없음).
const judgePilot = () => {
  const rows = readFileSync(pilotFile, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.phase === "answer")
  const okRows = rows.filter((r) => r.status === 200), errs = rows.filter((r) => r.status !== 200)
  const checks = {
    allRequested: rows.length === 24,
    atMostOneServerError: errs.length <= 1 && errs.every((r) => r.status >= 500),
    answered: okRows.every((r) => typeof r.answer === "string" && r.answer.length > 0),
    longTerm: okRows.every((r) => r.memory === "long-term"),
    notDegraded: okRows.every((r) => r.degraded === false),
    sameModel: okRows.every((r) => typeof r.model === "string" && r.model.includes("gpt-4.1-mini")),
    usage: okRows.every((r) => r.usd != null),
    noRedactedDate: okRows.every((r) => !/redacted_phone/i.test(r.answer ?? "")),
  }
  const probes = readFileSync(pilotFile, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.phase === "probe")
  const probeOk = MOCK || (probes.length === 3 && probes.every((p) => p.status === 400))
  const pass = probeOk && Object.values(checks).every(Boolean)
  writeFileSync(verdictFile, JSON.stringify({ pass, rule: "ts3 PREREG 2절: 5xx 1건 이하 허용, 정상 응답만 조건 검사", probeOk, checks, serverErrors: errs.length, longTermCount: okRows.filter((r) => r.memory === "long-term").length, pilotSha: sha(pilotFile) }, null, 1) + "\n")
  console.log(`pilot ${pass ? "PASSED" : "FAILED"}: ${JSON.stringify(checks)} probes ${probeOk}`)
}
if (phase === "verdict") { if (!existsSync(pilotFile)) throw new Error("pilot.jsonl missing"); judgePilot(); process.exit(0) }
const out = phase === "pilot" ? pilotFile : fullFile
if (phase === "full") {
  if (!existsSync(verdictFile)) throw new Error("Pilot verdict missing. Run pilot first.")
  const v = JSON.parse(readFileSync(verdictFile, "utf8"))
  if (v.pass !== true || v.pilotSha !== sha(pilotFile)) throw new Error("Pilot did not pass (or the pilot file changed). Full run refused.")
}
if (MOCK) writeFileSync(out, ""); else if (existsSync(out)) throw new Error(`${out.pathname.split("/").pop()} exists. Inspect the previous run before rerunning.`)
const KEY = process.env.BELCORE_API_KEY
if (!MOCK && !KEY) throw new Error("BELCORE_API_KEY unavailable")
if (phase === "pilot" && !MOCK) {
  // 기능이 배포됐는지 확인(무료): 잘못된 timestamp는 모델 호출 전에 400이어야 한다. 아니면 멈춘다.
  for (const bad of ["not-a-date", "2026-01-12T99:99:99Z", null]) {
    const r = await fetch(`${BASE}/api/v1/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ model: ANSWER_MODEL, messages: [{ role: "user", content: "probe", timestamp: bad }] }), signal: AbortSignal.timeout(30_000) })
    appendFileSync(out, JSON.stringify({ phase: "probe", timestamp: bad, status: r.status }) + "\n")
    if (r.status !== 400) throw new Error(`Timestamp validation not live (probe ${JSON.stringify(bad)} returned ${r.status}, expected 400). Stopped.`)
  }
}
appendFileSync(out, JSON.stringify({ phase: "header", base: BASE, productSys: shaS(PRODUCT_SYS), model: ANSWER_MODEL }) + "\n")
const tokens = (u: any): [number | null, number | null] => {
  if (!u || typeof u !== "object") return [null, null]
  const i = u.inputTokens ?? u.promptTokens ?? u.input_tokens ?? u.prompt_tokens, o = u.outputTokens ?? u.completionTokens ?? u.output_tokens ?? u.completion_tokens
  return [typeof i === "number" ? i : null, typeof o === "number" ? o : null]
}
let cost = 0, errors = 0
const post = async (messages: Msg[]): Promise<{ status: number; json: any; ms: number }> => {
  const t0 = Date.now()
  if (MOCK) { const last = messages[messages.length - 2]?.content ?? ""; return { status: 200, json: { reply: last.slice(0, 40), memory: "long-term", degraded: false, directiveActive: false, model: ANSWER_MODEL, usage: { inputTokens: 900, outputTokens: 6 } }, ms: 1 } }
  const r = await fetch(`${BASE}/api/v1/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: bodyOf(messages), signal: AbortSignal.timeout(130_000) })
  let json: any = null; try { json = await r.json() } catch { json = null }
  return { status: r.status, json, ms: Date.now() - t0 }
}
await pool(jobs, CONCURRENCY, async (j) => {
  const { status, json, ms } = await post(j.messages)
  const [inT, outT] = tokens(json?.usage), u = inT == null || outT == null ? null : usd(inT, outT)
  // 오류 응답은 error 글만 남긴다. 키·요청 본문은 남기지 않는다.
  appendFileSync(out, JSON.stringify({ phase: "answer", rep: j.rep, qid: j.qid, requestSha: shaS(bodyOf(j.messages)), status, ms, answer: typeof json?.reply === "string" ? json.reply.trim() : null, memory: json?.memory ?? null, degraded: json?.degraded ?? null, directiveActive: json?.directiveActive ?? null, model: json?.model ?? null, error: status === 200 ? null : (json?.error ?? null), inT, outT, usd: u }) + "\n")
  if (status !== 200) { errors++; if (status < 500) throw new Error(`HTTP ${status} recorded. Stopped.`); if (errors > (phase === "pilot" ? 1 : MAX_ERRORS)) throw new Error(`More than ${MAX_ERRORS} server errors. Stopped.`); return }
  if (u == null) throw new Error("Missing token usage in the API response. Stopped after recording.")
  cost += u; if (cost > CAP) throw new Error("Cost ceiling reached")
})
console.log(`${phase} finished. calls ${jobs.length}, server errors ${errors}, recorded answer-model cost $${cost.toFixed(5)}`)
if (phase === "pilot") judgePilot()
