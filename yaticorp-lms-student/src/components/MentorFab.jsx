import { Link, useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';

/**
 * 🤖 The AI mentor, one tap away from anywhere.
 *
 * The mentor knows the student's roadmap, today's plan and what they have
 * finished — which makes it most useful exactly when they are stuck in the
 * middle of something else, and until now it was four clicks away behind
 * Career Path → AI Mentor. A round button pinned to the corner is the shape
 * that convention has already taught everyone means "ask someone".
 *
 * Deliberately a link to the existing mentor page rather than a chat window of
 * its own. That page already carries the conversation history, the markdown
 * rendering, the AI budget notices and the clear-chat control; a second copy
 * living in a popover would be a second thing to keep correct, and the first
 * time they drifted apart the student would get different answers depending on
 * where they asked.
 *
 * Rendered from StudentLayout so it follows the student across every page, and
 * only while Career Path is switched on for them — a button that opens a
 * section they do not have is worse than no button.
 */
export default function MentorFab() {
  const { pathname } = useLocation();
  // The bottom bar is global now, so the button lifts clear of it on every
  // page below md rather than only inside Career Path.

  // Not on the mentor page itself. A button whose whole job is to take you
  // somewhere you already are reads as broken, and here it would also sit on
  // top of the message box it was pointing at.
  if (pathname.startsWith('/mentor')) return null;

  return (
    <Link
      to="/mentor"
      aria-label="Ask your AI mentor"
      title="Ask your AI mentor"
      className={`group fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-journey-600 to-indigo-600 text-white shadow-lg shadow-journey-900/30 transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-500 focus-visible:ring-offset-2 active:scale-95 bottom-28 md:right-6 md:bottom-6`}
    >
      {/* A soft ring rather than a pulse. This sits on every page all day, and
          anything that animates forever in the corner of the eye stops being
          an invitation and becomes something to tune out. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-journey-500/40 blur-md transition-opacity duration-200 group-hover:opacity-80"
      />
      <span
        aria-hidden
        className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400"
      />
      <Bot className="relative h-6 w-6" strokeWidth={2.2} />
    </Link>
  );
}
