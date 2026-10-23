import { Loader2 } from 'lucide-react';

/** Shown inside the panel, menu and all, while a page's code is still on its way (pages load when first opened). */
export default function PageLoading() {
    return (
        <div className="flex justify-center py-24" role="status" aria-label="Loading">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
    );
}
