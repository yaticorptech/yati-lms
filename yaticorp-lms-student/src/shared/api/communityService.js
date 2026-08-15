/**
 * @author Preethesh Kulal
 * @description Shared API service for community posts and comments
 */
/**
 * Shared Community Service
 * This file contains all API calls related to the Community feature.
 * By centralizing these here, both Web and Mobile apps stay in sync.
 */

export const getCommunityServices = (apiClient) => ({
    /**
     * Fetch all community posts
     */
    getPosts: async () => {
        const res = await apiClient.get('/community');
        return res.data.posts;
    },

    /**
     * Fetch a single post by ID
     */
    getPost: async (postId) => {
        const res = await apiClient.get(`/community/${postId}`);
        return res.data.post;
    },

    /**
     * Add a comment to a post
     */
    addComment: async (postId, content) => {
        const res = await apiClient.post(`/community/${postId}/comments`, { content });
        return res.data.comment;
    }
});
