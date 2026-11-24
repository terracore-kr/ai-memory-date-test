// 도구(Mem0·LangMem)에 넣을 메시지를 sessions.json으로 쓴다(무료). 실행: npx tsx bench/scoreboard-v1/export-sessions.mts > bench/scoreboard-v1/sessions.json
import { customers, sessionMessages } from "./common.mts"
console.log(JSON.stringify(customers.map((c) => ({ customer: c.id, name: c.name, sessions: c.sessions.map((date, s) => ({ date, messages: sessionMessages(c, s) })) })), null, 1))
