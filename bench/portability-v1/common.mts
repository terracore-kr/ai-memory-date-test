// portability-v1 공통 정의. 부작용 없음. 사전 등록: PREREG.md.
// scoreboard-v1 시험 1에서 한 번 얼린 Mem0·LangMem 기억(memory.tools.json)을 "다른 곳으로 옮긴" 모습으로 바꿔 같은 답변 모델에 보여 준다.
// 기억을 새로 만들지 않는다. 질문·채점은 scoreboard-v1과 같다.
import { customers, PRODUCT_SYS, productMessages, type Mem, type Customer, type Fact, type Msg } from "../scoreboard-v1/common.mts"
import { answerPrompt } from "../modelswap-v2/lib.mts"
export { customers, PRODUCT_SYS }
export type ToolMem = Mem & { created_at?: string; updated_at?: string; order?: number }

/** 옮긴 모습. as-exported 는 scoreboard-v1 시험 1과 글자까지 같다(새로 묻지 않고 그 답을 쓴다). */
export const CONDITIONS = ["mem0-by-id", "langmem-by-id", "mem0-with-timestamps", "transcript"] as const
export type Cond = (typeof CONDITIONS)[number]
const line = (t: string) => `- ${t.replace(/\s+/g, " ").trim()}`

/** 기록을 id(UUID) 순으로 정렬: 가져온 쪽 저장소가 기본 키 순서로 돌려주는 경우. 기록 내용은 한 글자도 바꾸지 않는다. */
export const byId = (mem: ToolMem[]) => [...mem].sort((a, b) => a.id.localeCompare(b.id))
export function recordLines(cond: Cond, tools: Record<string, ToolMem[]>, c: Customer): string {
  if (cond === "mem0-by-id") return byId(tools.mem0.filter((m) => m.customer === c.id)).map((m) => line(m.text)).join("\n")
  if (cond === "langmem-by-id") return byId(tools.langmem.filter((m) => m.customer === c.id)).map((m) => line(m.text)).join("\n")
  if (cond === "mem0-with-timestamps")
    // Mem0 get_all 이 내보내는 created_at 을 그대로 붙인다. 순서는 도구가 돌려준 순서(시험 1과 같음).
    return tools.mem0.filter((m) => m.customer === c.id).map((m) => line(`[created_at ${m.created_at}] ${m.text}`)).join("\n")
  throw new Error("transcript has no record lines")
}
export const recordPrompt = (cond: Cond, tools: Record<string, ToolMem[]>, c: Customer, f: Fact) => answerPrompt(c, recordLines(cond, tools, c), f.question)

/** 고객사가 대화 원본을 보관하는 방식: 옮기기 전과 후에 보내는 메시지가 같다(scoreboard-v1 시험 2와 같은 메시지). */
export const transcriptMessages = (c: Customer, f: Fact): Msg[] => productMessages(c, f)
export const transcriptKey = (c: Customer, f: Fact) => JSON.stringify(transcriptMessages(c, f))
