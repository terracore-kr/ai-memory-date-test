# scoreboard-v1 ts3 — 날짜를 바뀌는 곳에만 붙인 뒤 다시 잰 제품 측정 — 사전 등록

작성: Claude, 2026-11-23. ts3 결과를 보기 전에 쓴 문서다. 작성 시점에 ts3 호출은 0회다.
비용 승인: 5절 금액으로 대표님께 따로 받는다. 승인 전에는 돌리지 않는다.

## 0. 앞선 결과와의 관계 (숨기지 않는다)

- ts2(메시지마다 날짜를 내용 앞에 붙인 v3, 백업 배포 후): 312/360. 말한 날짜 30/30, 일수 16/30이었지만 **세기 15/45**(시각 없이 fix2는 38/45). 판정 T5 틀림. 세기 오답은 거의 모두 실제보다 많이 센 것(트레이너 2 → 3, 활동 4 → 5~7).
- 그 결과를 본 뒤에 제품을 고쳤다(v4). 결과는 "세기 하락을 보고 고친 뒤 같은 시험지로 잰 것"이라고 쓴다. 독립 검증이 아니다.
- ts2 결과는 v3의 결과로 그대로 남긴다.

## 1. 바뀌는 것

[Product implementation detail omitted.]
[Product implementation detail omitted.]
[Product implementation detail omitted.]

## 2. 실행 규칙 (ts2와 같음)

- 예비 실행: 잘못된 timestamp 확인 요청 3개가 모두 400. 고객 A 24문항 1회. 서버 오류 1건까지 허용, 나머지 조건은 정상 응답 전부.
- 전체 실행: 서버 오류는 오답으로 세고 계속. 6건 이상이면 멈추고 점수를 내지 않는다. 4xx는 바로 멈춤. 재시도 0.
- 멈추면 다시 돌리지 않는다.

## 3. 실행 (Codex, 맥)

1. Codex 패치를 현재 운영 소스에 적용(바뀌는 파일 4개). 단위 시험 → 미리보기 → 시각 없는 호출 1회·시각 포함 호출 1회 정상 확인 → 운영 배포.
2. 새 시험용 키. `ts3/run.mts pilot` → 통과하면 `full` → `ts3/score.mts > ts3/RESULT.txt`. 키 폐기.

## 4. 예측과 판정 (결과 전 고정)

| 판정 | 내용 | 예상 |
|---|---|---|
| T1 | 확인 요청 3개 400, 예비 실행 통과 | 맞음 |
| T2 | 정상 응답 모두 장기기억 경로 | 맞음 |
| T3 | "말한 날짜" 30문항 다수결 정답 24개 이상 | 맞음 (확신 중간. 날짜가 줄마다 붙지 않으니 v3보다 떨어질 수 있다) |
| T4 | "날짜 사이 일수" 30문항 다수결 정답 5개 이상 | 맞음 (확신 낮음) |
| T5 | 날짜·일수를 뺀 6유형 합계(300)가 fix2의 285보다 흔들림 폭(max(3, 회차 간 차이)) 넘게 낮지 않다 | 맞음 |
| T6 | "세기" 45문항 다수결 정답 33개 이상 | 맞음 |

예측이 틀려도 틀린 대로 적는다. 결과를 보고 설정을 바꿔 다시 돌리지 않는다.

## 5. 비용

예비 24회 상한 $0.10, 전체 1,080회 멈춤 상한 $1.50(ts2 실측 약 $0.65, v4는 입력이 짧아져 그보다 적을 것으로 본다. 임베딩·백업 호출 제외). 합계 최대 $1.60.

## 6. 변경 기록

- 2026-11-24 10: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]
[Product implementation detail omitted.]
- 2026-11-24 10: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]
[Product implementation detail omitted.]
- 2026-11-24 10: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]
- 한계: 정확히 이 형식이 아닌 비슷한 표현(예: "On 2026-02-03:")까지 막지는 않는다. 그것은 고객이 쓴 내용으로 남는다.
[Product implementation detail omitted.]
- 2026-11-24 10: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]
[Product implementation detail omitted.]
- 2026-11-24 10: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]
[Product implementation detail omitted.]

통과 수는 보안 합격 수치가 아니다.

- 2026-11-24: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]

- 2026-11-24: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]

- 2026-11-24: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]

- 2026-11-24: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]

- 2026-11-24: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]

- 2026-11-24: [Pre-run implementation detail omitted; predictions and grading below remain unchanged.]
