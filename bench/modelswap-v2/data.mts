// 모델·저장소 교체 시범 실험 2차(15장)의 고정 자료. 전부 지어낸 고객·사실이다. 모델 호출 없음.
// 1차(modelswap-v1)에서 드러난 두 약점을 고쳤다:
//   (1) 정정 문장이 옛 값을 언급하지 않는다("I live on Wexcombe Avenue."뿐). 날짜 없이는 어느 쪽이 새 값인지 글만으로 알 수 없다.
//   (2) 기준선이 만점이 되지 않도록 어려운 유형을 넣었다: 남의 정보가 섞인 질문, 조건을 상황에 적용, 먼저 말한 것, 날짜 사이 일수, 세기, 답이 없는 질문.
// 질문 72개 = 고객 3명 × 24개.
export type Kind = "tokens" | "date" | "number" | "yesno" | "unknown"
export type FType = "distractor" | "apply" | "corrected" | "date" | "order" | "days" | "count" | "none"
export type Ev = { marker: string; date?: string } // 근거 표지(소문자). date가 있으면 그 날짜가 같은 줄에 있어야 근거로 본다.
export type Fact = {
  id: string
  type: FType
  kind: Kind
  question: string
  must: string[][] // tokens: 각 묶음에서 하나 이상 있어야 정답
  mustNot?: string[] // tokens·unknown: 있으면 오답(tokens는 정답 낱말이 먼저 나오면 정답)
  date?: string // kind=date의 정답
  number?: number // kind=number의 정답
  yes?: boolean // kind=yesno의 정답
  ev: Ev[] // 이 질문에 필요한 근거 전부
  oldMarker?: string // 정정 문항: 옛 값의 표지. 날짜 없는 글에 옛 값이 같이 있으면 근거가 불완전하다.
}
export type Customer = { id: string; name: string; sessions: string[]; says: { session: number; text: string }[]; facts: Fact[] }

type Seed = {
  id: string; name: string; sessions: string[]
  dog: string; dog2: string; cat1: string; cat2: string; company: string; company2: string; town: string; town2: string; gym: string; gym2: string
  nick: string; oldStreet: string; newStreet: string; oldDay: string; newDay: string; oldTrainer: string; newTrainer: string; oldRace: string; newRace: string
  t: [string, string, string, string] // 주제 4개. 말한 회차는 1, 2, 4, 5
  tc: [string, string, string, string] // 각 주제를 가리키는 보통 낱말(답이 고유 이름 없이 나올 때를 위해)
}
const seeds: Seed[] = [
  { id: "A", name: "Dana", sessions: ["2026-01-12", "2026-02-03", "2026-03-04", "2026-04-21", "2026-06-09", "2026-07-15"],
    dog: "Quillon", dog2: "Marrock", cat1: "Fennimore", cat2: "Sorrel", company: "Brindlemoor", company2: "Castellane", town: "Harrowick", town2: "Ostermead", gym: "Ironbark", gym2: "Greywether",
    nick: "Dee", oldStreet: "Tamarisk", newStreet: "Wexcombe", oldDay: "Tuesdays", newDay: "Thursdays", oldTrainer: "Corwin", newTrainer: "Ysolde", oldRace: "Fenrow", newRace: "Kestrelgate",
    t: ["the Marlowe swim club", "a pottery course at Dunmere", "a hiking trip to Calloway Ridge", "the Pellam choir"], tc: ["swim", "pottery", "hiking", "choir"] },
  { id: "B", name: "Luis", sessions: ["2026-01-20", "2026-02-17", "2026-03-25", "2026-05-06", "2026-06-23", "2026-08-11"],
    dog: "Brannoch", dog2: "Tolliver", cat1: "Pimlico", cat2: "Hazeldine", company: "Halvergate", company2: "Rookhope", town: "Eskerby", town2: "Wintringham", gym: "Flintlock", gym2: "Sandalwood",
    nick: "Lu", oldStreet: "Cardew", newStreet: "Pennistone", oldDay: "Mondays", newDay: "Fridays", oldTrainer: "Aldous", newTrainer: "Renske", oldRace: "Withybrook", newRace: "Sablemere",
    t: ["the Orrin cycling group", "a woodwork class at Thackley", "a fishing weekend at Lake Morwen", "the Hesketh book circle"], tc: ["cycling", "woodwork", "fishing", "book"] },
  { id: "C", name: "Mina", sessions: ["2026-02-02", "2026-02-26", "2026-04-08", "2026-05-19", "2026-07-01", "2026-08-27"],
    dog: "Thistlewick", dog2: "Garrick", cat1: "Ludovic", cat2: "Primrose", company: "Garrowby", company2: "Melchester", town: "Luddenmoor", town2: "Ainsdale", gym: "Stonecrop", gym2: "Copperhill",
    nick: "Mimi", oldStreet: "Hollin", newStreet: "Averill", oldDay: "Wednesdays", newDay: "Saturdays", oldTrainer: "Bertrand", newTrainer: "Liesel", oldRace: "Corbenic", newRace: "Dunholm",
    t: ["the Vasey rowing crew", "a weaving workshop at Kirkby", "a camping trip to Elder Fell", "the Stannard chess club"], tc: ["rowing", "weaving", "camping", "chess"] },
]
const lc = (s: string) => s.toLowerCase()
const days = (a: string, b: string) => Math.round(Math.abs(Date.parse(b) - Date.parse(a)) / 86_400_000)
const topicKey = (topic: string) => lc(topic.split(" ").find((w) => /^[A-Z]/.test(w))!)

function build(s: Seed): Customer {
  const n = s.name, D = s.sessions, tS = [1, 2, 4, 5], tk = s.t.map(topicKey)
  const says: Customer["says"] = [
    { session: 0, text: `My dog is called ${s.dog}.` },
    { session: 0, text: `I work at ${s.company}.` },
    { session: 0, text: `I live on ${s.oldStreet} Street.` },
    { session: 1, text: `I grew up in a town called ${s.town}.` },
    { session: 1, text: "When I fly for work I want an aisle seat, but on holiday flights I want the window." },
    { session: 1, text: `Book my sessions on ${s.oldDay}.` },
    { session: 1, text: `I joined ${s.t[0]} today.` },
    { session: 2, text: `My brother's dog is called ${s.dog2}.` },
    { session: 2, text: `The gym I go to is called ${s.gym}.` },
    { session: 2, text: "Send me reminders only on weekdays, never at the weekend." },
    { session: 2, text: `My trainer is ${s.oldTrainer}.` },
    { session: 2, text: `I signed up for ${s.t[1]}.` },
    { session: 3, text: `My partner works at ${s.company2}.` },
    { session: 3, text: `I also have two cats, ${s.cat1} and ${s.cat2}.` },
    { session: 3, text: "I eat meat at home, but when I'm travelling I eat vegetarian." },
    { session: 3, text: `I'm training for the ${s.oldRace} run.` },
    { session: 4, text: `My mother grew up in ${s.town2}.` },
    { session: 4, text: `Call me ${s.nick} in chat, but use ${n} on anything formal.` },
    { session: 4, text: `I live on ${s.newStreet} Avenue.` },
    { session: 4, text: `I've booked ${s.t[2]}.` },
    { session: 5, text: `My sister goes to a gym called ${s.gym2}.` },
    { session: 5, text: `Book my sessions on ${s.newDay}.` },
    { session: 5, text: `My trainer is ${s.newTrainer}.` },
    { session: 5, text: `I'm training for the ${s.newRace} run.` },
    { session: 5, text: `I joined ${s.t[3]} today.` },
  ]
  const f: Fact[] = []
  const add = (x: Omit<Fact, "id">) => f.push({ ...x, id: `${s.id}${String(f.length + 1).padStart(2, "0")}` })
  const day1 = (d: string) => lc(d.slice(0, -1))
  // 남의 정보가 섞인 질문 4
  add({ type: "distractor", kind: "tokens", question: `What is ${n}'s own dog called?`, must: [[lc(s.dog)]], mustNot: [lc(s.dog2)], ev: [{ marker: lc(s.dog) }] })
  add({ type: "distractor", kind: "tokens", question: `Which company does ${n} work at?`, must: [[lc(s.company)]], mustNot: [lc(s.company2)], ev: [{ marker: lc(s.company) }] })
  add({ type: "distractor", kind: "tokens", question: `Which town did ${n} grow up in?`, must: [[lc(s.town)]], mustNot: [lc(s.town2)], ev: [{ marker: lc(s.town) }] })
  add({ type: "distractor", kind: "tokens", question: `What is the name of the gym ${n} goes to?`, must: [[lc(s.gym)]], mustNot: [lc(s.gym2)], ev: [{ marker: lc(s.gym) }] })
  // 조건을 상황에 적용 4
  add({ type: "apply", kind: "tokens", question: `${n} is flying to a conference for work. Which seat should be booked? Answer aisle or window.`, must: [["aisle"]], mustNot: ["window"], ev: [{ marker: "aisle" }] })
  add({ type: "apply", kind: "yesno", question: `It is Saturday. Should ${n} get a reminder today? Answer yes or no.`, must: [], yes: false, ev: [{ marker: "weekday" }] })
  add({ type: "apply", kind: "yesno", question: `${n} is eating at home tonight. Is a meat dish acceptable? Answer yes or no.`, must: [], yes: true, ev: [{ marker: "vegetarian" }] })
  add({ type: "apply", kind: "tokens", question: `Which name goes on a formal letter to this customer? Answer with the name only.`, must: [[lc(n)]], mustNot: [lc(s.nick)], ev: [{ marker: lc(s.nick) }] })
  // 정정 4 (새 문장이 옛 값을 언급하지 않는다)
  add({ type: "corrected", kind: "tokens", question: `Which street or avenue does ${n} live on now?`, must: [[lc(s.newStreet)]], mustNot: [lc(s.oldStreet)], ev: [{ marker: lc(s.newStreet) }], oldMarker: lc(s.oldStreet) })
  add({ type: "corrected", kind: "tokens", question: `On which day should ${n}'s sessions be booked now?`, must: [[lc(s.newDay), day1(s.newDay)]], mustNot: [lc(s.oldDay), day1(s.oldDay)], ev: [{ marker: day1(s.newDay) }], oldMarker: day1(s.oldDay) })
  add({ type: "corrected", kind: "tokens", question: `Who is ${n}'s trainer now?`, must: [[lc(s.newTrainer)]], mustNot: [lc(s.oldTrainer)], ev: [{ marker: lc(s.newTrainer) }], oldMarker: lc(s.oldTrainer) })
  add({ type: "corrected", kind: "tokens", question: `Which run is ${n} training for now?`, must: [[lc(s.newRace)]], mustNot: [lc(s.oldRace)], ev: [{ marker: lc(s.newRace) }], oldMarker: lc(s.oldRace) })
  // 말한 날짜 2
  add({ type: "date", kind: "date", question: `On what date did ${n} tell the assistant about ${s.t[0]}? Answer with the date.`, must: [], date: D[tS[0]], ev: [{ marker: tk[0], date: D[tS[0]] }] })
  add({ type: "date", kind: "date", question: `On what date did ${n} tell the assistant about ${s.t[2]}? Answer with the date.`, must: [], date: D[tS[2]], ev: [{ marker: tk[2], date: D[tS[2]] }] })
  // 먼저 말한 것 2
  add({ type: "order", kind: "tokens", question: `Which did ${n} tell the assistant about first: ${s.t[3]} or ${s.t[1]}? Answer with that one only.`, must: [[tk[1], s.tc[1]]], mustNot: [tk[3], s.tc[3]], ev: [{ marker: tk[1], date: D[tS[1]] }, { marker: tk[3], date: D[tS[3]] }] })
  add({ type: "order", kind: "tokens", question: `Which did ${n} tell the assistant about first: ${s.t[2]} or ${s.t[0]}? Answer with that one only.`, must: [[tk[0], s.tc[0]]], mustNot: [tk[2], s.tc[2]], ev: [{ marker: tk[0], date: D[tS[0]] }, { marker: tk[2], date: D[tS[2]] }] })
  // 날짜 사이 일수 2
  add({ type: "days", kind: "number", question: `How many days passed between the day ${n} told the assistant about ${s.t[0]} and the day ${n} told the assistant about ${s.t[3]}? Answer with a number only.`, must: [], number: days(D[tS[0]], D[tS[3]]), ev: [{ marker: tk[0], date: D[tS[0]] }, { marker: tk[3], date: D[tS[3]] }] })
  add({ type: "days", kind: "number", question: `How many days passed between the day ${n} told the assistant about ${s.t[1]} and the day ${n} told the assistant about ${s.t[2]}? Answer with a number only.`, must: [], number: days(D[tS[1]], D[tS[2]]), ev: [{ marker: tk[1], date: D[tS[1]] }, { marker: tk[2], date: D[tS[2]] }] })
  // 세기 3
  add({ type: "count", kind: "number", question: `How many clubs, courses, trips and groups in total has ${n} told the assistant about joining, signing up for or booking? Answer with a number only.`, must: [], number: 4, ev: tk.map((marker) => ({ marker })) })
  add({ type: "count", kind: "number", question: `How many different trainers has ${n} had, counting the current one? Answer with a number only.`, must: [], number: 2, ev: [{ marker: lc(s.oldTrainer) }, { marker: lc(s.newTrainer) }] })
  add({ type: "count", kind: "number", question: `How many pets does ${n} have in total? Answer with a number only.`, must: [], number: 3, ev: [{ marker: lc(s.dog) }, { marker: lc(s.cat1) }, { marker: lc(s.cat2) }] })
  // 답이 없는 질문 3 (기억에 없으므로 unknown이 정답)
  add({ type: "none", kind: "unknown", question: `What is ${n}'s brother's cat called?`, must: [], mustNot: [lc(s.dog2), lc(s.cat1), lc(s.cat2), lc(s.dog)], ev: [] })
  add({ type: "none", kind: "unknown", question: `Which company did ${n} work at before ${s.company}?`, must: [], mustNot: [lc(s.company2)], ev: [] })
  add({ type: "none", kind: "unknown", question: `What is the name of ${n}'s dentist?`, must: [], mustNot: [lc(s.oldTrainer), lc(s.newTrainer)], ev: [] })
  return { id: s.id, name: n, sessions: s.sessions, says, facts: f }
}
export const customers: Customer[] = seeds.map(build)
export const allFacts = customers.flatMap((c) => c.facts.map((f) => ({ ...f, customer: c.id })))
if (allFacts.length !== 72) throw new Error("expected 72 questions")

/** 회차 하나의 대화 원문(1단계). 사용자 말 사이에 고정된 잡담을 끼운다. */
const FILLER = ["Thanks, that helps.", "Busy week, but I'm keeping up.", "The weather has been rough for training.", "I slept badly last night."]
export function sessionText(c: Customer, s: number): string {
  const lines = c.says.filter((x) => x.session === s).map((x) => x.text)
  const out: string[] = []
  lines.forEach((t, i) => { out.push(`User: ${t}`); out.push(`Assistant: Noted.`); if (i % 2 === 0) out.push(`User: ${FILLER[(i + s) % FILLER.length]}`) })
  return out.join("\n")
}
