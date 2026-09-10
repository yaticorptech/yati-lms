/**
 * @author Preethesh Kulal
 * @description Student community forum: create posts, view discussions, add comments
 */
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, X, MessageCircle, AlertCircle, Sparkles, HelpCircle, Lightbulb, Users, Clock3 } from 'lucide-react';
import { CommunityArt, FirstPostArt } from '../components/PageArt';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import useAutoRefresh from '../hooks/useAutoRefresh';
import YatiLoader from '../components/YatiLoader';
import useMinimumLoading from '../hooks/useMinimumLoading';

const Community = () => {
    const { user } = useContext(AuthContext);
    const [posts, setPosts] = useState([]);
    const [_loading, setLoading] = useState(true);
    // Only the first load shows the loader; the 30-second refreshes stay
    // silent so the list does not blink away while someone is reading it.
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [submitting, setSubmitting] = useState(false);
    const [editingPostId, setEditingPostId] = useState(null);
    const [deletePostId, setDeletePostId] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/community');
            setPosts(res.data.posts);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch community posts:', err);
            setError('Failed to load community discussions. Please try again.');
        } finally {
            setLoading(false);
            setLoaded(true);
        }
    };

    useAutoRefresh(fetchPosts, 30000);
    const showLoader = useMinimumLoading(!loaded);

    const replyTotal = (posts || []).reduce((n, p) => n + (p.commentCount || 0), 0);

    // "3 hours ago" reads faster than a date on a feed.
    const timeAgo = (iso) => {
        const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)} min ago`;
        if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
        if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
        return new Date(iso).toLocaleDateString();
    };
    const openWith = (title) => {
        setEditingPostId(null);
        setNewPost({ title, content: '' });
        setShowModal(true);
    };

    useEffect(() => {
    if (toast.show) {
        const timer = setTimeout(() => {
            setToast({ show: false, message: '', type: '' });
        }, 3000);

        return () => clearTimeout(timer);
    }
}, [toast]);

const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    setSubmitting(true);
    try {

        // ✅ ADD THIS CONDITION (only change)
        if (editingPostId) {
            const res = await api.put(`/community/${editingPostId}`, newPost);

            setPosts(posts.map(post =>
                post._id === editingPostId ? res.data.post : post
            ));

            setEditingPostId(null);
        } else {
            // ✅ SAME OLD LOGIC (unchanged)
            const res = await api.post('/community', newPost);

            setPosts([{ ...res.data.post, commentCount: 0 }, ...posts]);
        }

        setShowModal(false);
        setNewPost({ title: '', content: '' });

    } catch (err) {
        console.error('Failed:', err);
        try {

    if (editingPostId) {
        const res = await api.put(`/community/${editingPostId}`, newPost);

        setPosts(posts.map(post =>
            post._id === editingPostId ? res.data.post : post
        ));

        setEditingPostId(null);

        setToast({ show: true, message: 'Post updated successfully', type: 'success' });

    } else {
        const res = await api.post('/community', newPost);

        setPosts([{ ...res.data.post, commentCount: 0 }, ...posts]);

        setToast({ show: true, message: 'Post created successfully', type: 'success' });
    }

    setShowModal(false);
    setNewPost({ title: '', content: '' });

} catch (err) {
    console.error('Failed:', err);

    setToast({ show: true, message: 'Failed to create post', type: 'error' });
}
    } finally {
        setSubmitting(false);
    }
};
    const handleDeletePost = async (postId) => {
    try {
        await api.delete(`/community/${postId}`);
        setPosts(posts.filter(post => post._id !== postId));
        setDeletePostId(null);
    } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete post");
    }
};

const handleEditPost = (post) => {
    setNewPost({ title: post.title, content: post.content });
    setShowModal(true);
    setEditingPostId(post._id);
};

    return (
        <div className="space-y-6 animate-fade-in relative max-w-5xl mx-auto">
            <div className="lms-rise lms-sheen relative overflow-hidden rounded-3xl bg-[#3b2bd6] p-6 text-white shadow-xl shadow-indigo-500/25 md:p-8">
                {/* Layered sky: a diagonal wash, two colour glows, a fine dot
                    grid and a highlight along the top edge. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600" />
                <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-36 h-96 w-96 rounded-full bg-amber-300/30 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-400/25 blur-3xl" />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.16]"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
                />
                <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                {/* Drifting chatter around the card. */}
                <span aria-hidden className="cm-drift pointer-events-none absolute top-6 left-[46%] hidden text-2xl md:block" style={{ animationDelay: '-1.2s' }}>💬</span>
                <span aria-hidden className="cm-drift pointer-events-none absolute bottom-8 left-[58%] hidden text-xl md:block" style={{ animationDelay: '-3.4s' }}>❓</span>
                <span aria-hidden className="cm-drift pointer-events-none absolute top-1/2 right-6 hidden text-xl md:block" style={{ animationDelay: '-2.1s' }}>✨</span>
                <span aria-hidden className="cm-drift pointer-events-none absolute top-5 right-[22%] hidden text-lg md:block" style={{ animationDelay: '-0.5s' }}>💡</span>

                <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[0.7rem] font-black tracking-[0.18em] text-indigo-100 uppercase">
                            <Users size={14} />
                            Community
                        </p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                            Ask, share, <span className="lms-shimmer bg-gradient-to-r from-amber-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">learn together.</span>
                        </h1>
                        <p className="mt-2 max-w-lg text-sm font-medium text-indigo-100 sm:text-base">
                            Questions, tips and wins from students and instructors. Nobody learns alone here.
                        </p>

                        <div className="lms-stagger mt-5 flex flex-wrap items-center gap-2.5">
                            <button
                                onClick={() => openWith('')}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-900/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-50 active:scale-[0.98]"
                            >
                                <Plus size={18} strokeWidth={2.6} />
                                Start a discussion
                            </button>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 ring-inset tabular-nums">
                                <MessageSquare size={14} />
                                {posts?.length || 0} {posts?.length === 1 ? 'discussion' : 'discussions'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 ring-inset tabular-nums">
                                <MessageCircle size={14} />
                                {replyTotal} {replyTotal === 1 ? 'reply' : 'replies'}
                            </span>
                        </div>
                    </div>

                    {/* The mascot on its own lit stage: a spotlight behind it,
                        a platform under it, a slow ring going out. Wide enough
                        that a raised arm never meets the card's edge. */}
                    <div aria-hidden className="relative hidden h-52 w-64 items-end justify-center pb-3 md:flex">
                        <span className="cm-glow absolute bottom-6 left-1/2 h-40 w-40 rounded-full bg-white/35 blur-2xl" />
                        <span className="cm-ring absolute bottom-3 left-1/2 h-10 w-44 rounded-[50%] border-2 border-white/50" />
                        <span className="absolute bottom-2 left-1/2 h-9 w-44 -translate-x-1/2 rounded-[50%] bg-indigo-950/30" />
                        <span className="absolute bottom-4 left-1/2 h-9 w-44 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-white/70 to-indigo-100/60 shadow-lg" />
                        <span className="absolute bottom-[26px] left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%] bg-white/50" />
                        <CommunityArt className="mc-pop relative h-44 w-44" />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100">
                    <AlertCircle className="mr-3" size={24} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="lms-stagger grid grid-cols-1 gap-4">
                {showLoader ? (
                    <YatiLoader label="Loading the community" />
                ) : !posts || posts.length === 0 ? (
                    <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-pink-50 p-8 text-center sm:p-12">
                        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
                        <div className="relative mx-auto flex h-40 w-44 items-end justify-center" aria-hidden>
                            <span className="absolute bottom-1 left-1/2 h-5 w-28 -translate-x-1/2 rounded-full bg-indigo-400/30 blur-lg" />
                            <FirstPostArt className="relative h-36 w-36" />
                        </div>
                        <h3 className="relative mt-3 text-2xl font-black text-slate-900">Be the first to say something</h3>
                        <p className="relative mx-auto mt-2 max-w-md text-slate-500">
                            A question, a tip, or something you just figured out. The first post gets the room talking.
                        </p>
                        <div className="lms-stagger relative mt-6 flex flex-wrap items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => openWith('Question: ')}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200"
                            >
                                <HelpCircle size={14} />
                                Ask a question
                            </button>
                            <button
                                type="button"
                                onClick={() => openWith('Tip: ')}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-200"
                            >
                                <Lightbulb size={14} />
                                Share a tip
                            </button>
                            <button
                                type="button"
                                onClick={() => openWith('Study group: ')}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-200"
                            >
                                <Users size={14} />
                                Start a study group
                            </button>
                        </div>
                        <button
                            onClick={() => openWith('')}
                            className="lms-pop relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
                            style={{ animationDelay: '0.35s' }}
                        >
                            <Sparkles size={16} />
                            Start the first discussion
                        </button>
                    </div>
                ) : (
                    posts.map(post => (
                        <Link
                            to={`/community/${post._id}`}
                            key={post._id}
                            className="group relative block overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10 sm:p-6"
                        >
                            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-fuchsia-500 opacity-0 transition-opacity group-hover:opacity-100" />
                            <div className="flex items-start gap-4 sm:gap-5">
                                <div className="hidden sm:flex flex-col items-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-black text-white uppercase shadow-md shadow-indigo-500/30">
                                        {post.author?.name ? post.author.name.charAt(0) : '?'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                        <span className="font-bold text-slate-800">{post.author?.name || 'Unknown User'}</span>
                                        {user?._id === post.author?._id && (
                                            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[0.65rem] font-black tracking-wider text-indigo-600 uppercase">You</span>
                                        )}
                                        <span className="inline-flex items-center gap-1 font-medium text-slate-400">
                                            <Clock3 size={13} />
                                            {timeAgo(post.createdAt)}
                                        </span>
                                    </div>
                                    <h3 className="mb-1.5 line-clamp-1 text-lg font-black text-slate-900 transition-colors group-hover:text-indigo-700 sm:text-xl">{post.title}</h3>
                                    <p className="mb-4 line-clamp-2 leading-relaxed text-slate-500">{post.content}</p>

                                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                                          {/* TOP ROW → Edit + Delete */}
    {user?._id === post.author?._id && (
    <div className="flex items-center gap-2">
        <button
            onClick={(e) => {
                e.preventDefault();
                handleEditPost(post);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
        >
            Edit
        </button>

        <button
            onClick={(e) => {
                e.preventDefault();
               setDeletePostId(post._id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
        >
            Delete
        </button>
    </div>
)}
                                        <div className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                                            post.commentCount > 0
                                                ? 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100'
                                                : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                        }`}>
                                            <MessageCircle size={14} />
                                            <span>{post.commentCount > 0 ? `${post.commentCount} ${post.commentCount === 1 ? 'reply' : 'replies'}` : 'Be the first to reply'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>


            {/* Toast Notification */}
{toast.show && (
    <div className="fixed top-6 right-6 z-50 animate-fade-in">
        <div
            className={`px-6 py-4 rounded-xl shadow-lg text-white font-semibold ${
                toast.type === 'success'
                    ? 'bg-green-500'
                    : 'bg-red-500'
            }`}
        >
            {toast.message}
        </div>
    </div>
)}

            {/* Create Post Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex justify-center items-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <MessageSquare size={20} className="text-indigo-600" />
                                Start a Discussion
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="createPostForm" onSubmit={handleCreatePost} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="What's on your mind?"
                                        value={newPost.title}
                                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Details</label>
                                    <textarea
                                        required
                                        rows="6"
                                        placeholder="Describe your question, idea, or thought in detail..."
                                        value={newPost.content}
                                        onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-3xl">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="createPostForm"
                                disabled={submitting || !newPost.title.trim() || !newPost.content.trim()}
                                className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                {submitting ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
{deletePostId && (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">

            <h2 className="text-xl font-bold text-slate-800 mb-4">
                Delete Post
            </h2>

            <p className="text-slate-500 mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
                <button
                    onClick={() => setDeletePostId(null)}
                    className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
                >
                    Cancel
                </button>

                <button
                    onClick={() => handleDeletePost(deletePostId)}
                    className="px-5 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-md"
                >
                    Delete
                </button>
            </div>

        </div>
    </div>
)}
        </div>
    );
};
export default Community;