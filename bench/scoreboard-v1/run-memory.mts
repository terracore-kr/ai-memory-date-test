import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { ANSWER_SYS } from "../modelswap-v2/lib.mts"
import { customers, REPS, memoryPrompt, type Mem } from "./common.mts"
import { count, usd, pool, Meter, needGateway, gen } from "./meter.mts"

const maxOutputTokens = 200
const cap = 2.50
const file = new URL("./memory.tools.json", import.meta.url)
const out = new URL("./answers-open-tools.jsonl", import.meta.url)
const tools = (JSON.parse(readFileSync(file, "utf8")) as { tools: Record<string, Mem[]> }).tools
const stores = ["mem0", "langmem"] as const
const jobs = REPS.flatMap(rep => stores.flatMap(store => customers.flatMap(customer =>
  customer.facts.map(fact => ({ store, rep, qid: fact.id, prompt: memoryPrompt(store, tools, customer, fact) })),
)))
const bound = jobs.reduce((total, job) => total + usd(count(ANSWER_SYS) + count(job.prompt) + 32, maxOutputTokens), 0)
console.log(`Requests: ${jobs.length}. Estimated upper bound: $${bound.toFixed(4)}`)
if (bound > cap) throw new Error("Cost bound exceeds the cap")
if (process.argv.includes("--dry-run")) process.exit(0)
if (existsSync(out)) throw new Error("Output exists. Move it before starting a fresh run.")
needGateway()
writeFileSync(out, "")
const meter = new Meter(out, cap)
await pool(jobs, 4, async ({ prompt, ...job }) => {
  const result = await gen(ANSWER_SYS, prompt, maxOutputTokens)
  const promptSha = createHash("sha256").update(prompt).digest("hex")
  meter.record({ phase: "answer", ...job, promptSha, answer: result.text, finish: result.finish }, result.inT, result.outT)
})
