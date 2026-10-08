import { Capacitor } from '@capacitor/core';
import { isExternalLink } from './links';
import { showHttpImages } from './httpImages';

export const isNative = () => Capacitor.isNativePlatform();

/**
 * The hardware back press, offered to whatever overlay is open before it
 * navigates. A dialog listening for `yati:back` calls preventDefault() and
 * closes itself (see useBackClose). Returns false when something consumed it.
 */
export const BACK_EVENT = 'yati:back';
export const dispatchBack = () =>
    window.dispatchEvent(new Event(BACK_EVENT, { cancelable: true }));

/**
 * What the native shell needs from the web app, done once at start-up and
 * only inside the app; on the website every branch here is skipped.
 *
 *  - the splash screen stays until the first paint, then goes
 *  - the status bar sits on the header's dark colour
 *  - Android's back button goes back through the app's own history, and
 *    leaves the app from the first screen
 *  - links to the outside web open in the system browser sheet, never by
 *    navigating the app's web view away
 *  - coming back from another app raises `app:resume`, so a screen that
 *    sent the student out (connecting Google) can refresh what it shows
 */
export async function initNative() {
    if (!isNative()) return;
    document.documentElement.setAttribute('data-native', Capacitor.getPlatform());
    showHttpImages();

    const [{ App }, { Browser }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
        import('@capacitor/app'), import('@capacitor/browser'), import('@capacitor/splash-screen'), import('@capacitor/status-bar')
    ]);

    requestAnimationFrame(() => setTimeout(() => SplashScreen.hide().catch(() => {}), 50));
    // Dark icons on white, to sit on the white top bar (Style.Light = for a light background).
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

    App.addListener('backButton', ({ canGoBack }) => {
        // An open dialog gets the press first: Android users expect back to
        // close it, not to leave the screen (or the app) underneath it.
        if (!dispatchBack()) return;
        if (canGoBack && window.history.length > 1) window.history.back();
        else App.exitApp();
    });
    App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) window.dispatchEvent(new Event('app:resume'));
    });

    const origin = window.location.origin;
    document.addEventListener('click', (event) => {
        const a = event.target?.closest?.('a[href]');
        if (!a || event.defaultPrevented) return;
        const href = a.getAttribute('href');
        if (a.target === '_blank' || isExternalLink(href, origin)) {
            event.preventDefault();
            Browser.open({ url: new URL(href, origin).toString() }).catch(() => {});
        }
    }, true);
    const open = window.open.bind(window);
    window.open = (url, target, features) => {
        if (url && (target === '_blank' || isExternalLink(String(url), origin))) {
            Browser.open({ url: new URL(String(url), origin).toString() }).catch(() => {});
            return null;
        }
        return open(url, target, features);
    };
}
