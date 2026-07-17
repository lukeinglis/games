"use client";

import { useState, useCallback } from "react";

const REPO = "lukeinglis/games";

export default function ReportBug() {
  const [state, setState] = useState<"idle" | "capturing" | "done">("idle");

  const handleReport = useCallback(async () => {
    setState("capturing");

    let screenshotNote = "*(paste screenshot here)*";

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 1,
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        screenshotNote =
          "**Screenshot copied to clipboard.** Press Ctrl+V / Cmd+V to paste it below.";
      }
    } catch {
      screenshotNote =
        "*(screenshot capture failed, please attach one manually)*";
    }

    const pageUrl = window.location.href;
    const userAgent = navigator.userAgent;
    const timestamp = new Date().toISOString();

    const title = encodeURIComponent(
      `Bug: [describe the issue]`
    );
    const body = encodeURIComponent(
      `## What happened?\n\n[Describe what went wrong]\n\n## Screenshot\n\n${screenshotNote}\n\n## Details\n\n- **Page:** ${pageUrl}\n- **Time:** ${timestamp}\n- **Browser:** ${userAgent}\n`
    );

    const issueUrl = `https://github.com/${REPO}/issues/new?title=${title}&body=${body}`;
    window.open(issueUrl, "_blank");

    setState("done");
    setTimeout(() => setState("idle"), 3000);
  }, []);

  return (
    <button
      onClick={handleReport}
      disabled={state === "capturing"}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-navy-light/90 backdrop-blur-sm px-4 py-2 text-xs text-gray-400 hover:text-white hover:border-white/20 hover:bg-navy-lighter/90 transition-all shadow-lg"
      title="Report a bug"
    >
      {state === "capturing" ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Capturing...</span>
        </>
      ) : state === "done" ? (
        <>
          <span>Screenshot copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Report Bug</span>
        </>
      )}
    </button>
  );
}
