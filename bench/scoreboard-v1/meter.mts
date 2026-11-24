// 실행기 공통: 토큰 세기, 모델 호출, 비용 기록·상한, 동시 실행. 부작용은 호출한 쪽 파일에만.
import { appendFileSync } from "node:fs"
import { PRICE } from "./common.mts"
export const MOCK = process.argv.includes("--mock"), DRY = process.argv.includes("--dry-run"), sfx = MOCK ? ".mock" : ""
export let count: (s: string) => number
if (MOCK) count = (s) => Math.ceil(s.length / 3); else { const { getEncoding } = await import("js-tiktoken"); const t = getEncoding("o200k_base"); count = (s) => t.encode(s).length }
export const usd = (i: number, o: number) => (i * PRICE[0] + o * PRICE[1]) / 1e6
export const pool = async <T,>(items: T[], n: number, fn: (x: T) => Promise<void>) => {
  let next = 0, failed: unknown = null
  const worker = async () => { while (failed == null) { const i = next++; if (i >= items.length) return; try { await fn(items[i]) } catch (e) { failed ??= e } } }
  await Promise.all(Array.from({ length: n }, worker)); if (failed != null) throw failed
}
export class Meter {
  cost = 0
  constructor(private out: URL, private cap: number) {}
  /** 한 줄 기록 후, 사용량이 없거나 상한을 넘으면 멈춘다(기록은 남긴다). */
  record(row: Record<string, unknown>, inT: number | null, outT: number | null) {
    const u = inT == null || outT == null ? null : usd(inT, outT)
    appendFileSync(this.out, JSON.stringify({ ...row, inT, outT, usd: u }) + "\n")
    if (u == null) throw new Error("Missing token usage. Stopped after recording the response.")
    this.cost += u; if (this.cost > this.cap) throw new Error("Cost ceiling reached")
  }
}
export const needGateway = () => { if (!MOCK && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) throw new Error("AI Gateway credentials unavailable") }
export async function gen(system: string, prompt: string, max: number) {
  const { generateText } = await import("ai")
  const r = await generateText({ model: "openai/gpt-4.1-mini", system, prompt, temperature: 0, maxOutputTokens: max, maxRetries: 0 })
  return { text: r.text.trim(), finish: r.finishReason as string, inT: r.usage.inputTokens ?? null, outT: r.usage.outputTokens ?? null }
}
