import { useEffect, useState } from 'react';
import { isNative } from './platform';

/**
 * Whether the phone's on-screen keyboard is up — inside the iOS or Android
 * app only. On the website it is always false: a browser shrinks the visual
 * viewport for its keyboard and gives no reliable signal, and nothing here
 * should guess.
 *
 * The floating bottom bar is the reason. With Keyboard `resize: 'body'` the
 * page gets shorter as the keyboard rises, and the bar — pinned to the bottom
 * of what is left — sat straight on top of the field being typed in (the
 * reply box under a Community post). While the keyboard is up this also sets
 * data-keyboard="open" on <html>, for any other stylesheet that needs it.
 */
export default function useKeyboardOpen() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!isNative()) return undefined;
        let gone = false;
        const handles = [];
        const root = document.documentElement;
        const set = (up) => {
            if (gone) return;
            setOpen(up);
            if (up) root.setAttribute('data-keyboard', 'open');
            else root.removeAttribute('data-keyboard');
        };
        import('@capacitor/keyboard').then(({ Keyboard }) => {
            if (gone) return;
            // "Will" fires as the keyboard starts to move, so the bar is gone
            // before the keyboard reaches it; on Android it comes with "did".
            for (const [event, up] of [['keyboardWillShow', true], ['keyboardWillHide', false], ['keyboardDidHide', false]]) {
                Promise.resolve(Keyboard.addListener(event, () => set(up)))
                    .then((h) => { if (gone) h?.remove?.(); else handles.push(h); })
                    .catch(() => {});
            }
        }).catch(() => { /* no keyboard plugin in this build: the bar simply stays */ });
        return () => {
            gone = true;
            handles.forEach((h) => h?.remove?.());
            root.removeAttribute('data-keyboard');
        };
    }, []);
    return open;
}
