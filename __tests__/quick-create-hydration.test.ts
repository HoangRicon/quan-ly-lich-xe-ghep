import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ModeToggle } from "../components/quick-create/mode-toggle";
import { useAIComposer } from "../hooks/use-ai-composer";

function ComposerModeProbe() {
  const composer = useAIComposer();

  return createElement(ModeToggle, {
    mode: composer.parseMode,
    onModeChange: composer.setParseMode,
  });
}

describe("quick-create composer hydration", () => {
  it("keeps the first client render aligned with server HTML when a saved parse mode exists", () => {
    localStorage.setItem("quick-create-parse-mode", "rule");

    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    const serverHtml = renderToString(createElement(ComposerModeProbe));

    vi.stubGlobal("window", originalWindow);
    localStorage.setItem("quick-create-parse-mode", "rule");
    const firstClientHtml = renderToString(createElement(ComposerModeProbe));

    expect(firstClientHtml).toBe(serverHtml);
  });
});
