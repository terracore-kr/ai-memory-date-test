// Connect your memory system here. This is the only file you need to edit.
//
// The harness calls, for each synthetic customer:
//   1. reset(customerId)                          start from an empty memory
//   2. ingest(customerId, session) for 6 sessions  in date order
//   3. answer(customerId, question)               once per question per run
//
// Every session carries its date (session.date) and every message carries
// `timestamp`. The first user message of each session also says
// "Today's date is YYYY-MM-DD." Use whichever your system supports.
//
// Return the model's plain-text answer. The scorer reads it as-is.
// If your system cannot find the answer, it should say "unknown".

export type Message = { role: "user" | "assistant"; content: string; timestamp: string }
export type Session = { date: string; messages: Message[] }

export interface MemoryAdapter {
  /** Short label printed in the results, e.g. "my-memory v0.3 + gpt-4.1-mini". */
  name: string
  reset(customerId: string): Promise<void>
  ingest(customerId: string, session: Session): Promise<void>
  answer(customerId: string, question: string): Promise<string>
}

// ── Example adapters ────────────────────────────────────────────────────────
// Pick one with ADAPTER=echo | full-transcript, or write your own below.

/** Free smoke test: always answers "unknown". Checks that the harness runs. */
const echo: MemoryAdapter = {
  name: "echo (always unknown)",
  async reset() {},
  async ingest() {},
  async answer() { return "unknown" },
}

/**
 * Baseline with no memory system at all: the whole transcript is sent with
 * every question. Uses any OpenAI-compatible chat endpoint:
 *   OPENAI_API_KEY, OPENAI_BASE_URL (default https://api.openai.com/v1), MODEL (default gpt-4.1-mini)
 * Costs money. Run with --dry-run first to see the estimate.
 */
const transcripts = new Map<string, Message[]>()
const fullTranscript: MemoryAdapter = {
  name: `full transcript + ${process.env.MODEL ?? "gpt-4.1-mini"}`,
  async reset(id) { transcripts.set(id, []) },
  async ingest(id, s) { transcripts.get(id)!.push(...s.messages) },
  async answer(id, question) {
    const history = transcripts.get(id)!.map((m) => ({ role: m.role, content: `[${m.timestamp}] ${m.content}` }))
    const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
      body: JSON.stringify({
        model: process.env.MODEL ?? "gpt-4.1-mini",
        temperature: 0,
        max_tokens: 60,
        messages: [
          { role: "system", content: "You answer a question about the user using only the conversation history provided. The history is everything known about this user. If the user said different things at different times, the more recent statement is correct. Answer in as few words as possible, with no explanation. If the history does not contain the answer, reply exactly: unknown" },
          ...history,
          { role: "user", content: question },
        ],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { choices: { message: { content: string } }[] }
    return data.choices[0].message.content
  },
}

// ── Your adapter ────────────────────────────────────────────────────────────
// const mine: MemoryAdapter = {
//   name: "my-memory",
//   async reset(id) { /* delete or namespace memories for this customer */ },
//   async ingest(id, session) { /* add the session to your memory */ },
//   async answer(id, question) { /* retrieve + answer; return text */ return "unknown" },
// }

export const adapters: Record<string, MemoryAdapter> = { echo, "full-transcript": fullTranscript /*, mine */ }
