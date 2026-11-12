#!/usr/bin/env node
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { canonicalizeJsonText } from './molt-canonical.mjs';

const SAMPLES = resolve('samples');
const ARTIFACT_TEXT = 'MOLT sample artifact v1\n';

const seed = createHash('sha256')
  .update('molt-verify-public-sample-v1')
  .digest();

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const privateKey = createPrivateKey({
  key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
  format: 'der',
  type: 'pkcs8',
});
const publicKey = createPublicKey(privateKey);
const publicPem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
const publicHex = Buffer.from(publicKey.export({ format: 'der', type: 'spki' }))
  .subarray(-32)
  .toString('hex');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function eventBody(seq, ts, score) {
  return {
    seq,
    ts,
    type: 'sample.event',
    actor: 'foundry-control',
    payload: { sample: 'good', score },
  };
}

// Camp 1: hash over prev_hash + canonical(5-field body); sign the 32 hash bytes.
function makeEvent(body, previousHash) {
  const canonicalBody = canonicalizeJsonText(JSON.stringify(body));
  const hash = sha256(previousHash + canonicalBody);
  const sig = sign(null, Buffer.from(hash, 'hex'), privateKey).toString('hex');
  return {
    ...body,
    prev_hash: previousHash,
    hash,
    pub: publicHex,
    sig,
  };
}

function canonicalLine(event) {
  return `${canonicalizeJsonText(JSON.stringify(event))}\n`;
}

async function writePackage(name, lines, anchor) {
  const directory = join(SAMPLES, name);
  const eventsText = lines.join('');
  const artifactBytes = Buffer.byteLength(ARTIFACT_TEXT, 'utf8');
  const manifest = {
    artifacts: {
      'artifact.txt': sha256(ARTIFACT_TEXT),
    },
    artifact_bytes: {
      'artifact.txt': artifactBytes,
    },
    agent_pubkeys: {
      'foundry-control': publicHex,
    },
    ledger_bytes: Buffer.byteLength(eventsText, 'utf8'),
  };

  if (anchor) manifest.anchor = anchor;

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'artifact.txt'), ARTIFACT_TEXT);
  await writeFile(join(directory, 'events.jsonl'), eventsText);
  await writeFile(join(directory, 'ed25519-public.pem'), publicPem);
  await writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

await rm(SAMPLES, { recursive: true, force: true });
await mkdir(SAMPLES, { recursive: true });

const first = makeEvent(eventBody(0, 1700000000, 1), '0'.repeat(64));
const second = makeEvent(eventBody(1, 1700000001, 2), first.hash);
const goodEvents = [first, second];
const goodLines = goodEvents.map(canonicalLine);
const anchor = { seq: 1, hash: second.hash };

await writePackage('sample-good', goodLines, anchor);

function cloneEvents() {
  return structuredClone(goodEvents);
}

{
  const events = cloneEvents();
  events[0].payload.score = 999;
  await writePackage('tampered-payload', events.map(canonicalLine), anchor);
}

{
  const events = cloneEvents();
  events[1].prev_hash = 'f'.repeat(64);
  await writePackage('tampered-broken-hash-chain', events.map(canonicalLine), anchor);
}

{
  const events = cloneEvents();
  events[0].sig = '0'.repeat(128);
  await writePackage('tampered-bad-signature', events.map(canonicalLine), anchor);
}

{
  const events = cloneEvents();
  events[1].seq = 9;
  await writePackage('tampered-wrong-sequence', events.map(canonicalLine), anchor);
}

{
  const lines = cloneEvents().map(canonicalLine);
  lines[0] = lines[0].replace('"actor":', '"actor": ');
  await writePackage('tampered-non-canonical-line', lines, anchor);
}

{
  const events = cloneEvents();
  delete events[0].type;
  await writePackage('tampered-missing-field', events.map(canonicalLine), anchor);
}

{
  const events = cloneEvents();
  events[0].hash = 'not-a-hash';
  await writePackage('tampered-bad-hash-format', events.map(canonicalLine), anchor);
}

console.log('built deterministic samples in samples/');
