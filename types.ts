export type MOLTEventBody = {
  seq: number;
  ts: number;
  type: string;
  payload: Record<string, unknown>;
  actor: string;
};

export type MOLTEvent = MOLTEventBody & {
  prev_hash: string;
  hash: string;
  pub: string;
  sig: string;
};

export type VerificationReport = {
  valid: boolean;
  count: number;
  firstInvalidSequence: number | null;
  reason: string | null;
  keyId: string | null;
  anchoring: "local-only";
};

export type IndependentVerificationReport = VerificationReport & {
  verifier: "standalone-molt-v1";
};

export type MoltVerifyCheckReport = {
  valid: boolean;
  checkId: string | null;
  checkName: string;
  reason: string | null;
  count: number;
  firstInvalidSequence: number | null;
  keyId: string | null;
  anchor: "none" | "verified";
  verifier: "standalone-molt-v1";
};
