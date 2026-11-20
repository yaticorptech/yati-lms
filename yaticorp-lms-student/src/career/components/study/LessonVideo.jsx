import { useEffect, useRef, useState } from 'react';
import { Check, MonitorPlay } from 'lucide-react';
import { useMascot } from '../../mascot/useMascot';

/**
 * The lesson video, played through the YouTube IFrame Player API rather than a
 * bare <iframe>.
 *
 * A plain embed is a black box: the page cannot tell whether the student
 * watched a second or the whole thing. The API gives playback state and
 * position, which is what lets the task finish itself instead of asking the
 * student to confirm they watched it.
 *
 * Mirrors the 70% threshold the server uses (90% until 2026-11-20; the user then asked for 50%, then 70%). The server is still the authority
 * — it records the gate and decides completion — this only reports.
 */
const WATCHED_FRACTION = 0.7;
const POLL_MS = 1000;
// The largest jump between two polls that still counts as watching. One poll
// at normal speed moves about a second, at 2x about two; anything bigger is a
// seek, and dragging the bar to the end must not pass the watch gate.
const MAX_STEP_SECONDS = 2.5;
// A tap to skip counts as watched (2026-11-20, the user: "allow them to tap and skip, not drag and skip"): YouTube's
// double-tap jumps 10 seconds on a phone (taps in a row add up: +20, +30 before the next poll), an arrow key 5 on a
// laptop — so a step forward up to this much, in one poll, counts its seconds; a drag of the bar moves much further
// and still does not. (12 seconds until the same day: "for tap and skip the bar is not moving".)
const TAP_SKIP_SECONDS = 32;

let apiPromise = null;

/**
 * Load the IFrame API once per page and hand every caller the same promise.
 *
 * The API calls a single global callback when it is ready, so a second <script>
 * tag would clobber the first one's handler and strand any player waiting on it.
 */
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });

  return apiPromise;
};

/**
 * `initialSeconds` is how much of this video the server already holds as
 * watched (progress.watchedSeconds), so a reload or a second visit carries on
 * from it instead of starting the count at nothing. `watchRejected` changes
 * when the server turned down a "watched" report (it checks the seconds): the
 * gate is then reported again once enough has really played.
 */
export default function LessonVideo({ video, watched, onWatched, onProgress, initialSeconds = 0, watchRejected = 0 }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  // Ref, not state: the poll closure reads this every tick and must see the
  // current value without the interval being torn down and rebuilt.
  const reportedRef = useRef(!!watched);
  // Which whole seconds of the video have actually played, and where the last
  // poll found the playhead. A set rather than a running total, so watching
  // the same minute twice does not count as two minutes of the video.
  const secondsSeenRef = useRef(new Set());
  const lastTimeRef = useRef(null);
  const lastWallRef = useRef(0);

  // The callbacks are read through refs. The player is built once per video,
  // so its poll closure would otherwise keep calling the handlers from the
  // render it was built in — handlers bound to a lesson state since replaced.
  const onWatchedRef = useRef(onWatched);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onWatchedRef.current = onWatched;
    onProgressRef.current = onProgress;
  }, [onWatched, onProgress]);
  // Read when the player is built for a video, not on every change.
  const initialSecondsRef = useRef(initialSeconds);
  useEffect(() => {
    initialSecondsRef.current = initialSeconds;
  }, [initialSeconds]);

  // Where the bar starts: watched, or as far as the saved seconds go.
  const startPercent = () => {
    if (watched) return 100;
    const length = Number(video.durationSeconds) || 0;
    const seen = Math.max(0, Number(initialSeconds) || 0);
    return length > 0 ? Math.min(99, Math.round((seen / length) * 100)) : 0;
  };
  const [percent, setPercent] = useState(startPercent);
  // A new video starts from its own watch state, not the last one's — the bar
  // used to carry over, so a swapped-in video read "Watched" before it played.
  // Adjusted during render so no frame paints the old figure.
  const [shownVideoId, setShownVideoId] = useState(video.videoId);
  if (shownVideoId !== video.videoId) {
    setShownVideoId(video.videoId);
    setPercent(startPercent());
  }
  // The mascot watches along. Read through a ref: the player is built once
  // per video and must not be rebuilt for the mascot's sake.
  const frameRef = useRef(null);
  const mascot = useMascot();
  const mascotRef = useRef(mascot);
  useEffect(() => {
    mascotRef.current = mascot;
  }, [mascot]);

  useEffect(() => {
    reportedRef.current = !!watched;
  }, [watched]);

  // Full screen turns a phone sideways (2026-11-20, the user: "if the user clicks this, rotate the video and show only the
  // video, so the student can reach the settings and captions like on desktop"). YouTube's own ⤢ is inside its frame, so
  // the page cannot change that button — but it is told when the video goes full screen, and then asks the phone to turn
  // to landscape, where YouTube shows its gear (speed, quality) and captions as on a laptop. Leaving full screen lets the
  // phone turn back. Browsers that cannot lock the orientation (iPhone Safari) simply keep their own full screen.
  useEffect(() => {
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (!touch) return undefined;
    const ours = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      const frame = frameRef.current;
      return Boolean(el && frame && (el === frame || frame.contains(el) || el.contains(frame)));
    };
    let locked = false;
    const onChange = () => {
      const orientation = window.screen?.orientation;
      if (ours()) {
        orientation?.lock?.('landscape').then(() => { locked = true; }).catch(() => {});
      } else if (locked) {
        locked = false;
        try { orientation?.unlock?.(); } catch { /* the phone turns back by itself */ }
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      if (locked) { try { window.screen?.orientation?.unlock?.(); } catch { /* nothing to undo */ } }
    };
  }, []);

  // The server turned a "watched" report down: count on and report again.
  useEffect(() => {
    if (watchRejected) reportedRef.current = false;
  }, [watchRejected]);

  useEffect(() => {
    let cancelled = false;
    // Fresh counters for this video. `watched` is the gate as the server has
    // it for this video — false straight after a swap. Seeded with what the
    // server already holds as seen, so the count survives a reload: it used
    // to live only here, in memory, and every reload started it from zero.
    // The server keeps a count, not which seconds, so the seed is the first
    // that many — watching the opening again does not count twice.
    secondsSeenRef.current = new Set(
      Array.from({ length: Math.max(0, Math.floor(Number(initialSecondsRef.current) || 0)) }, (_, s) => s)
    );
    lastTimeRef.current = null;
    lastWallRef.current = 0;
    reportedRef.current = !!watched;
    // The frame the mascot watches, read once: the ref is a node React owns.
    const frame = frameRef.current;
    const stopPolling = () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const tick = () => {
      const player = playerRef.current;
      if (!player?.getDuration) return;

      const duration = player.getDuration() || 0;
      const current = player.getCurrentTime() || 0;
      if (duration <= 0) return;

      // Only small forward steps are watching. A seek (either way) just
      // moves the reference point, so the stretch it skipped stays unseen.
      // "Small" allows for the time that really passed: a background tab
      // polls far less often, and playing on while hidden is still watching,
      // whereas a seek moves the playhead much further than the clock did.
      const last = lastTimeRef.current;
      const now = Date.now();
      const wallSeconds = lastWallRef.current ? (now - lastWallRef.current) / 1000 : 0;
      lastTimeRef.current = current;
      lastWallRef.current = now;
      const rate = player.getPlaybackRate?.() || 1;
      const allowed = Math.max(MAX_STEP_SECONDS, TAP_SKIP_SECONDS, wallSeconds * rate + 1);
      if (last !== null && current > last && current - last <= allowed) {
        for (let s = Math.floor(last); s < Math.ceil(current); s += 1) secondsSeenRef.current.add(s);
      }

      const seen = secondsSeenRef.current.size;
      const fraction = Math.min(1, seen / Math.ceil(duration));
      if (!reportedRef.current) setPercent(Math.round(fraction * 100));

      if (fraction >= WATCHED_FRACTION && !reportedRef.current) {
        reportedRef.current = true;
        stopPolling();
        onWatchedRef.current?.(seen);
      } else {
        onProgressRef.current?.(seen);
      }
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;

      playerRef.current = new YT.Player(hostRef.current, {
        videoId: video.videoId,
        // Keep the privacy-enhanced host the plain embed used.
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onStateChange: (event) => {
            // Poll only while playing. A always-on timer would keep running in
            // a background tab for every lesson the student has left open.
            if (event.data === YT.PlayerState.PLAYING) {
              stopPolling();
              timerRef.current = setInterval(tick, POLL_MS);
            } else {
              stopPolling();
              tick();
              // Time spent paused is not time watched: the first poll after
              // resuming is judged on its own step, not the whole pause.
              lastWallRef.current = 0;
            }

            if (event.data === YT.PlayerState.PLAYING) mascotRef.current.video('playing', frame);
            else if (event.data === YT.PlayerState.PAUSED) mascotRef.current.video('paused', frame);
            else if (event.data === YT.PlayerState.ENDED) mascotRef.current.video('ended', frame);
            // Reaching the end is NOT a pass on its own any more: it used to
            // be, which let a student drag the bar to the last second and
            // finish the gate. The tick above has already counted what was
            // genuinely played, and reports the gate if that is enough.
          }
        }
      });
    });

    return () => {
      cancelled = true;
      stopPolling();
      mascotRef.current.video('gone', frame);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // Re-create the player only when the video itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.videoId]);

  const done = percent >= WATCHED_FRACTION * 100;

  return (
    <div>
      <div ref={frameRef} data-mascot-context="video" className="overflow-hidden rounded-xl border border-line-200/80 bg-black">
        <div className="aspect-video">
          {/* The API replaces this node with its own iframe. */}
          <div ref={hostRef} className="h-full w-full" />
        </div>
      </div>

      {/* Watch progress, so the student can see what the task is waiting on. */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              done ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(2, percent)}%` }}
          />
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 text-xs font-bold tabular-nums ${
            done ? 'text-emerald-600' : 'text-ink-500'
          }`}
        >
          {done ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Watched
            </>
          ) : (
            <>
              <MonitorPlay className="h-3.5 w-3.5" />
              {percent}%
            </>
          )}
        </span>
      </div>

      <div className="mt-3">
        <p className="font-semibold text-ink-900">{video.title}</p>
        <p className="mt-0.5 text-sm text-ink-500">
          {video.channel}
          {video.duration && <span className="text-ink-400"> · {video.duration}</span>}
        </p>
      </div>
    </div>
  );
}
