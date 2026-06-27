import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const draftCardSource = await readFile("components/quick-create/draft-card.tsx", "utf8");
  const draftListSource = await readFile("components/quick-create/draft-list.tsx", "utf8");
  const shellSource = await readFile("app/dashboard/quick-create/QuickCreateShell.tsx", "utf8");
  const hookSource = await readFile("hooks/use-quick-create-drafts.ts", "utf8");

  assert.match(
    draftCardSource,
    /Phân tích thường/,
    "Draft prompt tools must expose a rule-based reparse button",
  );
  assert.match(
    draftCardSource,
    /Phân tích AI/,
    "Draft prompt tools must label the AI reparse action clearly",
  );
  assert.match(
    draftCardSource,
    /handlePromptSave\("rule"\)/,
    "Rule reparse button must call the prompt save handler with rule mode",
  );
  assert.match(
    draftCardSource,
    /handlePromptSave\("smart"\)/,
    "AI reparse button must call the prompt save handler with smart mode",
  );
  assert.match(
    draftListSource,
    /ParseMode/,
    "DraftList must forward the selected reparse mode",
  );
  assert.match(
    shellSource,
    /handleUpdateDraftPrompt[\s\S]*parseMode: ParseMode[\s\S]*updateDraftPrompt\(item\.id, \{ rawText, reparse: true \}, parseMode\)/,
    "QuickCreateShell must pass the selected reparse mode into the draft hook",
  );
  assert.match(
    hookSource,
    /parseMode: ParseMode = "smart"/,
    "Draft hook must accept an explicit parse mode for prompt reparsing",
  );
  assert.match(
    hookSource,
    /body: JSON\.stringify\(\{ \.\.\.payload, parseMode \}\)/,
    "Draft hook must send the selected parse mode to the reparse API",
  );
  assert.match(
    hookSource,
    /parseMode \} as const/,
    "Draft hook must preserve the selected parse mode on the returned item",
  );

  console.log("quick-create reparse mode UI checks passed");
}

void main();
