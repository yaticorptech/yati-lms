/**
 * The mascot's gesture stills: whole-character poses cut from the official pose
 * sheets, served from public/mascot/stills. The rig only breathes, walks and
 * blinks — every gesture the mascot makes is one of these pictures.
 */

// The ones the LMS reacts with come first, so they are cached before the rest.
export const STILLS = [
    'wave-hi', 'cheer-jump', 'sad', 'confetti-cheer', 'star-celebrate', 'meditating', 'wink-point',
    'clapping', 'curious-question', 'flex-content', 'flex-determined', 'heart-hands', 'jump-cheer',
    'point-right', 'presenting', 'running', 'sad-slump', 'shocked', 'surprised-gasp', 'thinking',
    'thumbs-up', 'thumbs-up-wink', 'walk-wave', 'wink-jump', 'worried'
];

export const stillUrl = (name) => `/mascot/stills/${name}.png`;

const pending = new Map();

/**
 * Fetches and decodes an image once; every later call shares that promise.
 * Resolves when the picture can be put on screen without a blank frame, and
 * rejects when it cannot load at all — that failure is not kept, so the next
 * call tries again.
 */
export function loadImage(url, priority = 'auto') {
    let load = pending.get(url);
    if (!load) {
        const img = new Image();
        img.decoding = 'async';
        img.fetchPriority = priority;
        load = new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`mascot image did not load: ${url}`));
            img.src = url;
        }).then((ready) => ready.decode().then(() => ready, () => ready));
        pending.set(url, load);
        load.catch(() => pending.delete(url));
    }
    return load;
}

export const loadStill = (name, priority) => loadImage(stillUrl(name), priority);

/** Every still, at low priority so the lesson's own content is fetched first. */
export const preloadStills = () => {
    for (const name of STILLS) loadStill(name, 'low').catch(() => {});
};
