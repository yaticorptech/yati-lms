/**
 * @author Preethesh Kulal
 * @description Video player component supporting YouTube, VdoCipher and Bunny.net sources
 */
import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

/**
 * HTML5 player that blocks forward-seeking (no skipping ahead) and reports when
 * the video has been fully watched. Rewatching / seeking backward is allowed.
 */
const Html5VideoPlayer = ({ url, title, onEnded, preventSkip }) => {
    const videoRef = useRef(null);
    const maxWatchedRef = useRef(0);

    const handleTimeUpdate = () => {
        const v = videoRef.current;
        if (v && v.currentTime > maxWatchedRef.current) {
            maxWatchedRef.current = v.currentTime;
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

    return (
        <video
            ref={videoRef}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onEnded={() => onEnded && onEnded()}
            className="w-full h-full absolute inset-0 rounded-2xl bg-black"
            title={title}
        >
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
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

const VideoPlayer = ({ source, url, videoId, libraryId, title, onEnded, preventSkip }) => {

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
        return <Html5VideoPlayer key={url} url={url} title={title} onEnded={onEnded} preventSkip={preventSkip} />;
    }

    return (
        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center absolute inset-0 text-slate-500 rounded-2xl">
            <span className="mb-2">No supported video source configured.</span>
            <span className="text-xs opacity-50">Source: {source || 'None'}</span>
        </div>
    );
};

export default VideoPlayer;
