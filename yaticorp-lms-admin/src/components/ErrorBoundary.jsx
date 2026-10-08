/**
 * The last line of defence around a panel's page.
 *
 * Without it, one page that throws while rendering unmounts the whole React
 * tree and the admin is left staring at a blank panel with no way back but the
 * address bar. Here the sidebar stays, the page area says what happened, and a
 * reload is one press away.
 *
 * `resetKey` is the current route: moving to another page clears the error, so
 * one broken page does not keep every other page hidden behind this message.
 */
import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { CARD, BTN } from './orgUi';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, resetKey: props.resetKey };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
        return null;
    }

    componentDidCatch(error, info) {
        console.error('Page crashed:', error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div role="alert" className={`${CARD} mx-auto max-w-lg p-8 text-center`}>
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <AlertTriangle size={22} />
                </span>
                <h2 className="font-bold text-slate-800">Something went wrong on this page.</h2>
                <p className="mt-1 text-sm text-slate-500">Reload to try again, or pick another page from the menu.</p>
                <button onClick={() => window.location.reload()} className={`${BTN} mt-5`}>
                    <RotateCw size={16} />Reload page
                </button>
            </div>
        );
    }
}

export default ErrorBoundary;
