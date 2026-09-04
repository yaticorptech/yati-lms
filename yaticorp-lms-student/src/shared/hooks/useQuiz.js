/**
 * @author Preethesh Kulal
 * @description Shared hook for quiz state management and submission
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getQuizServices } from '../api/quizService';

/**
 * Shared hook for managing quiz logic.
 * Handles fetching, navigation, and submission.
 */
export const useQuiz = (apiClient, lessonId, options = {}) => {
    const { onQuizPassed, isAlreadyCompleted } = options;

    const [quizData, setQuizData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);

    // Memoised so fetchQuiz keeps a stable identity — without this, listing it
    // as an effect dependency would refetch on every render.
    const quizService = useMemo(() => getQuizServices(apiClient), [apiClient]);

    const fetchQuiz = useCallback(async () => {
        setLoading(true);
        try {
            const data = await quizService.getQuiz(lessonId);
            setQuizData(data);
            setAnswers(new Array(data.questions.length).fill(null));
            setResults(null);
            setCurrentQuestionIndex(0);
            setError('');
        } catch {
            setError('Failed to load quiz. The instructor may not have added questions yet.');
        } finally {
            setLoading(false);
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

        setSubmitting(true);
        try {
            const resData = await quizService.submitQuiz(lessonId, answers);
            setResults(resData);
            if (resData.rewards?.events?.length) {
                window.dispatchEvent(new CustomEvent('yati:rewards', { detail: resData.rewards.events }));
            }

            if ((resData.passed && !isAlreadyCompleted) || resData.creditsEarned > 0) {
                if (onQuizPassed) onQuizPassed(lessonId, resData.creditsEarned);
            }
            return resData;
        } catch (err) {
            console.error('Failed to submit quiz:', err);
            throw err;
        } finally {
            setSubmitting(false);
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
