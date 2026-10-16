/**
 * @author Preethesh Kulal
 * @description Shared hook for quiz state management and submission
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getQuizServices } from '../api/quizService';

/**
 * Shared hook for managing quiz logic.
 * Handles fetching, navigation, and submission.
 *
 * `empty` is a lesson with no quiz to take — none was written, or it was
 * saved with no questions — which the player answers with Mark Complete
 * rather than a quiz that can never be passed.
 */
export const useQuiz = (apiClient, lessonId, options = {}) => {
    const { onQuizPassed, onCreditsEarned, isAlreadyCompleted } = options;

    const [quizData, setQuizData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [empty, setEmpty] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    // Only the reply to the latest request, for the lesson still on screen,
    // is applied. Without this a slow reply for the lesson just left could
    // land on the next one.
    const requestRef = useRef(0);
    const lessonRef = useRef(lessonId);
    useEffect(() => {
        lessonRef.current = lessonId;
        return () => { requestRef.current += 1; };
    }, [lessonId]);

    // Memoised so fetchQuiz keeps a stable identity — without this, listing it
    // as an effect dependency would refetch on every render.
    const quizService = useMemo(() => getQuizServices(apiClient), [apiClient]);

    const fetchQuiz = useCallback(async () => {
        const request = ++requestRef.current;
        setLoading(true);
        setError('');
        try {
            const data = await quizService.getQuiz(lessonId);
            if (request !== requestRef.current) return;
            const questions = data?.questions || [];
            setQuizData(data);
            setEmpty(questions.length === 0);
            setAnswers(new Array(questions.length).fill(null));
            setResults(null);
            setCurrentQuestionIndex(0);
        } catch (err) {
            if (request !== requestRef.current) return;
            if (err.response?.status === 404 && err.response?.data?.code === 'NO_QUIZ') {
                setQuizData(null);
                setEmpty(true);
            } else {
                // A locked lesson says why; a lost connection gets plain words
                // and the page offers to try again.
                setError((err.response?.status < 500 && err.response?.data?.message) || 'The quiz could not be loaded. Check your connection and try again.');
            }
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [quizService, lessonId]);

    useEffect(() => {
        if (lessonId) fetchQuiz();
    }, [lessonId, fetchQuiz]);

    const selectOption = (index) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = index;
        setAnswers(newAnswers);
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < quizData.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const submitQuiz = async () => {
        if (answers.some(a => a === null)) {
            throw new Error("Please answer all questions before submitting.");
        }

        const forLesson = lessonId;
        setSubmitting(true);
        try {
            const resData = await quizService.submitQuiz(lessonId, answers);
            if (resData.rewards?.events?.length) {
                window.dispatchEvent(new CustomEvent('yati:rewards', { detail: resData.rewards.events }));
            }
            // The student moved to another lesson while this was marked: the
            // marking stands on the server, but it is not this lesson's to show.
            if (lessonRef.current !== forLesson) return resData;
            setResults(resData);

            // Credits come with a quiz's first attempt, passed or failed;
            // completing the lesson takes a pass. Both used to go through
            // onQuizPassed, so a failed first attempt that scored anything
            // completed the lesson — and with it the course and certificate.
            // The balance after it is the server's (totalCredits).
            if (resData.creditsEarned > 0 && onCreditsEarned) onCreditsEarned(resData.creditsEarned, resData.totalCredits);
            if (resData.passed && !isAlreadyCompleted && onQuizPassed) onQuizPassed(forLesson);
            return resData;
        } catch (err) {
            console.error('Failed to submit quiz:', err);
            throw err;
        } finally {
            if (lessonRef.current === forLesson) setSubmitting(false);
        }
    };

    const retryQuiz = () => {
        setResults(null);
        setCurrentQuestionIndex(0);
        setAnswers(new Array(quizData.questions.length).fill(null));
    };

    return {
        quizData,
        loading,
        error,
        empty,
        currentQuestionIndex,
        answers,
        submitting,
        results,
        selectOption,
        nextQuestion,
        prevQuestion,
        submitQuiz,
        retryQuiz,
        refresh: fetchQuiz
    };
};
