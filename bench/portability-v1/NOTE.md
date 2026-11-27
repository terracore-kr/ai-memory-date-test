# Note on this public copy

The run was made on 2026-11-27 in the authors' working tree, from `PREREG.md` as written (Korean). This public copy differs in two places, and in nothing that affects the answers:

- `score.mts` no longer reads the experimental dated store, which is not part of this repository. That store is only used by scoreboard-v1 trial 1, not by this test. Every prompt this test sent is checked against `inputSha` in `answers.jsonl`, and `npx tsx bench/portability-v1/score.mts > RESULT.txt` reproduces the committed `RESULT.txt` byte for byte.
- `PINS.json` holds the hashes of the files as they are in this repository.

Raw answers: `answers.jsonl` (4,320 rows, sha256 6a41402afef96f393e37d5c732163feda64d11bf6c1a0cd4774207f17ef8cbf9). Result: `RESULT.txt` (sha256 96be7450f80b0f4a9c9c2cefc6330228e5a384025d7f8b4596fc0456b83213f6). Cost of the run: $1.47897.
