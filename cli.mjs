#!/usr/bin/env node
import { resolve } from 'node:path';
import { verifyMoltPackage } from './verifier.mjs';

const directory = process.argv[2];

if (!directory || process.argv.length !== 3) {
  console.error('usage: node cli.mjs DIRECTORY');
  process.exit(2);
}

const report = await verifyMoltPackage(resolve(directory));

if (report.valid) {
  console.log(`PASS ${report.checkName}`);
  console.log(`anchor: ${report.anchor}`);
  console.log(`events: ${report.count}`);
  console.log(`keyId: ${report.keyId ?? 'none'}`);
  process.exit(0);
}

console.log(`FAIL ${report.checkId} ${report.checkName}: ${report.reason}`);
if (report.firstInvalidSequence !== null) {
  console.log(`first invalid sequence: ${report.firstInvalidSequence}`);
}
console.log(`anchor: ${report.anchor}`);

process.exit(report.checkId === 'V-01' ? 2 : 1);
