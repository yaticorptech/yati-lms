/* Kept in its own file so AiKeySettings.jsx exports only components (react-refresh), 2026-11-16. */
// The three screens a student goes through in Google AI Studio, drawn as
// mock-ups in public/illustrations/ai-key.
export const KEY_STEPS = [
    { img: 'step1.svg', title: 'Open Google AI Studio', text: 'Go to aistudio.google.com/app/apikey and sign in with your Google account.' },
    { img: 'step2.svg', title: 'Create an API key', text: 'Click "Create API key", pick the default project, then "Create key".' },
    { img: 'step3.svg', title: 'Copy and paste it here', text: 'Copy the key (it starts with AIza), paste it in the box and tap "Save key".' }
];
