import type { languages } from "monaco-editor";

export const LANGUAGE_ID = "caddyfile";

export const languageConfig: languages.LanguageConfiguration = {
  comments: { lineComment: "#" },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
  ],
  folding: {
    markers: {
      start: /\{/,
      end: /\}/,
    },
  },
};

export const monarchTokens: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".caddyfile",

  // Common Caddy directives
  directives: [
    "abort",
    "acme_server",
    "basic_auth",
    "bind",
    "encode",
    "error",
    "file_server",
    "forward_auth",
    "handle",
    "handle_errors",
    "handle_path",
    "header",
    "import",
    "invoke",
    "log",
    "map",
    "method",
    "metrics",
    "php_fastcgi",
    "push",
    "redir",
    "request_body",
    "request_header",
    "respond",
    "reverse_proxy",
    "rewrite",
    "root",
    "route",
    "skip_log",
    "templates",
    "tls",
    "try_files",
    "uri",
    "vars",
  ],

  // Global options
  globalOptions: [
    "admin",
    "auto_https",
    "cert_issuer",
    "debug",
    "default_bind",
    "default_sni",
    "email",
    "grace_period",
    "http_port",
    "https_port",
    "key_type",
    "local_certs",
    "ocsp_stapling",
    "on_demand_tls",
    "order",
    "persist_config",
    "servers",
    "skip_install_trust",
    "storage",
  ],

  // Named matchers and common matcher tokens
  matchers: [
    "expression",
    "file",
    "header",
    "header_regexp",
    "host",
    "method",
    "not",
    "path",
    "path_regexp",
    "protocol",
    "query",
    "remote_ip",
  ],

  // Encode sub-directives
  encoders: ["gzip", "zstd", "br"],

  tokenizer: {
    root: [
      // Comments
      [/#.*$/, "comment"],

      // Placeholders like {http.request.host}
      [/\{[a-zA-Z_][\w.]*\}/, "variable"],

      // Environment variables like {$ENV_VAR}
      [/\{\$[\w]+\}/, "variable.env"],

      // Strings
      [/"/, "string", "@string_double"],
      [/`/, "string", "@string_backtick"],

      // Named matchers @name
      [/@[a-zA-Z_][\w-]*/, "type.matcher"],

      // Site addresses (lines starting with host/port patterns)
      [/^[\t ]*[a-zA-Z][\w.-]*(?::\d+)?[\t ]*\{?[\t ]*$/, "keyword.address"],
      [/^[\t ]*:[\d]+[\t ]*\{?[\t ]*$/, "keyword.address"],
      [/^[\t ]*https?:\/\/[^\s]+/, "keyword.address"],
      [/^\*[\t ]*\{?[\t ]*$/, "keyword.address"],

      // Snippet definitions (...)
      [/\([\w-]+\)/, "type.snippet"],

      // Brackets
      [/[{}()\[\]]/, "@brackets"],

      // Numbers
      [/\b\d+[smhd]\b/, "number.duration"],
      [/\b\d+(\.\d+)?\b/, "number"],

      // Wildcard *
      [/\*/, "keyword.wildcard"],

      // Status codes (3-digit numbers at start of args)
      [/\b[1-5]\d{2}\b/, "number.status"],

      // Identifiers — check against directive/option lists
      [
        /[a-zA-Z_][\w-]*/,
        {
          cases: {
            "@directives": "keyword.directive",
            "@globalOptions": "keyword.option",
            "@matchers": "keyword.matcher",
            "@encoders": "keyword.encoder",
            "@default": "identifier",
          },
        },
      ],

      // Paths
      [/\/[\w./*-]*/, "string.path"],
    ],

    string_double: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],

    string_backtick: [
      [/[^`]+/, "string"],
      [/`/, "string", "@pop"],
    ],
  },
};

/** Custom dark theme for the Caddyfile editor. */
export const THEME_ID = "caddyberry-dark";

export function defineTheme(monaco: typeof import("monaco-editor")) {
  monaco.editor.defineTheme(THEME_ID, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b7280", fontStyle: "italic" },
      { token: "keyword.directive", foreground: "67e8f9" }, // cyan-300
      { token: "keyword.option", foreground: "67e8f9" },
      { token: "keyword.matcher", foreground: "a5b4fc" }, // indigo-300
      { token: "keyword.encoder", foreground: "a5b4fc" },
      { token: "keyword.address", foreground: "34d399", fontStyle: "bold" }, // emerald-400
      { token: "keyword.wildcard", foreground: "fbbf24" },
      { token: "type.matcher", foreground: "c084fc" }, // purple-400
      { token: "type.snippet", foreground: "c084fc" },
      { token: "variable", foreground: "fb923c" }, // orange-400
      { token: "variable.env", foreground: "fb923c" },
      { token: "string", foreground: "86efac" }, // green-300
      { token: "string.escape", foreground: "4ade80" },
      { token: "string.path", foreground: "fde68a" }, // amber-200
      { token: "number", foreground: "f9a8d4" }, // pink-300
      { token: "number.duration", foreground: "f9a8d4" },
      { token: "number.status", foreground: "f9a8d4" },
      { token: "identifier", foreground: "d4d4d8" }, // zinc-300
    ],
    colors: {
      "editor.background": "#0c0c0f",
      "editor.foreground": "#d4d4d8",
      "editorLineNumber.foreground": "#3f3f46",
      "editorLineNumber.activeForeground": "#71717a",
      "editor.selectionBackground": "#27272a",
      "editor.lineHighlightBackground": "#18181b",
      "editorCursor.foreground": "#10b981",
      "editorBracketMatch.background": "#27272a",
      "editorBracketMatch.border": "#3f3f46",
    },
  });
}
