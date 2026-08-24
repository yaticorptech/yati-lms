// lucide-react v1 removed brand icons (Youtube among them), so the channel
// chip uses the generic MonitorPlay instead.
import { Play, ExternalLink, MonitorPlay } from 'lucide-react';

/**
 * Suggested viewing for a skill.
 *
 * Each card opens a YouTube *search*, not a specific video. The model cannot
 * know real video IDs, and inventing them produces dead links; a search query
 * always lands on current, real results.
 */
export default function VideoList({ videos }) {
  if (!videos?.length) return null;

  return (
    <div className="space-y-3">
      {videos.map((video, i) => (
        <a
          key={i}
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.searchQuery || video.topic || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border border-line-200/80 p-4 transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50/30 hover:shadow-card"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-colors group-hover:bg-solid-rose group-hover:text-white">
            <Play className="h-5 w-5 fill-current" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink-900">{video.topic}</span>
            {video.why && (
              <span className="mt-0.5 block text-sm leading-relaxed text-ink-500">{video.why}</span>
            )}
            <span className="mt-2 flex flex-wrap items-center gap-2">
              {video.channel && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                  <MonitorPlay className="h-3 w-3" />
                  {video.channel}
                </span>
              )}
              {video.searchQuery && (
                <span className="truncate text-xs text-ink-400">“{video.searchQuery}”</span>
              )}
            </span>
          </span>

          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink-300 transition-colors group-hover:text-rose-500" />
        </a>
      ))}

      <p className="pt-1 text-xs leading-relaxed text-ink-400">
        These open a YouTube search rather than one fixed video, so you always get current
        results instead of a link that may have been taken down.
      </p>
    </div>
  );
}
