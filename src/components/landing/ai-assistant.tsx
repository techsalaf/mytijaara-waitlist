import { useState, useRef, useEffect, useId } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { getResponse } from "./knowledge-base";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/* ------------------------------------------------------------------ */
/* Knowledge base — see ./knowledge-base.ts                            */
/* Deterministic, weighted keyword matching. Zero API/token cost.      */
/* Edit knowledge-base.ts to add or update what Camila knows.          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Quick action chips                                                        */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  "What is MyTijaara?",
  "How do I join the waitlist?",
  "When does it launch?",
  "What services are offered?",
];

/* ------------------------------------------------------------------ */
/* Typing indicator                                                     */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-1.5 h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat message                                                         */
/* ------------------------------------------------------------------ */

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-up`}>
      {!isUser && (
        <div className="mr-2 mt-1 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-primary/10">
          <Sparkles className="h-3 w-3 text-primary" />
        </div>
      )}
      <div
        className={[
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        ].join(" ")}
      >
        {message.content}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

/**
 * Floating AI assistant chat widget — fixed bottom-right.
 * Zero external API calls: responses are pure keyword-matching.
 * Animations are CSS-based (tw-animate-css + Tailwind transitions).
 */
export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! 👋 I'm Camila — ask me anything about MyTijaara, or tap a quick question below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: trimmed },
    ]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const reply = getResponse(trimmed);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
    }, 550 + Math.random() * 350);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Chat panel */}
      <div
        role="dialog"
        aria-labelledby={headingId}
        aria-modal="false"
        aria-hidden={!isOpen}
        className={[
          "w-[340px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-elegant pointer-events-auto",
          "transition-all duration-200 ease-out origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-primary px-4 py-3">
          <div className="relative">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p id={headingId} className="text-sm font-semibold text-white">CamilaAI</p>
            <p className="text-xs text-white/70">MyTijaara Assistant · Always online</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="cursor-pointer rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-72 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick action chips */}
        <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2.5">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={isTyping}
              className="cursor-pointer rounded-full border border-primary/25 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask anything…"
            aria-label="Type a message"
            tabIndex={isOpen ? 0 : -1}
            className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="grid h-9 w-9 cursor-pointer flex-shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close CamilaAI assistant" : "Chat with CamilaAI, our AI assistant"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 pointer-events-auto"
      >
        {/* Icon swap via opacity transition */}
        <span
          className={[
            "absolute inset-0 grid place-items-center transition-all duration-150",
            isOpen ? "opacity-0 scale-75 rotate-90" : "opacity-100 scale-100 rotate-0",
          ].join(" ")}
          aria-hidden={isOpen}
        >
          <MessageCircle className="h-6 w-6" />
        </span>
        <span
          className={[
            "absolute inset-0 grid place-items-center transition-all duration-150",
            isOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-90",
          ].join(" ")}
          aria-hidden={!isOpen}
        >
          <X className="h-6 w-6" />
        </span>

        {/* Attention pulse ring — only when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25 pointer-events-none" />
        )}
      </button>
    </div>
  );
}