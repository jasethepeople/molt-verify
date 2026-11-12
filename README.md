# molt-verify

Standalone verifier for a MOLT signed package.

## Scheme — Camp 1 (Foundry)

This verifier matches the Foundry `MoltLedger` / `independent-verifier.ts` scheme:

- Signed body is the **five Foundry fields**: `seq, ts, type, payload, actor`.
- Event hash is `sha256(prev_hash_hex + canonical(five-field body))`.
- Ed25519 signature is over the **32 hash bytes**, not the canonical body string.

An earlier draft of `molt-verify-ledger.mjs` used a seven-field body (adding `prev_hash, pub`) and signed the canonical body string. That is not Foundry and would reject every real `MoltLedger` event. The ruling is that Foundry's scheme is the standard. `molt-verify-ledger.mjs` needs the same fix in a follow-up round.

## What it verifies

- `manifest.json` is complete JSON and has the required schema.
- `events.jsonl` is complete, ends with a newline, and matches `manifest.ledger_bytes`.
- Artifact SHA-256 digests and byte counts match the manifest.
- The Ed25519 public key is valid.
- Each event line is valid JSON and canonical (RFC 8785, via `molt-canonical.mjs`).
- Each event has exactly nine fields: `seq, ts, type, actor, payload, prev_hash, pub, sig, hash`.
- Event field formats are valid.
- Event sequence numbers are contiguous from zero.
- Each `prev_hash` matches the recomputed previous event hash.
- Each event hash is `sha256(prev_hash + canonical(five-field body))`.
- Each Ed25519 signature verifies over the 32 hash bytes using the manifest key.
- Each event public key is bound to its actor in `manifest.agent_pubkeys`.
- If `manifest.anchor` exists, the anchored event hash is recomputed and must match. If no anchor exists, output says `anchor: none`.

This proves a package verifies. It does not prove the events in it are true.

## Run

```bash
node cli.mjs samples/sample-good
```

Expected:

```text
PASS all checks
anchor: verified
```

Exit codes:

- 0 — PASS
- 1 — verification FAIL
- 2 — missing/unreadable package directory or bad usage

Build samples and test

```bash
npm run build:samples
npm test
```

Samples are locally generated with a deterministic public test key derived from the label molt-verify-public-sample-v1. They are not from the owner's laptop ledger. The test key is not a live secret and must never be used outside fixtures.

Check IDs

ID Check
V-01 Package path and directory readable
V-02 Control files present and regular
V-03 Size limits
V-04 File completeness and truncation
V-05 Manifest JSON object
V-06 Manifest schema
V-07 Ed25519 public key
V-08 Artifact digests and byte counts
V-09 Ledger event checks
V-10 Anchor check

V-09 failure reasons

invalid JSON, not canonical, wrong fields, bad field format, actor key not bound, seq out of order, chain broken, hash mismatch, bad signature.

Sample set

Package Expected failure
sample-good PASS, anchor: verified
tampered-payload V-09 hash mismatch
tampered-broken-hash-chain V-09 chain broken
tampered-bad-signature V-09 bad signature
tampered-wrong-sequence V-09 seq out of order
tampered-non-canonical-line V-09 not canonical
tampered-missing-field V-09 wrong fields
tampered-bad-hash-format V-09 bad field format

Open items

- Non-ASCII payloads. Foundry's stableJson escapes characters above 0x7e as \uXXXX and sorts keys by UTF-8 bytes; RFC 8785 (via molt-canonical.mjs) emits UTF-8 and sorts by UTF-16. For ASCII payloads the two agree. A real laptop-ledger event with non-ASCII payload would fail this verifier. Needs a ruling before the laptop swap if any payload is non-ASCII.
- molt-verify-ledger.mjs still uses the seven-field / canonical-body-string scheme and will disagree with this verifier until it is fixed in a follow-up round.
- Laptop-ledger sample swap. Samples here are locally generated, not from the laptop ledger.
- Layer 2 second verifier plus differential fuzzing — not built.
