"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import OutputPanel, { type OutputLine } from "./output-panel";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

export default function CaddyEditor() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status>({ type: "loading" });
  const [dirty, setDirty] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const savedContentRef = useRef("");

  /** Replace all output with new lines. */
  const replaceOutput = useCallback((...lines: OutputLine[]) => {
    setOutput(lines);
  }, []);

  // ───── Load the Caddyfile on mount ─────
  useEffect(() => {
    fetch("/api/caddy/file")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus({ type: "error", message: data.error });
          replaceOutput({ type: "error", text: data.error });
        } else {
          setContent(data.content);
          savedContentRef.current = data.content;
          setStatus({ type: "idle" });
        }
      })
      .catch((err) => {
        setStatus({ type: "error", message: err.message });
        replaceOutput({ type: "error", text: err.message });
      });
  }, [replaceOutput]);

  const handleEditorMount: OnMount = (ed) => {
    editorRef.current = ed;
  };

  const handleChange = (value: string | undefined) => {
    const val = value ?? "";
    setContent(val);
    setDirty(val !== savedContentRef.current);
  };

  /**
   * Core pipeline shared by Save and Apply:
   *  1. Format (caddy fmt)
   *  2. Validate (POST to /load to check errors/warnings)
   *  3. Save to disk
   * Returns { ok, lines, formatted } so the caller can decide whether to reload.
   */
  const formatValidateSave = useCallback(async (): Promise<{
    ok: boolean;
    lines: OutputLine[];
    formatted: string;
  }> => {
    const lines: OutputLine[] = [];
    let current = content;

    // ── 1. Format ──
    const fmtRes = await fetch("/api/caddy/format", {
      method: "POST",
      body: current,
    });
    const fmtData = await fmtRes.json();

    if (Array.isArray(fmtData.warnings)) {
      for (const w of fmtData.warnings) {
        lines.push({ type: "warning", text: w });
      }
    }

    if (fmtData.error) {
      lines.push({ type: "error", text: fmtData.error });
      return { ok: false, lines, formatted: current };
    }

    if (typeof fmtData.formatted === "string") {
      const changed = fmtData.formatted !== current;
      current = fmtData.formatted;
      lines.push({
        type: "info",
        text: changed ? "Formatted Caddyfile." : "Already formatted.",
      });
    }

    // ── 2. Validate ──
    const valRes = await fetch("/api/caddy/validate", {
      method: "POST",
      body: current,
    });
    const valData = await valRes.json();

    if (Array.isArray(valData.warnings)) {
      for (const w of valData.warnings) {
        lines.push({ type: "warning", text: w });
      }
    }

    if (!valData.valid) {
      lines.push({
        type: "error",
        text: valData.error || "Caddyfile is invalid.",
      });
      return { ok: false, lines, formatted: current };
    }

    // ── 3. Save to disk ──
    const saveRes = await fetch("/api/caddy/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: current }),
    });

    if (!saveRes.ok) {
      const saveData = await saveRes.json();
      lines.push({
        type: "error",
        text: saveData.error || "Failed to save Caddyfile.",
      });
      return { ok: false, lines, formatted: current };
    }

    lines.push({ type: "success", text: "Caddyfile saved to disk." });
    return { ok: true, lines, formatted: current };
  }, [content]);

  // ───── Save: format → validate → save to disk ─────
  const save = useCallback(async () => {
    setStatus({ type: "loading", message: "Saving..." });
    replaceOutput({ type: "info", text: "Formatting, validating & saving..." });

    try {
      const { ok, lines, formatted } = await formatValidateSave();

      // Always update editor with formatted content
      setContent(formatted);

      if (ok) {
        savedContentRef.current = formatted;
        setDirty(false);
        setStatus({ type: "success", message: "Saved" });
      } else {
        // Still mark dirty relative to what's on disk
        setDirty(formatted !== savedContentRef.current);
        const hasError = lines.some((l) => l.type === "error");
        setStatus({
          type: "error",
          message: hasError ? "Save failed" : "Saved with warnings",
        });
      }

      replaceOutput(...lines);
    } catch (err) {
      const msg = (err as Error).message;
      setStatus({ type: "error", message: msg });
      replaceOutput({ type: "error", text: msg });
    }
  }, [formatValidateSave, replaceOutput]);

  // ───── Apply: format → validate → save to disk → reload Caddy ─────
  const apply = useCallback(async () => {
    setStatus({ type: "loading", message: "Applying..." });
    replaceOutput({
      type: "info",
      text: "Formatting, validating, saving & reloading...",
    });

    try {
      const { ok, lines, formatted } = await formatValidateSave();

      // Always update editor with formatted content
      setContent(formatted);

      if (!ok) {
        setDirty(formatted !== savedContentRef.current);
        setStatus({ type: "error", message: "Apply failed" });
        replaceOutput(...lines);
        return;
      }

      savedContentRef.current = formatted;
      setDirty(false);

      // ── 4. Reload Caddy ──
      const reloadRes = await fetch("/api/caddy/reload", {
        method: "POST",
        body: formatted,
      });
      const reloadData = await reloadRes.json();

      if (Array.isArray(reloadData.warnings)) {
        for (const w of reloadData.warnings) {
          lines.push({ type: "warning", text: w });
        }
      }

      if (!reloadRes.ok) {
        lines.push({
          type: "error",
          text: reloadData.error || "Failed to reload Caddy.",
        });
        setStatus({ type: "error", message: "Reload failed" });
        replaceOutput(...lines);
        return;
      }

      lines.push({ type: "success", text: "Caddy reloaded successfully." });
      setStatus({ type: "success", message: "Applied" });
      replaceOutput(...lines);
    } catch (err) {
      const msg = (err as Error).message;
      setStatus({ type: "error", message: msg });
      replaceOutput({ type: "error", text: msg });
    }
  }, [formatValidateSave, replaceOutput]);

  // ───── Keyboard shortcut: Ctrl/Cmd+S → Save ─────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  const statusColor =
    status.type === "error"
      ? "text-red-400"
      : status.type === "success"
        ? "text-green-400"
        : status.type === "loading"
          ? "text-yellow-400"
          : "text-zinc-500";

  const btnBase =
    "px-4 py-1.5 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <button
          onClick={save}
          disabled={status.type === "loading"}
          className={`${btnBase} bg-zinc-700 hover:bg-zinc-600`}
        >
          Save
        </button>
        <button
          onClick={apply}
          disabled={status.type === "loading"}
          className={`${btnBase} bg-emerald-700 hover:bg-emerald-600`}
        >
          Apply
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {dirty && (
            <span className="text-xs text-amber-400">Unsaved changes</span>
          )}
          {status.message && (
            <span className={`text-xs ${statusColor}`}>{status.message}</span>
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          theme="vs-dark"
          value={content}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 4,
            insertSpaces: false,
            padding: { top: 12 },
          }}
          loading={
            <div className="flex items-center justify-center h-full text-zinc-500">
              Loading editor...
            </div>
          }
        />
      </div>

      {/* ── Output panel ── */}
      <OutputPanel lines={output} onClear={() => setOutput([])} />
    </div>
  );
}
