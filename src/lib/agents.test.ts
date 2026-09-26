import assert from "node:assert/strict";
import test from "node:test";
import { buildSharePath, parseShareQuestion } from "./agents.ts";

test("share paths hide the plaintext question and round-trip Unicode", () => {
  const question = "What is Claude? 🤔";
  const path = buildSharePath(question, "signature");
  const search = Object.fromEntries(new URL(path, "https://example.com").searchParams);

  assert.equal(path.includes("What"), false);
  assert.equal(path.includes("Claude"), false);
  assert.equal(parseShareQuestion(search), question);
  assert.equal(search.s, "signature");
});

test("legacy q links still work", () => {
  assert.equal(parseShareQuestion({ q: "  old question  " }), "old question");
});

test("malformed encoded questions do not leak into the page", () => {
  assert.equal(parseShareQuestion({ d: "%%%" }), "");
});
