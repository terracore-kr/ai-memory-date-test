// Run the 360-question test against an adapter and write answers to a new file.
//   npx tsx quickstart/run.mts                     # ADAPTER=echo, free
//   ADAPTER=full-transcript npx tsx quickstart/run.mts --dry-run
//   ADAPTER=full-transcript npx tsx quickstart/run.mts --reps 3
// Options: --reps N (default 3, majority vote), --customers A,B (subset), --out file
import { existsSync, writeFileSync, appendFileSync } from "node:fs"
import { customers, sessionMessages } from "../bench/scoreboard-v1/common.mts"
import { adapters, type Session } from "./adapter.mts"

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined }
const dry = process.argv.includes("--dry-run")
const reps = Number(arg("--reps") ?? 3)
const only = arg("--customers")?.split(",")
const name = process.env.ADAPTER ?? "echo"
const adapter = adapters[name]
if (!adapter) throw new Error(`Unknown ADAPTER "${name}". Options: ${Object.keys(adapters).join(", ")}`)
const out = arg("--out") ?? `quickstart/answers-${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`
if (existsSync(out)) throw new Error(`${out} exists; refusing to overwrite`)

const chosen = customers.filter((c) => !only || only.includes(c.id))
// Same messages as the published runs (bench/scoreboard-v1/sessions.json), with a timestamp on each.
const sessionsOf = (c: (typeof customers)[number]): Session[] =>
  c.sessions.map((date, s) => ({ date, messages: sessionMessages(c, s).map((m) => ({ ...m, timestamp: date })) }))

const questions = chosen.reduce((n, c) => n + c.facts.length, 0)
console.log(`${adapter.name}: ${chosen.length} customers, ${questions} questions x ${reps} runs = ${questions * reps} answers`)
if (dry) {
  // Rough estimate for the full-transcript baseline: ~1,600 input tokens per answer.
  const calls = questions * reps
  console.log(`dry run: ${calls} answer calls. Full-transcript baseline at gpt-4.1-mini prices is roughly $${(calls * 1600 * 0.4e-6 + calls * 10 * 1.6e-6).toFixed(2)}. Nothing was sent.`)
  process.exit(0)
}

writeFileSync(out, JSON.stringify({ phase: "header", adapter: adapter.name, reps, startedAt: new Date().toISOString() }) + "\n")
for (const c of chosen) {
  await adapter.reset(c.id)
  for (const s of sessionsOf(c)) await adapter.ingest(c.id, s)
  for (const f of c.facts) for (let rep = 1; rep <= reps; rep++) {
    let answer: string
    try { answer = await adapter.answer(c.id, f.question) } catch (e) { answer = `ERROR ${(e as Error).message}` }
    appendFileSync(out, JSON.stringify({ qid: f.id, customer: c.id, rep, answer }) + "\n")
  }
  console.log(`  ${c.id} ${c.name}: done`)
}
console.log(`answers written to ${out}\nscore with: npx tsx quickstart/score.mts ${out}`)
