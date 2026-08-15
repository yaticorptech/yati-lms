/**
 * @author Preethesh Kulal
 * @description Individual community post detail page with comments
 */
import React, { useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, AlertCircle, Clock } from 'lucide-react';
import api from '../utils/api';
import { usePostDetail } from '../shared/hooks/useCommunity';
import { AuthContext } from '../context/AuthContext';

const PostDetail = () => {
    const { postId } = useParams();
    const { user } = useContext(AuthContext);

    const { post, loading, error, addComment } = usePostDetail(api, postId);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setSubmitting(true);
        try {
            await addComment(replyContent);
            setReplyContent('');
        } catch (err) {
            console.error('Failed to post reply:', err);
            alert('Failed to post reply. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto mt-12">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Discussion unavailable</h2>
                <p className="text-slate-500 mb-6">{error || 'This post may have been deleted.'}</p>
                <Link to="/community" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                    Back to Community
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in relative max-w-4xl mx-auto pb-12">
            <Link to="/community" className="inline-flex items-center space-x-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors mb-2">
                <ArrowLeft size={18} />
                <span>Back to Discussions</span>
            </Link>

            {/* Original Post */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl uppercase shadow-inner border-2 border-white">
                            {post.author?.name ? post.author.name.charAt(0) : '?'}
                        </div>
                        <div>
                            <div className="font-bold text-lg text-slate-800">{post.author?.name || 'Unknown User'}</div>
                            <div className="flex items-center text-sm font-medium text-slate-400 gap-2 mt-0.5">
                                <Clock size={14} />
                                {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 leading-tight">{post.title}</h1>
                    <div className="prose prose-slate max-w-none text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                        {post.content}
                    </div>
                </div>
                <div className="bg-slate-50 px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center gap-2 text-slate-500 font-semibold text-sm">
                    <MessageSquare size={16} />
                    {post.comments?.length || 0} Replies
                </div>
            </div>

            {/* Replies Section */}
            <div className="space-y-4 pt-4">
                <h3 className="font-bold text-slate-800 text-xl px-2">Replies</h3>

                {(!post.comments || post.comments.length === 0) ? (
                    <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                        <p className="text-slate-500 font-medium">No replies yet. Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    post.comments.map(comment => (
                        <div key={comment._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-4 transition-all hover:border-slate-200">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm uppercase">
                                    {comment.author?.name ? comment.author.name.charAt(0) : '?'}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-slate-700">{comment.author?.name || 'Unknown User'}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Reply Input Box */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h3 className="font-bold text-slate-800 mb-4 px-2">Write a reply</h3>
                <form onSubmit={handleReply} className="flex gap-4 items-start flex-col sm:flex-row">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm uppercase hidden sm:flex">
                        {user?.name ? user.name.charAt(0) : '?'}
                    </div>
                    <div className="flex-1 w-full relative">
                        <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Add to the discussion..."
                            rows="3"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none pb-12"
                        ></textarea>
                        <div className="absolute bottom-3 right-3">
                            <button
                                type="submit"
                                disabled={submitting || !replyContent.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                <span>{submitting ? 'Sending' : 'Reply'}</span>
                                <Send size={16} className={submitting ? 'animate-pulse' : ''} />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostDetail;
