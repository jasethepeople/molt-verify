#!/usr/bin/env node
import { resolve } from 'node:path';
import { verifyMoltPackage } from './verifier.mjs';

const expected = [
  ['sample-good', null, null],
  ['tampered-payload', 'V-09', 'hash mismatch'],
  ['tampered-broken-hash-chain', 'V-09', 'chain broken'],
  ['tampered-bad-signature', 'V-09', 'bad signature'],
  ['tampered-wrong-sequence', 'V-09', 'seq out of order'],
  ['tampered-non-canonical-line', 'V-09', 'not canonical'],
  ['tampered-missing-field', 'V-09', 'wrong fields'],
  ['tampered-bad-hash-format', 'V-09', 'bad field format'],
];

let failures = 0;

for (const [name, checkId, reason] of expected) {
  const report = await verifyMoltPackage(resolve('samples', name));

  if (checkId === null) {
    if (!report.valid || report.anchor !== 'verified') {
      failures += 1;
      console.log(`FAIL ${name}: expected PASS with anchor verified, got ${JSON.stringify(report)}`);
    } else {
      console.log(`PASS ${name}: PASS anchor=${report.anchor} events=${report.count}`);
    }
    continue;
  }

  if (report.valid || report.checkId !== checkId || !String(report.reason).includes(reason)) {
    failures += 1;
    console.log(`FAIL ${name}: expected ${checkId} "${reason}", got ${JSON.stringify(report)}`);
  } else {
    console.log(`PASS ${name}: FAIL ${report.checkId} ${report.reason}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} sample expectation(s) failed`);
  process.exit(1);
}

console.log('\nall sample expectations passed');
