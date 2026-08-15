/**
 * @author Preethesh Kulal
 * @description LMS-specific Axios client with base configuration
 */
import { createClient } from './api/client';
import { getCommunityServices } from './api/communityService';
import { getQuizServices } from './api/quizService';
import { getCourseServices } from './api/courseService';
import { getAuthServices } from './api/authService';

/**
 * The Unified LMS Client.
 * This is the "One Client API" that keeps Web and Mobile perfectly in sync.
 * All business logic and API calls are centralized here.
 */
export const createLmsClient = (config) => {
    const apiClient = createClient(config);

    return {
        community: getCommunityServices(apiClient),
        quizzes: getQuizServices(apiClient),
        courses: getCourseServices(apiClient),
        auth: getAuthServices(apiClient),

        // Expose raw client if needed
        raw: apiClient
    };
};
