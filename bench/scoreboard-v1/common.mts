// scoreboard-v1 공통 정의. 부작용 없음.
// 고객 15명 = modelswap-v2의 A–C + scale-v1의 D–O (둘 다 지어낸 사람, 같은 대화 틀·같은 24문항 틀). 질문 360개.
import { customers as V2, sessionText, type Customer, type Fact } from "../modelswap-v2/data.mts"
import { customers as SC } from "../scale-v1/data.mts"
import { answerPrompt } from "../modelswap-v2/lib.mts"
export type { Customer, Fact }
export const customers: Customer[] = [...V2, ...(SC as unknown as Customer[])]
if (customers.length !== 15 || customers.flatMap((c) => c.facts).length !== 360) throw new Error("expected 15 customers, 360 questions")
export const ANSWER_MODEL = "openai/gpt-4.1-mini"
export const PRICE: [number, number] = [0.4, 1.6]
export const REPS = [1, 2, 3]
export const TYPES = ["distractor", "apply", "corrected", "date", "order", "days", "count", "none"]

/** 회차 하나를 메시지로. 첫 메시지로 그 회차 날짜를 알린다. 세 저장 방식과 제품 시험 모두 같은 메시지를 받는다. */
export type Msg = { role: "user" | "assistant"; content: string }
export function sessionMessages(c: Customer, s: number): Msg[] {
  return [{ role: "user", content: `Today's date is ${c.sessions[s]}.` }, { role: "assistant", content: "Noted." },
    ...sessionText(c, s).split("\n").map((l): Msg => l.startsWith("User: ") ? { role: "user", content: l.slice(6) } : { role: "assistant", content: l.slice(11) })]
}

// ── 시험 1: 기억 비교 ──
export const STORES = ["mem0", "langmem", "dated"] as const
export type Store = (typeof STORES)[number]
export type Mem = { customer: string; id: string; text: string }
export function memoryPrompt(store: "mem0" | "langmem", tools: Record<string, Mem[]>, c: Customer, f: Fact): string {
  const lines = tools[store].filter((m) => m.customer === c.id).map((m) => `- ${m.text.replace(/\s+/g, " ").trim()}`).join("\n")
  return answerPrompt(c, lines, f.question)
}

// ── 시험 2: belcore 제품 평가 ──
/** 고객사가 보내는 system 프롬프트. 답변 지시는 시험 1의 ANSWER_SYS와 같은 내용을 대화 기록에 맞게 옮겼다. */
export const PRODUCT_SYS =
  "You answer a question about the user using only the conversation history provided. The history is everything known about this user. If the user said different things at different times, the more recent statement is correct. Answer in as few words as possible, with no explanation. If the history does not contain the answer, reply exactly: unknown"
/** 고객사가 보관한 대화 기록 전체(6회차) + 마지막 user 메시지로 질문. */
export const productMessages = (c: Customer, f: Fact): Msg[] => [...c.sessions.flatMap((_, s) => sessionMessages(c, s)), { role: "user", content: f.question }]
export const PILOT_CUSTOMER = "A"
