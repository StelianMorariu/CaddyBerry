"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import ToastContainer, { useToasts } from "./toast";
import {
  LANGUAGE_ID,
  languageConfig,
  monarchTokens,
  THEME_ID,
  defineTheme,
} from "./caddyfile-lang";

const IS_DEV = process.env.IS_DEV === "true";

// Sample Caddyfile content used when IS_DEV=true (mirrors Caddyfile-sample at repo root)
const DEV_SAMPLE = `# Global options block — applies to the whole Caddy process
{
	email admin@example.com
	admin localhost:2019

	# Uncomment to disable automatic HTTPS (useful behind a reverse proxy)
	# auto_https off
}

# ── Basic static file server ──────────────────────────────────────────────────
example.com {
	root * /var/www/html
	file_server
	encode gzip zstd

	log {
		output file /var/log/caddy/access.log
	}
}

# ── Reverse proxy to a local app ──────────────────────────────────────────────
api.example.com {
	reverse_proxy localhost:8080 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-Proto {scheme}
	}
}

# ── Multiple backends with load balancing ─────────────────────────────────────
app.example.com {
	reverse_proxy localhost:3001 localhost:3002 localhost:3003 {
		lb_policy round_robin
		health_uri /health
		health_interval 10s
	}
}

# ── Route-based proxying with matchers ───────────────────────────────────────
portal.example.com {
	handle /static/* {
		root * /var/www/portal
		file_server
	}

	handle /api/* {
		reverse_proxy localhost:9000
	}

	handle {
		reverse_proxy localhost:5173
	}
}
`;

type OutputLine = {
  type: "error" | "warning" | "success" | "info";
  text: string;
};

type DevSimulate = "success" | "failure";

export default function CaddyEditor() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [devSimulate, setDevSimulate] = useState<DevSimulate>("success");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const savedContentRef = useRef("");
  const { toasts, push, dismiss, resolve } = useToasts();

  // ───── Load the Caddyfile on mount ─────
  useEffect(() => {
    if (IS_DEV) {
      setContent(DEV_SAMPLE);
      savedContentRef.current = DEV_SAMPLE;
      setLoading(false);
      return;
    }

    fetch("/api/caddy/file")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          push("error", data.error);
        } else {
          setContent(data.content);
          savedContentRef.current = data.content;
        }
        setLoading(false);
      })
      .catch((err) => {
        push("error", err.message);
        setLoading(false);
      });
  }, [push]);

  // ───── Register Caddyfile language before Monaco mounts ─────
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.languages.register({ id: LANGUAGE_ID });
    monaco.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfig);
    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monarchTokens);
    defineTheme(monaco);
  };

  const handleEditorMount: OnMount = (ed) => {
    editorRef.current = ed;
  };

  const handleChange = (value: string | undefined) => {
    const val = value ?? "";
    setContent(val);
    setDirty(val !== savedContentRef.current);
  };

  /**
   * Core pipeline: format → validate → save to disk.
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
      current = fmtData.formatted;
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

    return { ok: true, lines, formatted: current };
  }, [content]);

  // ───── Apply: format → validate → save → reload Caddy ─────
  const apply = useCallback(async () => {
    setBusy(true);
    const toastId = push("loading", "Applying configuration...");

    // ── Dev mode: mock the full pipeline ──
    if (IS_DEV) {
      await new Promise((r) => setTimeout(r, 800));
      if (devSimulate === "success") {
        savedContentRef.current = content;
        setDirty(false);
        resolve(toastId, "success", "Configuration applied (dev mode)");
      } else {
        resolve(
          toastId,
          "error",
          "Simulated failure: Caddy admin API unreachable",
        );
      }
      setBusy(false);
      return;
    }

    try {
      const { ok, lines, formatted } = await formatValidateSave();

      // Always update editor with formatted content
      setContent(formatted);

      if (!ok) {
        setDirty(formatted !== savedContentRef.current);
        const errors = lines.filter((l) => l.type === "error");
        resolve(toastId, "error", errors[0]?.text || "Apply failed");
        // Show additional warnings as separate toasts
        for (const w of lines.filter((l) => l.type === "warning")) {
          push("error", w.text);
        }
        setBusy(false);
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
          push("info", w);
        }
      }

      if (!reloadRes.ok) {
        resolve(
          toastId,
          "error",
          reloadData.error || "Failed to reload Caddy.",
        );
        setBusy(false);
        return;
      }

      resolve(toastId, "success", "Configuration applied");

      // Show warnings from earlier steps
      for (const w of lines.filter((l) => l.type === "warning")) {
        push("info", w.text);
      }
    } catch (err) {
      resolve(toastId, "error", (err as Error).message);
    }

    setBusy(false);
  }, [formatValidateSave, push, resolve, devSimulate, content]);

  // ───── Keyboard shortcut: Ctrl/Cmd+S → Apply ─────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        apply();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [apply]);

  const btnBase =
    "px-4 py-1.5 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="flex flex-col h-full">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        {dirty && (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        )}

        {/* ── Dev mode controls ── */}
        {IS_DEV && (
          <div className="flex items-center gap-2 ml-0">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 select-none">
              DEV
            </span>
            <select
              value={devSimulate}
              onChange={(e) => setDevSimulate(e.target.value as DevSimulate)}
              className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-2 py-0.5 cursor-pointer focus:outline-none focus:border-zinc-500"
            >
              <option value="success">Simulate: Success</option>
              <option value="failure">Simulate: Failure</option>
            </select>
          </div>
        )}

        <button
          onClick={apply}
          disabled={busy || loading}
          className={`${btnBase} bg-emerald-700 hover:bg-emerald-600 ml-auto`}
        >
          Apply
        </button>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage={LANGUAGE_ID}
          theme={THEME_ID}
          value={content}
          onChange={handleChange}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          options={{
            fontSize: isMobile ? 12 : 14,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            automaticLayout: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: isMobile ? "off" : "on",
            tabSize: 4,
            insertSpaces: false,
            padding: { top: 12, bottom: 80 },
            scrollbar: { alwaysConsumeMouseWheel: false },
            fastScrollSensitivity: 3,
          }}
          loading={
            <div className="flex items-center justify-center h-full text-zinc-500">
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
