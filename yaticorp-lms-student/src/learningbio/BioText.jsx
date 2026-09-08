/**
 * The bio's paragraphs. Blank lines separate paragraphs and **double
 * asterisks** mark the phrases to set in bold — the only markup the writer
 * (AI or template) uses, so this is all the renderer understands.
 */
export default function BioText({ text = '', className = '' }) {
    const paragraphs = String(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    // Inline: one paragraph rendered as a span so it can sit inside quotes.
    if (className.includes('inline')) {
        return <span>{paragraphs.join(' ').split(/(\*\*[^*]+\*\*)/g).map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="font-bold text-slate-900">{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>)}</span>;
    }
    return (
        <div className={`space-y-4 ${className}`}>
            {paragraphs.map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-slate-700 sm:text-base">
                    {p.split(/(\*\*[^*]+\*\*)/g).map((part, j) => part.startsWith('**') && part.endsWith('**')
                        ? <strong key={j} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>
                        : <span key={j}>{part}</span>)}
                </p>
            ))}
        </div>
    );
}
