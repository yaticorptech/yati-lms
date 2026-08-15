/**
 * @author Preethesh Kulal
 * @description Admin community moderation: view all posts, reply as admin, delete posts
 */
import React, { useState, useEffect } from 'react';
import { Trash2, MessageSquare, AlertCircle, Send, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import api from '../utils/api';

const Community = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [replyText, setReplyText] = useState({});
    const [sendingReplyId, setSendingReplyId] = useState(null);
    const [replySuccess, setReplySuccess] = useState({});

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/community/admin/all');
            setPosts(res.data.posts);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch community posts:', err);
            setError('Failed to load community discussions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
    fetchPosts(); // Initial fetch

    // Set interval to refresh every 10 seconds
    const interval = setInterval(() => {
        fetchPosts();
    }, 10000); // 10000 ms = 10 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
}, []);

    const handleDeletePost = async () => {
        try {
            await api.delete(`/community/admin/${selectedPostId}`);
            setPosts(posts.filter(p => p._id !== selectedPostId));
            setShowDeleteModal(false);
            setSelectedPostId(null);
        } catch {
            alert('Failed to delete post. Please try again.');
        }
    };

    const handleReply = async (postId) => {
        const message = replyText[postId]?.trim();
        if (!message) return;
        setSendingReplyId(postId);
        try {
            await api.post(`/community/admin/${postId}/reply`, { message });
            setReplyText(prev => ({ ...prev, [postId]: '' }));
            setReplySuccess(prev => ({ ...prev, [postId]: { ok: true, text: 'Reply posted!' } }));
            setTimeout(() => setReplySuccess(prev => ({ ...prev, [postId]: null })), 3000);
            fetchPosts();
        } catch {
            setReplySuccess(prev => ({ ...prev, [postId]: { ok: false, text: 'Failed to post reply.' } }));
        } finally {
            setSendingReplyId(null);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/community/admin/comments/${commentId}`);
            fetchPosts();
        } catch {
            alert('Failed to delete comment.');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in relative z-0 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Community</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Moderate and reply to platform discussions.</p>
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-400 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 uppercase tracking-widest">
                    {posts.length} {posts.length === 1 ? 'Discussion' : 'Discussions'}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center border border-red-100">
                    <AlertCircle className="mr-3 shrink-0" size={20} />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            <div className="space-y-3">
                {posts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center">
                        <MessageSquare size={32} className="text-slate-300 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800">No discussions yet</h3>
                        <p className="text-sm text-slate-500 mt-1">Student discussions will appear here.</p>
                    </div>
                ) : posts.map(post => (
                    <div key={post._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* Post Header */}
                        <div className="flex items-start justify-between p-5">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                                    {post.author?.name?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900">{post.title}</p>
                                    <p className="text-sm text-slate-600 mt-1">{post.content}</p>
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                                        <span className="font-semibold text-slate-600">{post.author?.name || 'Unknown'}</span>
                                        <span>·</span>
                                        <span>{post.author?.email}</span>
                                        <span>·</span>
                                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                        <span>·</span>
                                        <span>{post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <button
                                    onClick={() => setExpandedPostId(expandedPostId === post._id ? null : post._id)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                >
                                    {expandedPostId === post._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                                <button
                                    onClick={() => { setSelectedPostId(post._id); setShowDeleteModal(true); }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Expanded: Comments + Reply */}
                        {expandedPostId === post._id && (
                            <div className="border-t border-slate-100">

                                {/* Existing comments */}
                                {post.comments && post.comments.length > 0 && (
                                    <div className="px-5 pt-4 space-y-3">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            {post.comments.length} {post.comments.length === 1 ? 'Reply' : 'Replies'}
                                        </p>
                                        {post.comments.map(comment => (
                                            <div
                                                key={comment._id}
                                                className={`flex items-start gap-3 p-3 rounded-xl ${comment.isAdminReply ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${comment.isAdminReply ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {comment.isAdminReply ? <Shield size={14} /> : (comment.author?.name?.charAt(0) || '?')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-slate-700">
                                                            {comment.isAdminReply ? 'Admin' : (comment.author?.name || 'Unknown')}
                                                        </span>
                                                        {comment.isAdminReply && (
                                                            <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">ADMIN</span>
                                                        )}
                                                        <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-700">{comment.content}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteComment(comment._id)}
                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                                    title="Delete comment"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Admin reply box */}
                                <div className="px-5 py-4 space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Post Admin Reply</p>
                                    <textarea
                                        rows="3"
                                        value={replyText[post._id] || ''}
                                        onChange={e => setReplyText(prev => ({ ...prev, [post._id]: e.target.value }))}
                                        placeholder="Write a reply as admin..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                                    />
                                    {replySuccess[post._id] && (
                                        <p className={`text-xs font-medium ${replySuccess[post._id].ok ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {replySuccess[post._id].text}
                                        </p>
                                    )}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => handleReply(post._id)}
                                            disabled={sendingReplyId === post._id || !replyText[post._id]?.trim()}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                                        >
                                            <Send size={14} />
                                            {sendingReplyId === post._id ? 'Posting...' : 'Post Reply'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-[350px]">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Post?</h2>
                        <p className="text-sm text-slate-500 mb-6">This will permanently delete the post and all its replies.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm rounded-xl bg-slate-100 hover:bg-slate-200">Cancel</button>
                            <button onClick={handleDeletePost} className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Community;
