/**
 * @author Preethesh Kulal
 * @description Shared hook for community post state and actions
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCommunityServices } from '../api/communityService';

/**
 * Shared hook for fetching a single post.
 * Both Web and Mobile will use this to ensure they fetch data the same way.
 */
export const usePostDetail = (apiClient, postId) => {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Memoised so fetchPost keeps a stable identity — without this, listing it
    // as an effect dependency would refetch on every render.
    const communityService = useMemo(() => getCommunityServices(apiClient), [apiClient]);

    const fetchPost = useCallback(async () => {
        try {
            setLoading(true);
            const data = await communityService.getPost(postId);
            setPost(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch post:', err);
            setError('Post not found or failed to load.');
        } finally {
            setLoading(false);
        }
    }, [communityService, postId]);

    useEffect(() => {
        if (postId) fetchPost();
    }, [postId, fetchPost]);

    const addComment = async (content) => {
        const newComment = await communityService.addComment(postId, content);
        setPost(prev => ({
            ...prev,
            comments: [...(prev.comments || []), newComment]
        }));
        return newComment;
    };

    return { post, loading, error, addComment, refresh: fetchPost };
};
