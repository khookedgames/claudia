import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are Claudia, an AI assistant created by Paji. You are helpful, thoughtful, honest, and curious. You speak warmly but with intellectual precision. You have a sense of humor and aren't afraid to gently disagree.

When users ask for code, ALWAYS wrap it in fenced markdown code blocks with the language tag (e.g. \`\`\`html, \`\`\`javascript, \`\`\`css). For runnable web code, prefer self-contained HTML with inline <style> and <script> so it can be previewed directly. Keep prose around code concise.`;

const MODEL = "claude-sonnet-4-20250514";

// ─── Theme palettes ───────────────────────────────────
const themes = {
  light: {
    bg: "#FFF1E0",
    bgGlow: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,56,56,0.10) 0%, transparent 70%)",
    surface: "#FFFFFF",
    surfaceMuted: "#FFE4C9",
    headerBg: "rgba(255,241,224,0.85)",
    inputBg: "#FFFFFF",
    border: "rgba(212,56,56,0.18)",
    borderStrong: "rgba(212,56,56,0.35)",
    textPrimary: "#3A1010",
    textSecondary: "#8A4A3A",
    textMuted: "#C49A8A",
    accent: "#D43838",
    accentSoft: "#F08A4B",
    accentGradient: "linear-gradient(135deg, #D43838 0%, #F08A4B 100%)",
    bubbleAssistant: "#FFFAF2",
    bubbleUser: "linear-gradient(135deg, #D43838 0%, #E85C2C 100%)",
    bubbleUserText: "#FFF6E8",
    avatarUserBg: "#FFFFFF",
    avatarUserText: "#D43838",
    avatarUserBorder: "1.5px solid rgba(212,56,56,0.35)",
    statusReady: "#5FA85F",
    shadow: "0 4px 24px rgba(212,56,56,0.10)",
    bubbleShadow: "0 2px 12px rgba(212,56,56,0.08)",
    codeBg: "#2A1818",
    codeText: "#F2E6DD",
  },
  dark: {
    bg: "#1A1817",
    bgGlow: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,69,69,0.18) 0%, transparent 70%)",
    surface: "#262321",
    surfaceMuted: "#2E2A28",
    headerBg: "rgba(26,24,23,0.85)",
    inputBg: "#262321",
    border: "rgba(232,69,69,0.22)",
    borderStrong: "rgba(232,69,69,0.45)",
    textPrimary: "#F2E6DD",
    textSecondary: "#B89A8A",
    textMuted: "#7A6862",
    accent: "#E84545",
    accentSoft: "#F47961",
    accentGradient: "linear-gradient(135deg, #E84545 0%, #F47961 100%)",
    bubbleAssistant: "#2E2A28",
    bubbleUser: "linear-gradient(135deg, #E84545 0%, #C93838 100%)",
    bubbleUserText: "#FFF6E8",
    avatarUserBg: "#2E2A28",
    avatarUserText: "#F47961",
    avatarUserBorder: "1.5px solid rgba(232,69,69,0.4)",
    statusReady: "#6BC46B",
    shadow: "0 4px 24px rgba(0,0,0,0.4)",
    bubbleShadow: "0 2px 12px rgba(0,0,0,0.25)",
    codeBg: "#15110F",
    codeText: "#F2E6DD",
  },
};

// ─── Markdown / code block parser ─────────────────────
function parseSegments(text) {
  // splits text into [{type: 'text'|'code', content, lang?}]
  const segments = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", content: text.slice(last, match.index) });
    }
    segments.push({
      type: "code",
      lang: (match[1] || "").toLowerCase(),
      content: match[2].replace(/\n$/, ""),
    });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", content: text.slice(last) });
  }
  return segments;
}

function isRunnable(lang) {
  return ["html", "htm"].includes(lang);
}

function buildSrcDoc(lang, code) {
  if (lang === "html" || lang === "htm") {
    return code.includes("<html") || code.includes("<!DOCTYPE")
      ? code
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:16px;color:#222;background:#fff}</style></head><body>${code}</body></html>`;
  }
  return "";
}

function CodeBlock({ lang, content, theme }) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const runnable = isRunnable(lang);

  const copy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      margin: "10px 0",
      borderRadius: 12,
      overflow: "hidden",
      border: `1px solid ${theme.border}`,
      background: theme.codeBg,
      fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        padding: "6px 10px 6px 14px",
        background: "rgba(255,255,255,0.04)",
        borderBottom: `1px solid ${theme.border}`,
        fontSize: 11, color: theme.textMuted,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        <span style={{ flex: 1 }}>{lang || "code"}</span>
        {runnable && (
          <button onClick={() => setRunning(r => !r)} style={{
            background: running ? theme.accent : "transparent",
            color: running ? "#fff" : theme.accentSoft,
            border: `1px solid ${theme.accentSoft}`,
            padding: "3px 10px",
            borderRadius: 6, fontSize: 11, cursor: "pointer",
            marginRight: 6, fontFamily: "inherit",
            letterSpacing: "0.06em",
          }}>
            {running ? "■ stop" : "▶ run"}
          </button>
        )}
        <button onClick={copy} style={{
          background: "transparent",
          color: copied ? theme.statusReady : theme.textSecondary,
          border: `1px solid ${theme.border}`,
          padding: "3px 10px",
          borderRadius: 6, fontSize: 11, cursor: "pointer",
          fontFamily: "inherit", letterSpacing: "0.06em",
        }}>
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: "12px 14px",
        color: theme.codeText, fontSize: 13,
        lineHeight: 1.55, overflow: "auto",
        maxHeight: 320,
      }}><code>{content}</code></pre>
      {running && runnable && (
        <div style={{
          borderTop: `1px solid ${theme.border}`,
          background: "#fff",
          height: 360,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            padding: "4px 10px", fontSize: 10,
            color: "#888", background: "#f5f5f5",
            borderBottom: "1px solid #e0e0e0",
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: "ui-monospace, Menlo, monospace",
            zIndex: 1,
          }}>
            ▸ live preview
          </div>
          <iframe
            srcDoc={buildSrcDoc(lang, content)}
            sandbox="allow-scripts allow-modals allow-forms"
            style={{
              width: "100%", height: "100%",
              border: "none", paddingTop: 22,
              boxSizing: "border-box",
            }}
            title="preview"
          />
        </div>
      )}
    </div>
  );
}

// inline ` code ` and **bold**
function renderInline(text, theme) {
  const parts = [];
  const regex = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
  let last = 0, m, key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(<code key={key++} style={{
        background: `${theme.accent}22`,
        color: theme.accent,
        padding: "1px 6px", borderRadius: 4,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: "0.9em",
      }}>{tok.slice(1, -1)}</code>);
    } else {
      parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function TypingDots({ color }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: color,
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </span>
  );
}

function ImagePreview({ src, onRemove, theme }) {
  return (
    <div style={{
      position: "relative",
      width: 64, height: 64,
      borderRadius: 10, overflow: "hidden",
      border: `1.5px solid ${theme.borderStrong}`,
      flexShrink: 0,
      animation: "fadeSlideIn 0.2s ease",
    }}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <button onClick={onRemove} style={{
        position: "absolute", top: 3, right: 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "rgba(0,0,0,0.7)", color: "#fff",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, lineHeight: 1, padding: 0,
      }}>×</button>
    </div>
  );
}

function Message({ msg, theme }) {
  const isUser = msg.role === "user";
  const blocks = Array.isArray(msg.content)
    ? msg.content
    : [{ type: "text", text: msg.content }];
  const text = blocks.find(b => b.type === "text")?.text || "";
  const images = blocks.filter(b => b.type === "image");
  const isEmpty = !text && images.length === 0;

  // Parse text into segments (text + code blocks)
  const segments = isUser ? [{ type: "text", content: text }] : parseSegments(text);

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "1.5rem",
      gap: 12,
      alignItems: "flex-start",
      animation: "fadeSlideIn 0.3s ease forwards",
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: theme.accentGradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          fontFamily: "'Libre Baskerville', Georgia, serif",
          fontWeight: 700, fontSize: 14,
          color: "#fff", marginTop: 2,
          boxShadow: `0 2px 8px ${theme.accent}55`,
        }}>C</div>
      )}
      <div style={{
        maxWidth: "78%",
        padding: isUser ? "10px 16px" : "12px 18px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        background: isUser ? theme.bubbleUser : theme.bubbleAssistant,
        color: isUser ? theme.bubbleUserText : theme.textPrimary,
        fontSize: 15, lineHeight: 1.7,
        fontFamily: "'Crimson Pro', Georgia, serif",
        boxShadow: theme.bubbleShadow,
        border: isUser ? "none" : `1px solid ${theme.border}`,
        letterSpacing: "0.01em",
        wordBreak: "break-word",
      }}>
        {images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: text ? 8 : 0 }}>
            {images.map((img, i) => (
              <img key={i}
                src={`data:${img.source.media_type};base64,${img.source.data}`}
                alt=""
                style={{
                  maxWidth: 240, maxHeight: 240, borderRadius: 10,
                  border: `1px solid ${isUser ? "rgba(255,255,255,0.2)" : theme.border}`,
                  display: "block",
                }}
              />
            ))}
          </div>
        )}
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <CodeBlock key={i} lang={seg.lang} content={seg.content} theme={theme} />
          ) : (
            <span key={i} style={{ whiteSpace: "pre-wrap" }}>
              {renderInline(seg.content, theme)}
            </span>
          )
        )}
        {isEmpty && msg.role === "assistant" && <TypingDots color={theme.accent} />}
      </div>
      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: theme.avatarUserBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 2,
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontWeight: 700, fontSize: 13,
          color: theme.avatarUserText,
          border: theme.avatarUserBorder,
        }}>U</div>
      )}
    </div>
  );
}

export default function ClaudiaByPaji() {
  const [mode, setMode] = useState("dark"); // ← dark by default
  const theme = themes[mode];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  };

  const handleFiles = async (files) => {
    const arr = Array.from(files).slice(0, 4 - pendingImages.length);
    for (const file of arr) {
      if (!file.type.startsWith("image/")) continue;
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const [meta, b64] = data.split(",");
      const media_type = meta.match(/data:(.*?);/)[1];
      setPendingImages(prev => [...prev, { data: b64, media_type, preview: data }]);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || loading) return;
    setError(null);

    const userContent = [];
    for (const img of pendingImages) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: img.media_type, data: img.data },
      });
    }
    if (text) userContent.push({ type: "text", text });

    const userMsg = { role: "user", content: userContent };
    setInput("");
    setPendingImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          stream: true,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                assistantText += parsed.delta.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantText };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onPaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items
      .filter(it => it.kind === "file" && it.type.startsWith("image/"))
      .map(it => it.getAsFile());
    if (files.length) {
      e.preventDefault();
      handleFiles(files);
    }
  };

  const canSend = !loading && (input.trim() || pendingImages.length > 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{opacity:0.6} 50%{opacity:1} 100%{opacity:0.6} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus { outline: none; }
        textarea { resize: none; font-family: 'Crimson Pro', Georgia, serif; }
        textarea::placeholder { color: ${theme.textMuted}; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.accent}33; border-radius: 99px; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh", maxHeight: "100vh",
        background: theme.bg,
        fontFamily: "'Crimson Pro', Georgia, serif",
        position: "relative", overflow: "hidden",
        transition: "background 0.4s ease",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: theme.bgGlow, zIndex: 0,
          transition: "background 0.4s ease",
        }} />

        {/* Header */}
        <div style={{
          padding: "18px 28px",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex", alignItems: "center", gap: 14,
          background: theme.headerBg,
          backdropFilter: "blur(12px)",
          position: "relative", zIndex: 10,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: theme.accentGradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontWeight: 700, fontSize: 18, color: "#fff",
            boxShadow: `0 4px 16px ${theme.accent}55`,
          }}>C</div>
          <div>
            <div style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: 19, fontWeight: 700,
              color: theme.textPrimary, letterSpacing: "-0.02em",
            }}>Claudia</div>
            <div style={{
              fontSize: 11, color: theme.textSecondary,
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontWeight: 400,
            }}>by Paji</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: loading ? theme.accentSoft : theme.statusReady,
                animation: loading ? "shimmer 1s ease infinite" : "none",
              }} />
              <span style={{ fontSize: 13, color: theme.textSecondary }}>
                {loading ? "thinking…" : "ready"}
              </span>
            </div>
            <button
              onClick={() => setMode(mode === "light" ? "dark" : "light")}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: theme.surfaceMuted,
                border: `1px solid ${theme.border}`,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: theme.accent, padding: 0,
                transition: "all 0.2s",
              }}
              title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
              aria-label="Toggle theme"
            >
              {mode === "light" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "28px 24px",
          position: "relative", zIndex: 1,
        }}>
          {messages.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "100%", gap: 16, opacity: 0.85,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: theme.accentGradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontWeight: 700, fontSize: 28, color: "#fff",
                boxShadow: `0 8px 32px ${theme.accent}55`,
              }}>C</div>
              <p style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontSize: 22, color: theme.textPrimary,
                fontWeight: 400, fontStyle: "italic",
              }}>I'm Claudia. How can I help you?</p>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} msg={msg} theme={theme} />)}
          {error && (
            <div style={{
              textAlign: "center", color: theme.accent,
              fontSize: 14, padding: "8px 0",
              fontStyle: "italic",
            }}>{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "14px 20px 18px",
          background: theme.headerBg,
          backdropFilter: "blur(12px)",
          borderTop: `1px solid ${theme.border}`,
          position: "relative", zIndex: 10,
        }}>
          {pendingImages.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "4px 4px 12px" }}>
              {pendingImages.map((img, i) => (
                <ImagePreview key={i} src={img.preview} theme={theme}
                  onRemove={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          <div style={{
            display: "flex", alignItems: "flex-end", gap: 10,
            background: theme.inputBg,
            border: `1.5px solid ${theme.border}`,
            borderRadius: 20,
            padding: "8px 10px 8px 12px",
            boxShadow: theme.shadow,
          }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={pendingImages.length >= 4}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "transparent",
                border: `1px solid ${theme.border}`,
                cursor: pendingImages.length >= 4 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                color: theme.accent, padding: 0,
                opacity: pendingImages.length >= 4 ? 0.4 : 1,
                transition: "all 0.2s",
              }}
              title={pendingImages.length >= 4 ? "Max 4 images" : "Attach image"}
              aria-label="Attach image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple
              style={{ display: "none" }}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustTextarea(); }}
              onKeyDown={handleKey}
              onPaste={onPaste}
              placeholder="Message Claudia…"
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent",
                fontSize: 16, color: theme.textPrimary,
                lineHeight: 1.6, maxHeight: 180, overflowY: "auto",
                padding: "8px 0",
              }}
            />

            <button
              onClick={sendMessage}
              disabled={!canSend}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: canSend ? theme.accentGradient : `${theme.accent}26`,
                border: "none",
                cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, padding: 0,
                transition: "all 0.2s",
                boxShadow: canSend ? `0 2px 12px ${theme.accent}66` : "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={canSend ? "#fff" : theme.accent} />
              </svg>
            </button>
          </div>
          <p style={{
            textAlign: "center", fontSize: 11,
            color: theme.textMuted, marginTop: 10,
            letterSpacing: "0.04em",
          }}>
            Claudia can make mistakes. Built by Paji · powered by claude-sonnet-4.
          </p>
        </div>
      </div>
    </>
  );
}
