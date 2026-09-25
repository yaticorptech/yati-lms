/**
 * A password box with an eye to reveal what was typed.
 *
 * The sign-in page and the settings page already each grew their own copy of
 * this; the organization forms are the third and fourth places to need one, so
 * it is a component rather than a fifth copy. Anyone setting a password they
 * will have to type again later should be able to check they typed it right.
 *
 * `className` is the input's own styling, so each form keeps its look and only
 * the reveal behaviour is shared. The padding on the right is added here, since
 * it belongs to the button rather than to the form's styling.
 */
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordField = ({ className = '', ...props }) => {
    const [shown, setShown] = useState(false);

    return (
        <div className="relative">
            <input
                {...props}
                type={shown ? 'text' : 'password'}
                className={`${className} pr-11`}
            />
            <button
                type="button"
                onClick={() => setShown((v) => !v)}
                // Out of the tab order: someone tabbing through a form is filling
                // it in, not pausing to look at what they typed.
                tabIndex={-1}
                aria-label={shown ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-700"
            >
                {shown ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
};

export default PasswordField;
