// portability-v1 실행 (유료, Codex가 맥에서). 사전 등록: PREREG.md.
// 실행: npx tsx bench/portability-v1/run.mts [--mock|--dry-run]
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { ANSWER_SYS } from "../modelswap-v2/lib.mts"
import { REPS } from "../scoreboard-v1/common.mts"
import { MOCK, DRY, sfx, count, usd, pool, Meter, needGateway, gen } from "../scoreboard-v1/meter.mts"
import { customers, PRODUCT_SYS, CONDITIONS, recordPrompt, transcriptMessages, type ToolMem } from "./common.mts"
const here = new URL("./", import.meta.url)
const sha = (u: URL) => createHash("sha256").update(readFileSync(u)).digest("hex"), shaS = (s: string) => createHash("sha256").update(s).digest("hex")
const PIN: Record<string, string> = JSON.parse(readFileSync(new URL("PINS.json", here), "utf8"))
if (!MOCK) for (const [rel, h] of Object.entries(PIN)) if (sha(new URL(rel, here)) !== h) throw new Error(`${rel} changed after preregistration`)
const CAP = 3.0, MAX_OUT = 200, MARGIN = 32
const tools = (JSON.parse(readFileSync(new URL("../scoreboard-v1/memory.tools.json", here), "utf8")) as { tools: Record<string, ToolMem[]> }).tools
type Job = { rep: number; cond: string; qid: string; system: string; prompt?: string; messages?: { role: "user" | "assistant"; content: string }[] }
const jobs: Job[] = REPS.flatMap((rep) => CONDITIONS.flatMap((cond) => customers.flatMap((c) => c.facts.map((f): Job =>
  cond === "transcript" ? { rep, cond, qid: f.id, system: PRODUCT_SYS, messages: transcriptMessages(c, f) } : { rep, cond, qid: f.id, system: ANSWER_SYS, prompt: recordPrompt(cond, tools, c, f) }))))
const inputOf = (j: Job) => j.prompt ?? JSON.stringify(j.messages)
const bound = jobs.reduce((t, j) => t + usd(count(j.system) + count(j.prompt ?? j.messages!.map((m) => m.content).join("\n")) + MARGIN + (j.messages ? 4 * j.messages.length : 0), MAX_OUT), 0)
console.log(`portability-v1: calls ${jobs.length} (${CONDITIONS.join(", ")} × 360 × ${REPS.length}), conservative bound $${bound.toFixed(4)}, cap $${CAP}${MOCK ? " (mock)" : ""}`)
if (bound > CAP && !MOCK) throw new Error("Cost bound exceeds the ceiling")
if (DRY) process.exit(0)
const out = new URL(`answers${sfx}.jsonl`, here)
if (MOCK) writeFileSync(out, ""); else if (existsSync(out)) throw new Error("answers.jsonl exists. Inspect the previous run before rerunning.")
needGateway()
appendFileSync(out, JSON.stringify({ phase: "header", tools: sha(new URL("../scoreboard-v1/memory.tools.json", here)), answerSys: shaS(ANSWER_SYS), productSys: shaS(PRODUCT_SYS) }) + "\n")
const m = new Meter(out, CAP)
async function call(j: Job) {
  if (MOCK) { const t = inputOf(j); return { text: t.includes("2026-11-23") ? "2026-11-23" : "unknown", finish: "stop", inT: count(t), outT: 4 } }
  if (j.prompt) return gen(j.system, j.prompt, MAX_OUT)
  const { generateText } = await import("ai")
  const r = await generateText({ model: "openai/gpt-4.1-mini", system: j.system, messages: j.messages!, temperature: 0, maxOutputTokens: MAX_OUT, maxRetries: 0 })
  return { text: r.text.trim(), finish: r.finishReason as string, inT: r.usage.inputTokens ?? null, outT: r.usage.outputTokens ?? null }
}
for (const rep of REPS) {
  await pool(jobs.filter((j) => j.rep === rep), 4, async (j) => { const r = await call(j); m.record({ phase: "answer", cond: j.cond, rep, qid: j.qid, inputSha: shaS(inputOf(j)), answer: r.text, finish: r.finish }, r.inT, r.outT) })
  console.log(`rep ${rep} done $${m.cost.toFixed(5)}`)
}
console.log(`finished. cost $${m.cost.toFixed(5)}`)
