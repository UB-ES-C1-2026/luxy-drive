import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function hasClosingIssue(body) {
  // Template comments and code examples are not actual closing references.
  const text = (body ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(`{3,}|~{3,})[^\n]*\n[\s\S]*?\1/g, "")
    .replace(/`[^`\n]*`/g, "");
  return /\b(?:closes|fixes)[ \t]+#[1-9]\d*\b/i.test(text);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (!hasClosingIssue(event.pull_request?.body)) {
    console.error("Add Closes #123 or Fixes #123 to the PR description (outside comments/code).");
    process.exitCode = 1;
  } else {
    console.log("PR description contains a closing issue reference.");
  }
}
