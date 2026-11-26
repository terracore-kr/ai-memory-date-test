# AI Memory Date Test

Does an AI memory system remember when something was said, not just what?

15 synthetic customers, 360 questions covering corrections, dates, order, counting, and questions with no answer. Predictions were recorded before each corresponding run, including the ones that turned out wrong. Raw model answers and scoring code let you re-score the results or run the same questions on your own memory system.

**What this is not.** It is not a ranking of memory products. It is not an independent evaluation: the test was written and run by the Belcore team, and Belcore is one of the systems tested. A passing score is not a security or compliance result.

## Test your own memory system

You need Node.js 22 or newer. No install step: `npx` fetches what it needs.

1. **Check the harness (free).** This uses an adapter that always answers "unknown".
   ```sh
   npx tsx quickstart/run.mts
   npx tsx quickstart/score.mts quickstart/answers-echo-*.jsonl
   ```
2. **Connect your system.** Edit [`quickstart/adapter.mts`](quickstart/adapter.mts). You write three functions: `reset`, `ingest` (called once per session, in date order; every message has a timestamp) and `answer` (returns plain text, or "unknown").
3. **Estimate, then run.**
   ```sh
   ADAPTER=mine npx tsx quickstart/run.mts --dry-run
   ADAPTER=mine npx tsx quickstart/run.mts
   npx tsx quickstart/score.mts quickstart/answers-mine-*.jsonl
   ```
   Each question is asked three times and scored by majority. Use `--customers A,B` to try a small subset first.

For a reference point, `ADAPTER=full-transcript` sends the whole conversation with every question through any OpenAI-compatible endpoint (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `MODEL`). The dry run prints its estimated cost (about $0.71 with gpt-4.1-mini).

The scorer prints the three counting questions separately. Two of them ("how many trainers, counting the current one" and "how many clubs, courses, trips and groups") are ambiguous and drive most counting errors; read the counting row with that in mind.

To share a score, open a [results issue](../../issues/new?template=submit-results.yml). Please do not rerun until you get a better number.

The two tables measure different things. The memory comparison uses the same answer model for each store. The Belcore API test measures the production API end to end. Each score is a majority vote over three answers per question.

## Memory comparison

| Measure | Mem0 OSS 2.2.1 | LangMem 0.0.30 | Date-preserving experimental store |
|---|---:|---:|---:|
| Overall | 292/360 | 290/360 | 329/360 |
| Date said | 9/30 | 24/30 | 30/30 |
| Corrected facts | 57/60 | 45/60 | 60/60 |
| Days between | 2/30 | 6/30 | 15/30 |
| Counting | 34/45 | 34/45 | 32/45 |

These are results from one memory build per system, with a shared answer model and these specific versions. See [trial 1 results](bench/scoreboard-v1/RESULT-memory.txt).

## Belcore API

| Measure | Initial trial 2 | fix2, no message timestamps | ts2, timestamps | ts3, timestamps |
|---|---:|---:|---:|---:|
| Overall | 287/360 | 299/360 | 312/360 | 290/360 |
| Date said | 0/30 | 14/30 | 30/30 | 30/30 |
| Corrected facts | 60/60 | 60/60 | 60/60 | 60/60 |
| Days between | 0/30 | 0/30 | 16/30 | 0/30 |
| Counting | 39/45 | 38/45 | 15/45 | 19/45 |

The initial run exposed a date-handling defect in the product. Subsequent runs changed the product and reused the same synthetic test questions. The ts3 date and correction scores were high, and overall accuracy, interval arithmetic, and counting fell short of the preregistered expectations. ts3 had 0 server errors in 1,080 full-run requests. ts1 stopped at 972 recorded answers with six HTTP 502 errors. It has no final score. After reviewing ts3, we restored the production deployment used for ts2. The archived scores are unchanged.

See [initial results](bench/scoreboard-v1/RESULT-product.txt), [fix2](bench/scoreboard-v1/fix2/RESULT.txt), [ts2](bench/scoreboard-v1/ts2/RESULT.txt), and [ts3](bench/scoreboard-v1/ts3/RESULT.txt). The historical ts3 result title retains an earlier version label. The [ts3 preregistration](bench/scoreboard-v1/ts3/PREREG.md) records what the final run measured.

## Re-score offline

Use Node.js 22 or newer. These commands read saved answers and need no model credentials.

```sh
npx tsx bench/scoreboard-v1/score-memory.mts
npx tsx bench/scoreboard-v1/score-product.mts
npx tsx bench/scoreboard-v1/fix2/score.mts
npx tsx bench/scoreboard-v1/ts2/score.mts
npx tsx bench/scoreboard-v1/ts3/score.mts
```

The portable memory scorer reproduces answer scores and answer-based predictions. The original trial 1 result also records an audit of frozen memories and prompt inputs. The experimental store's construction code and frozen store are withheld. Preregistration copies omit internal links and implementation details. Predictions, scoring criteria, and recorded results are retained.

## Run a new test

- The [synthetic conversations](bench/scoreboard-v1/sessions.json) and questions in [dataset A–C](bench/modelswap-v2/data.mts) and [dataset D–O](bench/scale-v1/data.mts) constitute the test.
- The [Mem0 and LangMem builder](bench/scoreboard-v1/build_tools.py) uses Python 3.10+, `mem0ai==2.2.1`, `langmem==0.0.30`, and `langchain-openai`. Run paid experiments in a fresh copy so the original artifacts are preserved. Use a dry run before making model calls. [Open-tool answer runner](bench/scoreboard-v1/run-memory.mts) accepts `--dry-run` and uses the included Mem0/LangMem frozen output. The runners use `tsx`, `js-tiktoken`, and the `ai` SDK.
- The [initial API runner](bench/scoreboard-v1/run-product.mts) and [ts3 runner](bench/scoreboard-v1/ts3/run.mts) send the test to an API. Use your own test key through `BELCORE_API_KEY`. Historical variants document request shapes and scoring. A live API replay can measure today's deployment.

MIT licensed. See [LICENSE](LICENSE).
