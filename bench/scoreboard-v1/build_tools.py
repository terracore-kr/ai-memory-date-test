# scoreboard-v1 시험 1 — 도구 기억 만들기 (유료, Codex가 맥에서). 사전 등록: PREREG.md. publicmem-v1/build.py와 같은 코드, 고객만 15명.
# 공개 기억 도구 2개(Mem0 OSS, LangMem)에 같은 대화 90회차(고객 15명 x 6회차)를 순서대로 넣고,
# 각 도구가 저장한 기억을 memory.frozen.json으로 한 번만 얼린다. 다시 만들지 않는다.
# 실행: python3 -I bench/scoreboard-v1/build_tools.py [--mock|--dry-run]
#  - 환경 변수 AI_GATEWAY_API_KEY 필요(값은 출력하지 않는다). Mem0 사용 통계 전송은 끈다(MEM0_TELEMETRY=False).
import hashlib, json, os, sys, tempfile, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
MOCK, DRY = "--mock" in sys.argv, "--dry-run" in sys.argv
SFX = ".mock" if MOCK else ""
os.environ["MEM0_TELEMETRY"] = "False"
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

PIN = {"sessions.json": "8c33c270fdd2ee898f2c97abd6fe0c200c20749f366a45944e82c7e99e791129", "PREREG.md": "6a342aa64b6ccd22e9b1964710d85c1ba170a5461bbd26f3d74421024b803269"}
VERSIONS = {"mem0ai": "2.2.1", "langmem": "0.0.30"}
GATEWAY = "https://ai-gateway.vercel.sh/v1"
LLM, EMB = "openai/gpt-4.1-mini", "openai/text-embedding-3-small"
PRICE = {LLM: (0.4, 1.6), EMB: (0.02, 0.0)}  # $/1M 토큰 (입력, 출력)
CAP = 2.00
# 보수적 상한: 회차마다 LLM 호출 최대 2번, 호출당 입력 6,000·출력 1,500 토큰, 임베딩 호출당 4,000 토큰 최대 8번.
# (publicmem-v1 실측: 회차당 약 $0.0023. 이 상한은 회차당 $0.0102로 4배 넘게 잡았다.)
CALLS_PER_SESSION, IN_MAX, OUT_MAX, EMB_CALLS, EMB_MAX = 2, 6000, 1500, 8, 4000

sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
if not MOCK:
    for rel, h in PIN.items():
        if sha(HERE / rel) != h:
            raise SystemExit(f"{rel} changed after preregistration")
    from importlib.metadata import version
    for pkg, v in VERSIONS.items():
        if version(pkg) != v:
            raise SystemExit(f"{pkg} must be {v} (found {version(pkg)})")

data = json.loads((HERE / "sessions.json").read_text())
n_sessions = sum(len(c["sessions"]) for c in data)
per_tool = n_sessions * (CALLS_PER_SESSION * (IN_MAX * PRICE[LLM][0] + OUT_MAX * PRICE[LLM][1]) + EMB_CALLS * EMB_MAX * PRICE[EMB][0]) / 1e6
bound = per_tool * 2
print(f"build: tools 2, sessions {n_sessions} per tool, conservative bound ${bound:.4f}, cap ${CAP}{' (mock)' if MOCK else ''}")
if bound > CAP and not MOCK:
    raise SystemExit("Cost bound exceeds the ceiling")
if DRY:
    sys.exit(0)

frozen, log = HERE / f"memory.tools{SFX}.json", HERE / f"build-tools{SFX}.jsonl"
if not MOCK and (frozen.exists() or log.exists()):
    raise SystemExit("memory.tools.json or build-tools.jsonl exists. The memory is built once.")
key = os.environ.get("AI_GATEWAY_API_KEY", "mock-key" if MOCK else "")
if not key:
    raise SystemExit("AI Gateway credentials unavailable")
log.write_text("")

import httpx

state = {"tool": None, "customer": None, "session": None, "cost": 0.0, "calls": 0}


def mock_reply(req: httpx.Request) -> dict:
    body = json.loads(req.content or b"{}")
    if req.url.path.endswith("/embeddings"):
        inp = body["input"] if isinstance(body["input"], list) else [body["input"]]
        vec = lambda s: [((hash(s) >> i) & 255) / 255 for i in range(0, 64, 4)] * 96  # 1536차원
        return {"object": "list", "data": [{"object": "embedding", "index": i, "embedding": vec(s)} for i, s in enumerate(inp)], "model": EMB, "usage": {"prompt_tokens": 10, "total_tokens": 10}}
    text = json.dumps(body["messages"])
    users = [l for l in text.split("\\n") if l.startswith("user: ") or l.startswith("User: ")]
    facts = [u.split(": ", 1)[1] for u in users if not u.split(": ", 1)[1].startswith(("Thanks", "Busy", "The weather", "I slept", "Today's"))][:6] or ["User said something."]
    if body.get("tools"):
        calls = [{"id": f"c{i}", "type": "function", "function": {"name": "Memory", "arguments": json.dumps({"content": f})}} for i, f in enumerate(facts)]
        msg = {"role": "assistant", "content": None, "tool_calls": calls}
    else:
        msg = {"role": "assistant", "content": json.dumps({"memory": [{"id": str(i), "text": f} for i, f in enumerate(facts)]})}
    return {"id": "m", "object": "chat.completion", "created": 0, "model": LLM, "choices": [{"index": 0, "message": msg, "finish_reason": "tool_calls" if body.get("tools") else "stop"}], "usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120}}


class Meter(httpx.BaseTransport):
    """모든 요청의 사용량을 build.jsonl에 적고, 비용 상한을 넘으면 멈춘다. 요청 본문·키는 적지 않는다."""
    def __init__(self):
        self.inner = None if MOCK else httpx.HTTPTransport(retries=0)

    def handle_request(self, req: httpx.Request) -> httpx.Response:
        if MOCK:
            resp = httpx.Response(200, json=mock_reply(req), request=req)
        else:
            resp = self.inner.handle_request(req)
            resp.read()
        try:
            j = json.loads(resp.content)
        except Exception:
            j = {}
        u = j.get("usage") or {}
        model = j.get("model") or ""
        is_emb = req.url.path.endswith("/embeddings")
        pin, pout = u.get("prompt_tokens"), (0 if is_emb else u.get("completion_tokens"))
        price = PRICE[EMB] if is_emb else PRICE[LLM]
        usd = None if pin is None or pout is None else (pin * price[0] + pout * price[1]) / 1e6
        finish = None if is_emb else ((j.get("choices") or [{}])[0].get("finish_reason"))
        row = {"tool": state["tool"], "customer": state["customer"], "session": state["session"], "kind": "embed" if is_emb else "chat", "status": resp.status_code, "model": model, "finish": finish, "inT": pin, "outT": pout, "usd": usd, "t": round(time.time(), 3)}
        with log.open("a") as fh:
            fh.write(json.dumps(row) + "\n")
        state["calls"] += 1
        if resp.status_code != 200:
            raise RuntimeError(f"HTTP {resp.status_code} recorded. Stopped.")
        if usd is None:
            raise RuntimeError("Missing token usage. Stopped after recording.")
        state["cost"] += usd
        if state["cost"] > CAP:
            raise RuntimeError("Cost ceiling reached")
        return httpx.Response(resp.status_code, headers={k: v for k, v in resp.headers.items() if k.lower() not in ("content-encoding", "content-length", "transfer-encoding")}, content=resp.content, request=req)


http = httpx.Client(transport=Meter(), timeout=120)
from openai import OpenAI
client = OpenAI(api_key=key, base_url=GATEWAY, http_client=http, max_retries=0)
out = {"tools": {}, "llm": LLM, "embedder": EMB, "sessions": sha(HERE / "sessions.json"), "versions": VERSIONS, "builtOn": time.strftime("%Y-%m-%d")}

# ── 도구 1: Mem0 OSS (기본 설정 + 같은 LLM·임베딩. 저장소는 로컬 Qdrant 파일) ──
state["tool"] = "mem0"
from mem0 import Memory
work = Path(tempfile.mkdtemp(prefix="scoreboard-mem0-"))
m = Memory.from_config({
    "llm": {"provider": "openai", "config": {"model": LLM, "temperature": 0, "openai_base_url": GATEWAY, "api_key": key}},
    "embedder": {"provider": "openai", "config": {"model": EMB, "openai_base_url": GATEWAY, "api_key": key}},
    "vector_store": {"provider": "qdrant", "config": {"path": str(work / "qdrant"), "collection_name": "scoreboard", "embedding_model_dims": 1536, "on_disk": True}},
    "history_db_path": str(work / "history.db"),
})
m.llm.client = client
m.embedding_model.client = client
recs = []
for c in data:
    state["customer"] = c["customer"]
    for s, sess in enumerate(c["sessions"]):
        state["session"] = s
        m.add(sess["messages"], user_id=c["customer"])
    got = m.get_all(filters={"user_id": c["customer"]}, top_k=10000)
    items = got["results"] if isinstance(got, dict) else got
    for it in sorted(items, key=lambda x: (x.get("created_at") or "", x["id"])):
        recs.append({"customer": c["customer"], "id": it["id"], "text": it["memory"], "created_at": it.get("created_at"), "updated_at": it.get("updated_at")})
out["tools"]["mem0"] = recs
print(f"mem0 done: memories {len(recs)}, cost so far ${state['cost']:.5f}")

# ── 도구 2: LangMem (create_memory_manager 기본값: 추가·수정 켬, 삭제 끔) ──
state["tool"] = "langmem"
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage
from langmem import create_memory_manager
llm = ChatOpenAI(model=LLM, temperature=0, base_url=GATEWAY, api_key=key, http_client=http, max_retries=0)
manager = create_memory_manager(llm)
recs = []
for c in data:
    state["customer"] = c["customer"]
    existing = []
    for s, sess in enumerate(c["sessions"]):
        state["session"] = s
        msgs = [HumanMessage(x["content"]) if x["role"] == "user" else AIMessage(x["content"]) for x in sess["messages"]]
        res = manager.invoke({"messages": msgs, "existing": existing})
        existing = [(r.id, r.content) for r in res]
    for i, (mid, content) in enumerate(existing):
        recs.append({"customer": c["customer"], "id": mid, "order": i, "text": getattr(content, "content", str(content))})
out["tools"]["langmem"] = recs
print(f"langmem done: memories {len(recs)}, cost so far ${state['cost']:.5f}")

frozen.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(f"build finished. calls {state['calls']}, cost ${state['cost']:.5f} -> {frozen.name} sha256 {sha(frozen)}")
