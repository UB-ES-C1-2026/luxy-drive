import assert from "node:assert/strict";
import { test } from "node:test";
import { hasClosingIssue } from "./check-pr-issue.mjs";

for (const body of ["Closes #28", "Fixes #27", "closes #29", "Summary\n\nCloses #44\nCloses #45"]) {
  test(`accepts ${JSON.stringify(body)}`, () => assert.equal(hasClosingIssue(body), true));
}
for (const body of [
  null,
  "",
  "Related to #28",
  "Closes #0",
  "Closes #…",
  "<!-- Closes #28 -->",
  "`Closes #28`",
  "```text\nCloses #28\n```",
  "~~~\nFixes #28\n~~~",
  "NotCloses #28",
]) {
  test(`rejects ${JSON.stringify(body)}`, () => assert.equal(hasClosingIssue(body), false));
}
