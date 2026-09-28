/**
 * Renders its children at the end of <body> instead of where it is written.
 *
 * For popups. Every page sits inside a wrapper that is `relative z-0`, which
 * makes it one layer: a popup inside it with z-[150] still ranks below the
 * phone's bottom bar (z-40) and top bar (z-50), which live outside it — so on
 * a short screen a popup's buttons ended up underneath the bottom bar. Out
 * here its z-index means what it says. React still treats it as part of the
 * component it came from, so its events and state are unchanged.
 */
import { createPortal } from 'react-dom';

export default function Portal({ children }) {
    return typeof document === 'undefined' ? children : createPortal(children, document.body);
}
