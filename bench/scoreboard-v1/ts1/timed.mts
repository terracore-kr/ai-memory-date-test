// ts1: 고객사가 메시지마다 말한 시각을 함께 보내는 경우의 요청. 대화 내용은 시험 2와 같다(회차 날짜 알림 메시지 포함).
import { sessionMessages, type Customer, type Fact } from "../common.mts"
export type TMsg = { role: "user" | "assistant"; content: string; timestamp?: string }
export const timedMessages = (c: Customer, f: Fact): TMsg[] => [...c.sessions.flatMap((d, s) => sessionMessages(c, s).map((m) => ({ ...m, timestamp: d }))), { role: "user", content: f.question }]
