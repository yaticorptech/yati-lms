import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { readAiBudgetError } from '../../utils/aiBudget';
import { Send, Trash2, Bot, User as UserIcon, Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toMentorMarkdown } from '../../utils/mentorMarkdown';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const SUGGESTIONS = [
  'What should I work on today?',
  'What is next on my roadmap?',
  'Am I on the right track?',
  'How do I stay motivated?'
];

/**
 * How the mentor's markdown is drawn.
 *
 * This is not decoration — without it the replies are unreadable. Tailwind's
 * reset strips `list-style` and padding from every `ul`, and the `prose`
 * classes that used to be here restored none of it because the typography
 * plugin was never installed. A three-point answer rendered as four sentences
 * run together with no bullets, no indent and no gaps, so there was no way to
 * tell where one point ended and the next began.
 *
 * Styling the elements directly keeps that fixed without adding a dependency,
 * and `node` is pulled out of the props so React is not handed an unknown
 * attribute for every element.
 */
const MARKDOWN = {
  p: ({ node: _node, ...props }) => <p className="mb-2.5 leading-relaxed last:mb-0" {...props} />,
  ul: ({ node: _node, ...props }) => (
    <ul className="mb-2.5 list-disc space-y-1.5 pl-5 last:mb-0 marker:text-brand-400" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="mb-2.5 list-decimal space-y-1.5 pl-5 last:mb-0 marker:text-ink-400" {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-bold text-ink-900" {...props} />,
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-link underline underline-offset-2 hover:text-link-strong"
      {...props}
    />
  ),
  code: ({ node: _node, ...props }) => (
    <code
      className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[0.85em] text-ink-800"
      {...props}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre className="mb-2.5 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 last:mb-0" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="mb-2.5 border-l-2 border-line-300 pl-3 text-ink-600 italic last:mb-0" {...props} />
  ),
  // The mentor is told not to use headings, but a stray one should read as a
  // lead-in rather than as 2em of display type inside a chat bubble.
  h1: ({ node: _node, ...props }) => <p className="mt-3 mb-1 font-bold text-ink-900 first:mt-0" {...props} />,
  h2: ({ node: _node, ...props }) => <p className="mt-3 mb-1 font-bold text-ink-900 first:mt-0" {...props} />,
  h3: ({ node: _node, ...props }) => <p className="mt-3 mb-1 font-bold text-ink-900 first:mt-0" {...props} />,
  hr: () => <hr className="my-3 border-line-200" />
};

const timeOf = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Copy a reply, with the button confirming it worked. */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))}
      aria-label={copied ? 'Copied' : 'Copy this reply'}
      // Hidden until the message is hovered or the button itself is focused, so
      // a column of copy icons does not compete with the conversation.
      className="rounded-md p-1.5 text-ink-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-surface-100 hover:text-ink-600 focus-visible:opacity-100"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function MentorChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  // Whether the list has been positioned once. The first positioning must be
  // instant — animating a scroll on arrival looks like a glitch.
  const settledRef = useRef(false);

  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    let cancelled = false;
    api
      .get('/chat')
      .then(({ data }) => {
        if (!cancelled) setMessages(data);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll the message list, NOT the document. `scrollIntoView` walks up to
  // every scrollable ancestor including the window, so loading a long history
  // used to yank the whole dashboard down the page.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: settledRef.current ? 'smooth' : 'auto' });
    settledRef.current = true;
  }, [messages, loading, loadingHistory]);

  // Grow with the question. A one-line input hid the start of anything longer
  // than a sentence, so students could not read back what they were asking.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(
    async (raw) => {
      const text = String(raw || '').trim();
      if (!text || loading) return;

      setInput('');
      setMessages((prev) => [
        ...prev,
        { role: 'user', message: text, createdAt: new Date().toISOString() }
      ]);
      setLoading(true);

      try {
        const { data } = await api.post('/chat', { message: text });
        setMessages((prev) => [...prev, data.aiMessage]);
      } catch (err) {
        const budget = readAiBudgetError(err);
        const reason = err.response?.data?.message || 'Failed to reach the AI mentor.';
        // Flagged rather than dressed up as a reply. It is not persisted, so
        // rendering it as the mentor speaking would put words in its mouth that
        // vanish on reload.
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', message: reason, isError: true, createdAt: new Date().toISOString() }
        ]);
        // A spent allowance is not "something went wrong" — nothing did, and
        // an alarming red toast for an expected limit teaches students to
        // distrust the ones that matter.
        if (budget) {
          toast.info(reason, "That's today's AI allowance");
        } else {
          toast.error(reason);
        }
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [loading, toast]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e) => {
    // Enter sends; Shift+Enter starts a new line. Without this a textarea would
    // make sending a two-step job that the old single-line input did in one.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Clear chat history?',
      message:
        'This permanently deletes your conversation with the AI mentor. Your roadmap, tasks, and progress are not affected.',
      confirmLabel: 'Clear history',
      destructive: true
    });
    if (!ok) return;

    try {
      await api.delete('/chat');
      setMessages([]);
      toast.success('Chat history cleared.');
      inputRef.current?.focus();
    } catch {
      toast.error('Could not clear the chat history.');
    }
  };

  const isEmpty = !loadingHistory && messages.length === 0;

  return (
    /* Taller allowance on phones: the dashboard adds a mobile menu bar under
       the global navbar, and mobile browser chrome eats more height again. */
    <div className="flex h-[calc(100vh-15rem)] min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-line-200/80 bg-surface shadow-card sm:h-[calc(100vh-11rem)]">
      {/* ---------------------------------------------------------------
          Header. The same gradient and dot field as the roadmap hero and
          the profile banner — this was the one flat brand-700 slab left.
      --------------------------------------------------------------- */}
      <div className="relative shrink-0 overflow-hidden fp-journey-gradient px-6 py-4 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0 rounded-xl bg-white/15 p-2 ring-1 ring-white/20 ring-inset">
              <Bot className="h-6 w-6" />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-journey-800 bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black">🤖 Your career copilot</h2>
              <p className="truncate text-sm text-journey-200">
                Knows your roadmap, today&apos;s plan and what you have finished
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              title="Clear chat"
              aria-label="Clear chat history"
              className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/15 active:scale-95"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------
          Messages
      --------------------------------------------------------------- */}
      <div
        ref={listRef}
        // Announced politely so a screen-reader user hears the reply arrive
        // instead of having to go looking for it.
        role="log"
        aria-live="polite"
        aria-label="Conversation with your AI mentor"
        className="flex-1 space-y-5 overflow-y-auto bg-surface-50/70 p-6"
      >
        {/* A skeleton, not the welcome screen. Rendering the empty state while
            the history was still in flight meant returning students saw "Hi!
            I'm your AI Mentor" flash up and then get replaced by their own
            conversation. */}
        {loadingHistory && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <div className="skeleton h-11 w-52 rounded-2xl" />
            </div>
            <div className="flex gap-3">
              <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
              <div className="skeleton h-24 w-4/5 rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <div className="skeleton h-11 w-44 rounded-2xl" />
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100 ring-inset">
              <Sparkles className="h-8 w-8 text-brand-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink-900">Ask me anything about your path.</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-500">
                I can see your career goal, which roadmap phase you are on, what is on your plan
                today and what you have left unfinished.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line-200 bg-surface px-4 py-2 text-sm font-medium text-link shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const time = timeOf(msg.createdAt);

          return (
            <div
              key={msg._id || `${msg.role}-${i}`}
              className={`group animate-fade-in-up flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isUser
                      ? 'bg-brand-100 text-link'
                      : msg.isError
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-brand-50 text-link'
                  }`}
                >
                  {isUser ? (
                    <UserIcon className="h-4 w-4" />
                  ) : msg.isError ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className={`min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-left text-sm shadow-sm ${
                      isUser
                        ? 'rounded-tr-sm bg-brand-600 text-white'
                        : msg.isError
                          ? 'rounded-tl-sm border border-rose-200 bg-rose-50 text-rose-900'
                          : 'rounded-tl-sm border border-line-200 bg-surface text-ink-700'
                    }`}
                  >
                    {isUser ? (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    ) : (
                      <ReactMarkdown components={MARKDOWN}>
                        {toMentorMarkdown(msg.message)}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Timestamp and copy sit under the bubble, so neither
                      interrupts the reading line. */}
                  <div
                    className={`mt-1 flex items-center gap-1 px-1 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {time && <span className="text-[0.7rem] text-ink-400 tabular-nums">{time}</span>}
                    {!isUser && !msg.isError && <CopyButton text={msg.message} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-link">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-line-200 bg-surface px-4 py-4 shadow-sm">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
                <span className="sr-only">Your mentor is thinking</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------
          Composer
      --------------------------------------------------------------- */}
      <div className="shrink-0 border-t border-line-200 bg-surface p-4">
        {/* The prompts used to exist only on the welcome screen, so they were
            gone for good the moment a student asked their first question.
            They come back whenever the box is empty. */}
        {!isEmpty && !input.trim() && !loading && messages.length > 0 && (
          <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-line-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-600 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-link-strong"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your mentor anything…"
            aria-label="Message"
            className="max-h-40 flex-1 resize-none rounded-xl border border-line-300 bg-surface-50 px-4 py-3 text-sm leading-relaxed transition-all outline-none focus:border-brand-500 focus:bg-surface focus:ring-4 focus:ring-brand-500/10"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="flex shrink-0 items-center justify-center rounded-xl bg-brand-600 p-3 text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:active:scale-100"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
