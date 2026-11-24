// Score an answers file from quickstart/run.mts. No model calls.
//   npx tsx quickstart/score.mts quickstart/answers-....jsonl
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { grade } from "../bench/modelswap-v2/lib.mts"
import { customers, TYPES } from "../bench/scoreboard-v1/common.mts"

const file = process.argv[2]
if (!file) throw new Error("usage: npx tsx quickstart/score.mts <answers.jsonl>")
const raw = readFileSync(file, "utf8")
const lines = raw.trim().split("\n").map((l) => JSON.parse(l))
const header = lines.find((l) => l.phase === "header") ?? {}
const rows = lines.filter((l) => l.qid)
const facts = new Map(customers.flatMap((c) => c.facts.map((f) => [f.id, f] as const)))
const total = new Map<string, number>(), ok = new Map<string, number>()
const countByQuestion = new Map<string, [number, number]>()
let errors = 0

for (const [id, f] of facts) {
  const answers = rows.filter((r) => r.qid === id)
  if (!answers.length) continue
  errors += answers.filter((r) => String(r.answer).startsWith("ERROR")).length
  const votes = answers.map((r) => grade(f, String(r.answer)).ok)
  const pass = votes.filter(Boolean).length * 2 > votes.length
  total.set(f.type, (total.get(f.type) ?? 0) + 1)
  if (pass) ok.set(f.type, (ok.get(f.type) ?? 0) + 1)
  if (f.type === "count") {
    const key = f.question.includes("pets") ? "pets" : f.question.includes("trainer") ? "trainers" : "clubs, courses, trips and groups"
    const v = countByQuestion.get(key) ?? [0, 0]
    countByQuestion.set(key, [v[0] + (pass ? 1 : 0), v[1] + 1])
  }
}

const label: Record<string, string> = { distractor: "Someone else's fact mixed in", apply: "Apply a stated condition", corrected: "Corrected facts", date: "Date said", order: "Which came first", days: "Days between", count: "Counting", none: "No answer exists" }
let sum = 0, n = 0
console.log(`# ${header.adapter ?? "unknown adapter"} — majority of ${header.reps ?? "?"} answers per question\n`)
console.log("| Measure | Score |\n|---|---:|")
for (const t of TYPES) if (total.get(t)) { console.log(`| ${label[t]} | ${ok.get(t) ?? 0}/${total.get(t)} |`); sum += ok.get(t) ?? 0; n += total.get(t)! }
console.log(`| **Overall** | **${sum}/${n}** |`)
console.log("\nCounting by question (two of the three counting questions are known to be ambiguous; report them separately):")
for (const [k, [a, b]] of countByQuestion) console.log(`- ${k}: ${a}/${b}`)
if (errors) console.log(`\n${errors} answers were errors and count as wrong.`)
console.log(`\nanswers file sha256 ${createHash("sha256").update(raw).digest("hex")}`)
