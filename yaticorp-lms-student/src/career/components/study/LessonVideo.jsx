import { useEffect, useRef, useState } from 'react';
import { Check, MonitorPlay } from 'lucide-react';

/**
 * The lesson video, played through the YouTube IFrame Player API rather than a
 * bare <iframe>.
 *
 * A plain embed is a black box: the page cannot tell whether the student
 * watched a second or the whole thing. The API gives playback state and
 * position, which is what lets the task finish itself instead of asking the
 * student to confirm they watched it.
 *
 * Mirrors the 90% threshold the server uses. The server is still the authority
 * — it records the gate and decides completion — this only reports.
 */
const WATCHED_FRACTION = 0.9;
const POLL_MS = 1000;

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

export default function LessonVideo({ video, watched, onWatched, onProgress }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  // Ref, not state: the poll closure reads this every tick and must see the
  // current value without the interval being torn down and rebuilt.
  const reportedRef = useRef(!!watched);
  const furthestRef = useRef(0);

  const [percent, setPercent] = useState(watched ? 100 : 0);

  useEffect(() => {
    reportedRef.current = !!watched;
  }, [watched]);

  useEffect(() => {
    let cancelled = false;
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

      furthestRef.current = Math.max(furthestRef.current, current);
      const fraction = Math.min(1, furthestRef.current / duration);
      setPercent(Math.round(fraction * 100));

      if (fraction >= WATCHED_FRACTION && !reportedRef.current) {
        reportedRef.current = true;
        stopPolling();
        onWatched?.(Math.floor(furthestRef.current));
      } else {
        onProgress?.(Math.floor(furthestRef.current));
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
            }

            // Reaching the end counts regardless of the sampled fraction —
            // seeking past the last stretch still means they finished it.
            if (event.data === YT.PlayerState.ENDED && !reportedRef.current) {
              reportedRef.current = true;
              setPercent(100);
              onWatched?.(Math.floor(playerRef.current?.getDuration?.() || 0));
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      stopPolling();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // Re-create the player only when the video itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.videoId]);

  const done = percent >= WATCHED_FRACTION * 100;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line-200/80 bg-black">
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
