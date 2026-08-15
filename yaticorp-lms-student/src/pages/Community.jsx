/**
 * @author Preethesh Kulal
 * @description Student community forum: create posts, view discussions, add comments
 */
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, X, MessageCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import useAutoRefresh from '../hooks/useAutoRefresh';

const Community = () => {
    const { user } = useContext(AuthContext);
    const [posts, setPosts] = useState([]);
    const [_loading, setLoading] = useState(true);
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
        }
    };

    useAutoRefresh(fetchPosts, 30000);

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
            <div className="flex justify-between items-center bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
                <div className="relative z-10 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-4 mb-2">
                            <span className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
                                <MessageSquare size={28} />
                            </span>
                            Community Forum
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">Join the discussion with other students and instructors.</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center space-x-2 px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Plus size={20} />
                        <span>Start Discussion</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100">
                    <AlertCircle className="mr-3" size={24} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {!posts || posts.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 border-dashed">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <MessageSquare size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No discussions yet</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">Be the first to start a conversation, ask a question, or share something interesting with the community!</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                        >
                            Start the first discussion
                        </button>
                    </div>
                ) : (
                    posts.map(post => (
                        <Link
                            to={`/community/${post._id}`}
                            key={post._id}
                            className="block bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 transition-all group"
                        >
                            <div className="flex items-start gap-5">
                                <div className="hidden sm:flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg uppercase shadow-inner border-2 border-white">
                                        {post.author?.name ? post.author.name.charAt(0) : '?'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-slate-700">{post.author?.name || 'Unknown User'}</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-sm font-medium text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{post.title}</h3>
                                    <p className="text-slate-500 line-clamp-2 mb-4 leading-relaxed">{post.content}</p>

                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
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
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <MessageCircle size={16} />
                                            <span>{post.commentCount} {post.commentCount === 1 ? 'Reply' : 'Replies'}</span>
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