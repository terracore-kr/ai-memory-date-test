// scale-v1(표본 늘리기)의 고정 자료. modelswap-v2/data.mts의 build()·질문·대화 틀을 그대로 쓰고 고객만 새 12명으로 바꿨다. 아래 원래 설명은 2차 것이다.
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
{
"id": "D",
"name": "Priya",
"sessions": [
"2026-01-05",
"2026-01-25",
"2026-02-18",
"2026-03-30",
"2026-04-29",
"2026-06-03"
],
"dog": "Brackwater",
"dog2": "Quarrick",
"cat1": "Dimbleby",
"cat2": "Pargeter",
"company": "Corvantis",
"company2": "Oxenhope",
"town": "Barrowden",
"town2": "Ormskirk",
"gym": "Granitefold",
"gym2": "Sapphirelane",
"nick": "Pree",
"oldStreet": "Ashgrove",
"newStreet": "Marigold",
"oldDay": "Mondays",
"newDay": "Thursdays",
"oldTrainer": "Alaric",
"newTrainer": "Magnus",
"oldRace": "Ambermoor",
"newRace": "Mardale",
"t": [
"the Alder swimming club",
"a pottery course at Moorcroft",
"a hiking trip to Aysgarth",
"the Nantwich choir"
],
"tc": [
"swim",
"pottery",
"hiking",
"choir"
]
},
{
"id": "E",
"name": "Tomas",
"sessions": [
"2026-01-09",
"2026-01-30",
"2026-02-26",
"2026-04-08",
"2026-05-13",
"2026-06-24"
],
"dog": "Fenwold",
"dog2": "Rushmere",
"cat1": "Elsworth",
"cat2": "Quenby",
"company": "Delmara",
"company2": "Pemberton",
"town": "Carnforth",
"town2": "Pickering",
"gym": "Hollyforge",
"gym2": "Topazwell",
"nick": "Tom",
"oldStreet": "Beckett",
"newStreet": "Nightingale",
"oldDay": "Tuesdays",
"newDay": "Fridays",
"oldTrainer": "Benedikt",
"newTrainer": "Noemi",
"oldRace": "Bellhaven",
"newRace": "Nidderdale",
"t": [
"the Brindle cycling group",
"a woodwork class at Nunthorpe",
"a fishing weekend to Blencathra",
"the Otterburn book circle"
],
"tc": [
"cycling",
"woodwork",
"fishing",
"book"
]
},
{
"id": "F",
"name": "Ines",
"sessions": [
"2026-01-13",
"2026-02-04",
"2026-03-06",
"2026-04-17",
"2026-05-27",
"2026-07-02"
],
"dog": "Gristle",
"dog2": "Saltash",
"cat1": "Farnaby",
"cat2": "Rosamund",
"company": "Elsinore",
"company2": "Quillfeather",
"town": "Dunsfold",
"town2": "Quorndon",
"gym": "Irongate",
"gym2": "Umberfield",
"nick": "Nessa",
"oldStreet": "Copperfield",
"newStreet": "Orchard",
"oldDay": "Wednesdays",
"newDay": "Saturdays",
"oldTrainer": "Cosima",
"newTrainer": "Octavia",
"oldRace": "Cragside",
"newRace": "Ossett",
"t": [
"the Cresswell rowing crew",
"a weaving workshop at Overton",
"a camping trip to Coniston",
"the Penrith chess club"
],
"tc": [
"rowing",
"weaving",
"camping",
"chess"
]
},
{
"id": "G",
"name": "Rafael",
"sessions": [
"2026-01-17",
"2026-02-09",
"2026-03-07",
"2026-04-19",
"2026-05-23",
"2026-07-05"
],
"dog": "Halloran",
"dog2": "Tamberlane",
"cat1": "Gilroy",
"cat2": "Sedgwick",
"company": "Falkreth",
"company2": "Ravenglass",
"town": "Embleton",
"town2": "Rothbury",
"gym": "Jasperline",
"gym2": "Vermeil",
"nick": "Rafa",
"oldStreet": "Dewberry",
"newStreet": "Primrose",
"oldDay": "Thursdays",
"newDay": "Sundays",
"oldTrainer": "Desmond",
"newTrainer": "Perrin",
"oldRace": "Duncombe",
"newRace": "Pateley",
"t": [
"the Dovecote running club",
"a painting course at Polperro",
"a sailing trip to Dentdale",
"the Quantock film society"
],
"tc": [
"running",
"painting",
"sailing",
"film"
]
},
{
"id": "H",
"name": "Keiko",
"sessions": [
"2026-01-21",
"2026-02-14",
"2026-03-15",
"2026-04-28",
"2026-06-06",
"2026-07-13"
],
"dog": "Ivorydale",
"dog2": "Umbridge",
"cat1": "Hartigan",
"cat2": "Thurlow",
"company": "Galloway",
"company2": "Stonehaven",
"town": "Fairlight",
"town2": "Sedbergh",
"gym": "Kestrelpeak",
"gym2": "Willowbank",
"nick": "Kei",
"oldStreet": "Elmhurst",
"newStreet": "Quince",
"oldDay": "Fridays",
"newDay": "Mondays",
"oldTrainer": "Elowen",
"newTrainer": "Quentin",
"oldRace": "Eskdale",
"newRace": "Quernmore",
"t": [
"the Eastwood swimming club",
"a pottery course at Quarndon",
"a hiking trip to Ennerdale",
"the Ribblehead choir"
],
"tc": [
"swim",
"pottery",
"hiking",
"choir"
]
},
{
"id": "I",
"name": "Oskar",
"sessions": [
"2026-01-25",
"2026-02-14",
"2026-03-11",
"2026-04-25",
"2026-05-28",
"2026-07-11"
],
"dog": "Juniperon",
"dog2": "Vallory",
"cat1": "Ingleby",
"cat2": "Underhill",
"company": "Hestercombe",
"company2": "Thornbury",
"town": "Grassington",
"town2": "Tenbury",
"gym": "Limeworks",
"gym2": "Xanthos",
"nick": "Ozzy",
"oldStreet": "Foxglove",
"newStreet": "Rowan",
"oldDay": "Saturdays",
"newDay": "Tuesdays",
"oldTrainer": "Florian",
"newTrainer": "Rosalind",
"oldRace": "Farndale",
"newRace": "Rosedale",
"t": [
"the Fallowfield cycling group",
"a woodwork class at Redbrook",
"a fishing weekend to Fleetwith",
"the Sheringham book circle"
],
"tc": [
"cycling",
"woodwork",
"fishing",
"book"
]
},
{
"id": "J",
"name": "Leila",
"sessions": [
"2026-01-29",
"2026-02-19",
"2026-03-19",
"2026-05-04",
"2026-06-11",
"2026-07-19"
],
"dog": "Kettlebeck",
"dog2": "Wendhurst",
"cat1": "Jessamy",
"cat2": "Verity",
"company": "Ironmonger",
"company2": "Uffington",
"town": "Hawkshead",
"town2": "Ulverston",
"gym": "Marblehall",
"gym2": "Yewtree",
"nick": "Lee",
"oldStreet": "Gorsefield",
"newStreet": "Sycamore",
"oldDay": "Sundays",
"newDay": "Wednesdays",
"oldTrainer": "Gideon",
"newTrainer": "Severin",
"oldRace": "Glaisdale",
"newRace": "Swaledale",
"t": [
"the Glenridding rowing crew",
"a weaving workshop at Shalford",
"a camping trip to Grisedale",
"the Thirsk chess club"
],
"tc": [
"rowing",
"weaving",
"camping",
"chess"
]
},
{
"id": "K",
"name": "Anders",
"sessions": [
"2026-02-02",
"2026-02-24",
"2026-03-20",
"2026-05-06",
"2026-06-07",
"2026-07-22"
],
"dog": "Larkspurr",
"dog2": "Yarrowby",
"cat1": "Kilbride",
"cat2": "Wycliffe",
"company": "Jarrowfield",
"company2": "Vexley",
"town": "Ilkley",
"town2": "Wetherby",
"gym": "Nickelbay",
"gym2": "Zincworks",
"nick": "Andy",
"oldStreet": "Heathcote",
"newStreet": "Teasel",
"oldDay": "Mondays",
"newDay": "Thursdays",
"oldTrainer": "Henrike",
"newTrainer": "Theodora",
"oldRace": "Hartside",
"newRace": "Troutbeck",
"t": [
"the Harrowgate running club",
"a painting course at Tilbury",
"a sailing trip to Helvellyn",
"the Uppingham film society"
],
"tc": [
"running",
"painting",
"sailing",
"film"
]
},
{
"id": "L",
"name": "Sunita",
"sessions": [
"2026-02-06",
"2026-03-01",
"2026-03-28",
"2026-05-15",
"2026-06-21",
"2026-07-30"
],
"dog": "Mossgrave",
"dog2": "Zennor",
"cat1": "Lockyer",
"cat2": "Yelland",
"company": "Kingsmead",
"company2": "Whitcombe",
"town": "Kirkwhelpington",
"town2": "Yarmouth",
"gym": "Onyxridge",
"gym2": "Amberline",
"nick": "Sunny",
"oldStreet": "Ivyleaf",
"newStreet": "Upland",
"oldDay": "Tuesdays",
"newDay": "Fridays",
"oldTrainer": "Isolde",
"newTrainer": "Ulric",
"oldRace": "Ingleborough",
"newRace": "Ullswater",
"t": [
"the Inchbrook swimming club",
"a pottery course at Upwell",
"a hiking trip to Ingleton",
"the Ventnor choir"
],
"tc": [
"swim",
"pottery",
"hiking",
"choir"
]
},
{
"id": "M",
"name": "Bruno",
"sessions": [
"2026-02-10",
"2026-03-06",
"2026-04-05",
"2026-05-15",
"2026-06-15",
"2026-07-31"
],
"dog": "Nettlecombe",
"dog2": "Ashcombe",
"cat1": "Merriweather",
"cat2": "Zephyrine",
"company": "Lowestoft",
"company2": "Yeadon",
"town": "Lindisfarne",
"town2": "Zeals",
"gym": "Pewterhouse",
"gym2": "Basaltway",
"nick": "Bru",
"oldStreet": "Juniper",
"newStreet": "Verbena",
"oldDay": "Wednesdays",
"newDay": "Saturdays",
"oldTrainer": "Jasper",
"newTrainer": "Valentina",
"oldRace": "Jervaulx",
"newRace": "Wensleydale",
"t": [
"the Jesmond cycling group",
"a woodwork class at Vowchurch",
"a fishing weekend to Kentmere",
"the Whitstable book circle"
],
"tc": [
"cycling",
"woodwork",
"fishing",
"book"
]
},
{
"id": "N",
"name": "Yara",
"sessions": [
"2026-02-14",
"2026-03-06",
"2026-04-01",
"2026-05-12",
"2026-06-17",
"2026-07-27"
],
"dog": "Oakhurst",
"dog2": "Birchley",
"cat1": "Norbury",
"cat2": "Aldridge",
"company": "Marchbank",
"company2": "Zelmont",
"town": "Malham",
"town2": "Alnmouth",
"gym": "Quartzside",
"gym2": "Cobaltyard",
"nick": "Yaya",
"oldStreet": "Kingfisher",
"newStreet": "Wisteria",
"oldDay": "Thursdays",
"newDay": "Sundays",
"oldTrainer": "Katrin",
"newTrainer": "Wilhelmina",
"oldRace": "Kildale",
"newRace": "Yewdale",
"t": [
"the Kelsall rowing crew",
"a weaving workshop at Wickham",
"a camping trip to Loweswater",
"the Yatton chess club"
],
"tc": [
"rowing",
"weaving",
"camping",
"chess"
]
},
{
"id": "O",
"name": "Callum",
"sessions": [
"2026-02-18",
"2026-03-11",
"2026-04-09",
"2026-05-21",
"2026-06-20",
"2026-08-06"
],
"dog": "Pendragon",
"dog2": "Coldridge",
"cat1": "Ottoline",
"cat2": "Blandford",
"company": "Northcote",
"company2": "Ambleside",
"town": "Nethercott",
"town2": "Bampton",
"gym": "Rubystone",
"gym2": "Dolomite",
"nick": "Cal",
"oldStreet": "Laburnum",
"newStreet": "Yarrow",
"oldDay": "Fridays",
"newDay": "Mondays",
"oldTrainer": "Leopold",
"newTrainer": "Xavier",
"oldRace": "Langdale",
"newRace": "Zetland",
"t": [
"the Lindley running club",
"a painting course at Yelverton",
"a sailing trip to Mungrisdale",
"the Zennor film society"
],
"tc": [
"running",
"painting",
"sailing",
"film"
]
}
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
if (allFacts.length !== 24 * seeds.length) throw new Error("expected 24 questions per customer")

/** 회차 하나의 대화 원문(1단계). 사용자 말 사이에 고정된 잡담을 끼운다. */
const FILLER = ["Thanks, that helps.", "Busy week, but I'm keeping up.", "The weather has been rough for training.", "I slept badly last night."]
export function sessionText(c: Customer, s: number): string {
  const lines = c.says.filter((x) => x.session === s).map((x) => x.text)
  const out: string[] = []
  lines.forEach((t, i) => { out.push(`User: ${t}`); out.push(`Assistant: Noted.`); if (i % 2 === 0) out.push(`User: ${FILLER[(i + s) % FILLER.length]}`) })
  return out.join("\n")
}
