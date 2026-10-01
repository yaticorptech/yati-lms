import { Capacitor } from '@capacitor/core';
import { isExternalLink } from './links';

export const isNative = () => Capacitor.isNativePlatform();

/**
 * What the native shell needs from the admin web app, done once at start-up
 * and only inside the app: the splash goes after the first paint, the status
 * bar takes the header's colour, Android's back button walks the app's own
 * history and leaves from the first screen, and links to the outside web open
 * in the system browser sheet rather than navigating the web view away.
 */
export async function initNative() {
    if (!isNative()) return;
    document.documentElement.setAttribute('data-native', Capacitor.getPlatform());
    const [{ App }, { Browser }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
        import('@capacitor/app'), import('@capacitor/browser'), import('@capacitor/splash-screen'), import('@capacitor/status-bar')
    ]);
    requestAnimationFrame(() => setTimeout(() => SplashScreen.hide().catch(() => {}), 50));
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') StatusBar.setBackgroundColor({ color: '#312e81' }).catch(() => {});
    App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && window.history.length > 1) window.history.back();
        else App.exitApp();
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
