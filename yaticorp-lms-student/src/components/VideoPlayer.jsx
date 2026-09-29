/**
 * @author Preethesh Kulal
 * @description Video player component supporting YouTube, VdoCipher and Bunny.net sources
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { readPosition, writePosition, clearPosition, resumePoint } from '../shared/playback/resume';

// How often a playing video's position is written down.
const SAVE_INTERVAL_MS = 5000;
// How long a buffering spinner may sit before the download is restarted.
const STALL_GRACE_MS = 30000;
// Automatic reload attempts after a media error, with backoff (1s, 2s, 4s).
const MAX_AUTO_RETRIES = 3;

const formatClock = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/**
 * HTML5 player for a plain video file (Bunny Storage, S3, any direct URL).
 *
 * Blocks forward-seeking (no skipping ahead) and reports when the video has
 * been fully watched. Rewatching / seeking backward is allowed.
 *
 * Lesson videos are single large files, so three things used to send a
 * student back to 0:00: a page reload (a phone locking its screen is enough),
 * a connection that died mid-stream and left the element in an error state,
 * and a download that silently stopped while the spinner kept turning. The
 * position is now saved as the video plays and restored on the next load, a
 * failed fetch is retried at that position, and a stalled one is restarted.
 */
const Html5VideoPlayer = ({ url, title, lessonId, resumeFrom, onPositionSaved, onEnded, preventSkip }) => {
    const videoRef = useRef(null);
    // Read once, at mount. The lesson is part of this component's key, so a
    // different lesson is always a fresh mount. The page passes `resumeFrom`
    // when it has a better answer than this device alone (the server's copy,
    // when that is newer); otherwise it is whatever this browser last wrote.
    const [savedPosition] = useState(() => (resumeFrom != null ? Number(resumeFrom) || 0 : readPosition(lessonId)));
    // The page's listener for every position written down, kept in a ref so
    // a new inline callback each render does not re-register the page events.
    const onSavedRef = useRef(onPositionSaved);
    useEffect(() => { onSavedRef.current = onPositionSaved; });
    // Seeded from the saved position so the anti-skip guard treats the
    // restored point as already watched instead of snapping it back to 0:00.
    const maxWatchedRef = useRef(savedPosition);
    const resumeAtRef = useRef(savedPosition);
    const lastTimeRef = useRef(0);          // last position seen, for the save at unmount
    const endedRef = useRef(false);
    const recoveringRef = useRef(false);    // between our own load() and its loadedmetadata
    const shouldPlayRef = useRef(false);    // whether to press play once a recovery has loaded
    const retriesRef = useRef(0);
    const lastSaveRef = useRef(0);
    const stallTimerRef = useRef(null);
    const retryTimerRef = useRef(null);
    // Seconds at which automatic recovery gave up; shows the manual retry.
    const [interruptedAt, setInterruptedAt] = useState(null);
    // Seconds the video was resumed from; shown briefly so 12:34 is not a surprise.
    const [resumedFrom, setResumedFrom] = useState(null);

    /** Write the position down here and, through the page, on the server. `reason` says what prompted it. */
    const persist = useCallback((reason = 'tick') => {
        if (endedRef.current) return;
        const v = videoRef.current;
        const at = v && v.readyState >= 1 && !recoveringRef.current ? v.currentTime : lastTimeRef.current;
        if (at <= 0) return;
        writePosition(lessonId, at);
        if (onSavedRef.current) onSavedRef.current(at, reason);
    }, [lessonId]);

    const clearStallTimer = () => {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
    };

    /** Throw the current media resource away and fetch it again at `seconds`. */
    const restartAt = useCallback((seconds, play) => {
        const v = videoRef.current;
        if (!v) return;
        clearStallTimer();
        resumeAtRef.current = seconds;
        shouldPlayRef.current = play;
        recoveringRef.current = true;
        if (seconds > 0) writePosition(lessonId, seconds);
        v.load();
    }, [lessonId]);

    const positionNow = () => {
        const v = videoRef.current;
        if (v && v.currentTime > 0) return v.currentTime;
        return lastTimeRef.current > 0 ? lastTimeRef.current : readPosition(lessonId);
    };

    const handleLoadedMetadata = () => {
        const v = videoRef.current;
        if (!v) return;
        const recovering = recoveringRef.current;
        const at = resumePoint(resumeAtRef.current, v.duration);
        resumeAtRef.current = 0;
        if (at > 0) {
            maxWatchedRef.current = Math.max(maxWatchedRef.current, at);
            lastTimeRef.current = at;
            v.currentTime = at;
            if (!recovering) setResumedFrom(at);
        }
        recoveringRef.current = false;
        if (recovering && shouldPlayRef.current) {
            shouldPlayRef.current = false;
            v.play().catch(() => {});
        }
    };

    const handleTimeUpdate = () => {
        const v = videoRef.current;
        if (!v || recoveringRef.current) return;
        if (v.currentTime > maxWatchedRef.current) maxWatchedRef.current = v.currentTime;
        lastTimeRef.current = v.currentTime;
        const now = Date.now();
        if (now - lastSaveRef.current >= SAVE_INTERVAL_MS) {
            lastSaveRef.current = now;
            persist('tick');
        }
    };

    // If the user tries to jump ahead of the furthest point watched, snap back.
    const handleSeeking = () => {
        if (!preventSkip) return;
        const v = videoRef.current;
        if (v && v.currentTime > maxWatchedRef.current + 1) {
            v.currentTime = maxWatchedRef.current;
        }
    };

    const handlePlay = () => {
        endedRef.current = false;
    };

    const handlePlaying = () => {
        clearStallTimer();
        retriesRef.current = 0;
        setInterruptedAt(null);
    };

    const handlePause = () => {
        clearStallTimer();
        persist('pause');
    };

    const handleEnded = () => {
        endedRef.current = true;
        lastTimeRef.current = 0;
        clearPosition(lessonId);
        if (onSavedRef.current) onSavedRef.current(0, 'ended');
        if (onEnded) onEnded();
    };

    /**
     * Buffering. Normally the browser fills the buffer and carries on by
     * itself. If the spinner is still there after the grace period and the
     * browser has stopped downloading, the connection died under it and it
     * will never resume on its own: fetch again from where it stopped.
     */
    const handleWaiting = () => {
        clearStallTimer();
        stallTimerRef.current = setTimeout(() => {
            const v = videoRef.current;
            if (!v || v.paused || v.ended || recoveringRef.current) return;
            if (v.readyState >= v.HAVE_FUTURE_DATA || v.networkState === v.NETWORK_LOADING) {
                // Playing again, or only slow. Keep watching.
                handleWaiting();
                return;
            }
            restartAt(positionNow(), true);
        }, STALL_GRACE_MS);
    };

    /**
     * The fetch failed. With a src attribute this fires for a dropped
     * connection mid-stream as well as a file that never loads; either way
     * the element is dead until it is loaded again. Retry a few times with
     * backoff, then hand the decision to the student.
     */
    const handleError = () => {
        const v = videoRef.current;
        // Code 1 is an abort: the user leaving, or our own load(). Nothing to recover.
        if (!v || !v.error || v.error.code === v.error.MEDIA_ERR_ABORTED) return;
        clearStallTimer();
        const at = positionNow();
        const play = shouldPlayRef.current || !v.paused;
        if (retriesRef.current >= MAX_AUTO_RETRIES) {
            recoveringRef.current = false;
            shouldPlayRef.current = play;
            setInterruptedAt(at);
            return;
        }
        const delay = 1000 * 2 ** retriesRef.current;
        retriesRef.current += 1;
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => restartAt(at, play), delay);
    };

    const retryNow = () => {
        const at = interruptedAt || 0;
        retriesRef.current = 0;
        setInterruptedAt(null);
        restartAt(at, true);
    };

    // The position is written when the page is hidden or unloaded, and when
    // this player goes away (another lesson opened, or the course left).
    useEffect(() => {
        const onVisibility = () => { if (document.visibilityState === 'hidden') persist('hidden'); };
        const onPageHide = () => persist('unload');
        window.addEventListener('pagehide', onPageHide);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pagehide', onPageHide);
            document.removeEventListener('visibilitychange', onVisibility);
            clearTimeout(stallTimerRef.current);
            clearTimeout(retryTimerRef.current);
            persist('unmount');
        };
    }, [persist]);

    useEffect(() => {
        if (resumedFrom == null) return undefined;
        const t = setTimeout(() => setResumedFrom(null), 4000);
        return () => clearTimeout(t);
    }, [resumedFrom]);

    return (
        <>
            <video
                ref={videoRef}
                src={url}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onPlay={handlePlay}
                onPlaying={handlePlaying}
                onPause={handlePause}
                onWaiting={handleWaiting}
                onError={handleError}
                onEnded={handleEnded}
                className="w-full h-full absolute inset-0 rounded-2xl bg-black"
                title={title}
            >
                Your browser does not support the video tag.
            </video>

            {resumedFrom != null && (
                <div className="absolute top-3 left-3 z-10 pointer-events-none rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white animate-fade-in">
                    Resumed from {formatClock(resumedFrom)}
                </div>
            )}

            {interruptedAt != null && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/80 p-6 text-center text-white">
                    <p className="font-semibold">
                        {interruptedAt > 0 ? 'Playback was interrupted.' : 'The video could not be loaded.'}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                        Check your connection, then try again.
                    </p>
                    <button
                        type="button"
                        onClick={retryNow}
                        className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold hover:bg-indigo-700"
                    >
                        {interruptedAt > 0 ? `Resume from ${formatClock(interruptedAt)}` : 'Try again'}
                    </button>
                </div>
            )}
        </>
    );
};

const VdoCipherPlayer = ({ videoId, title }) => {
    const [otpData, setOtpData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOTP = async () => {
            try {
                const res = await api.post('/vdocipher/generate-otp', { videoId });
                if (res.data.otp && res.data.playbackInfo) {
                    setOtpData(res.data);
                } else {
                    setError('Failed to securely load video');
                }
            } catch (err) {
                console.error("VdoCipher OTP Error:", err);
                setError('Error loading video. Please try again.');
            }
        };

        if (videoId) fetchOTP();
    }, [videoId]);

    if (error) {
        return <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center absolute inset-0 text-red-400 rounded-2xl">
            <span className="font-semibold">{error}</span>
        </div>;
    }

    if (!otpData) {
        return <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center absolute inset-0 text-indigo-400 rounded-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-3"></div>
            <span className="animate-pulse text-sm">Loading Secure Player...</span>
        </div>;
    }

    return (
        <iframe
            src={`https://player.vdocipher.com/v2/?otp=${otpData.otp}&playbackInfo=${otpData.playbackInfo}`}
            title={title || "VdoCipher Secure Player"}
            frameBorder="0"
            allow="encrypted-media; autoplay; picture-in-picture"
            allowFullScreen
            className="w-full h-full absolute inset-0 rounded-2xl"
        ></iframe>
    );
};

const VideoPlayer = ({ source, url, videoId, libraryId, title, lessonId, resumeFrom, onPositionSaved, onEnded, preventSkip }) => {

    // 1. YouTube Player
    if (source === 'youtube' || (!source && url && url.includes('youtube'))) {
        const getYoutubeId = (testUrl) => {
            if (!testUrl) return null;
            const regExp = /^.*(youtu\.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
            const match = testUrl.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        };

        const ytId = videoId || getYoutubeId(url);

        if (!ytId) return <div className="text-white">Invalid YouTube URL or ID</div>;

        return (
            <iframe
                src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autohide=1&showinfo=0`}
                title={title || "YouTube Video Player"}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full absolute inset-0 rounded-2xl"
            ></iframe>
        );
    }

    // 2. VdoCipher Secure Player
    if (source === 'vdocipher') {
        if (!videoId) return <div className="w-full h-full bg-slate-900 flex items-center justify-center absolute inset-0 text-white rounded-2xl">Missing VdoCipher Video ID</div>;

        return <VdoCipherPlayer videoId={videoId} title={title} />;
    }

    // 3. Bunny.net Stream Player
    if (source === 'bunny') {
        if (!videoId || !libraryId) {
            return (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center absolute inset-0 text-white rounded-2xl">
                    <span className="mb-2">Missing Bunny.net Configuration</span>
                    <span className="text-xs opacity-50">Video ID: {videoId || 'N/A'}, Library ID: {libraryId || 'N/A'}</span>
                </div>
            );
        }

        return (
            <iframe
                src={`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true`}
                loading="lazy"
                className="w-full h-full absolute inset-0 rounded-2xl border-none"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen={true}
                title={title || "Bunny.net Video Player"}
            ></iframe>
        );
    }

    // 3. Generic / AWS HTML5 Player (controlled — blocks skipping, reports completion)
    if (source === 'generic' || source === 'aws' || url) {
        // Keyed by lesson as well as URL: the saved position belongs to the
        // lesson, and is read once when the player mounts.
        return (
            <Html5VideoPlayer
                key={`${lessonId || ''}:${url}`}
                url={url}
                title={title}
                lessonId={lessonId}
                resumeFrom={resumeFrom}
                onPositionSaved={onPositionSaved}
                onEnded={onEnded}
                preventSkip={preventSkip}
            />
        );
    }

    return (
        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center absolute inset-0 text-slate-500 rounded-2xl">
            <span className="mb-2">No supported video source configured.</span>
            <span className="text-xs opacity-50">Source: {source || 'None'}</span>
        </div>
    );
};

export default VideoPlayer;
