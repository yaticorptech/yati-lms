/**
 * @author Preethesh Kulal
 * @description Interactive quiz component for students with answer selection and submission
 */
import React from 'react';
import { Check, X, AlertCircle, RotateCcw, Award, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

import { useQuiz } from '../shared/hooks/useQuiz';

const QuizTaker = ({ lessonId, onQuizPassed, isAlreadyCompleted }) => {
    const {
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
        retryQuiz
    } = useQuiz(api, lessonId, { onQuizPassed, isAlreadyCompleted });

    const handleSubmit = async () => {
        try {
            await submitQuiz();
        } catch (err) {
            alert(err.message || 'Failed to submit quiz. Please try again.');
        }
    };

    if (loading) return (
        <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm font-medium">Loading Assessment...</p>
        </div>
    );

    if (error || !quizData || quizData.questions.length === 0) return (
        <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white text-center text-slate-500">
            <AlertCircle size={40} className="mb-4 text-slate-300" />
            <p className="text-sm font-medium">{error || "This quiz doesn't have any questions yet."}</p>
        </div>
    );

    // Results View
    if (results) {
        return (
            <div className="w-full h-full bg-white flex flex-col items-center py-12 px-6 overflow-y-auto no-scrollbar rounded-xl border border-slate-200">
                <div className="max-w-2xl w-full animate-fade-in">

                    {/* Minimalist Score Card */}
                    <div className="text-center mb-16">
                        {results.passed ? (
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Award size={36} />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle size={36} />
                            </div>
                        )}
                        <h2 className="text-3xl font-bold text-slate-800 mb-6 tracking-tight">
                            {results.passed ? 'Assessment Passed' : 'Assessment Failed'}
                        </h2>

                        <div className="inline-flex items-center space-x-6 bg-slate-50 border border-slate-100 rounded-xl px-10 py-5 mx-auto mb-8 shadow-sm">
                            <div className="text-center">
                                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Your Score</p>
                                <p className={`text-3xl font-black ${results.passed ? 'text-emerald-600' : 'text-red-500'}`}>{results.score}%</p>
                            </div>
                            <div className="w-px h-12 bg-slate-200"></div>
                            <div className="text-center">
                                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Passing Score</p>
                                <p className="text-3xl font-black text-slate-800">{quizData.passingScore}%</p>
                            </div>
                        </div>

                        {!results.passed && (
                            <div className="mt-4">
                                <button
                                    onClick={retryQuiz}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center shadow-sm"
                                >
                                    <RotateCcw size={16} className="mr-2" /> Retake Assessment
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Clean Answers Review */}
                    {results.passed && (
                        <div className="border-t border-slate-100 pt-10">
                            <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center">
                                Review Your Answers
                            </h3>
                            <div className="space-y-10">
                                {results.results.map((reqQ, i) => {
                                    const originalQ = quizData.questions[i];
                                    return (
                                        <div key={i} className="mb-8">
                                            <div className="flex items-start mb-5">
                                                <div className="mt-0.5 mr-3 flex-shrink-0">
                                                    {reqQ.isCorrect ? <Check size={20} className="text-emerald-500" /> : <X size={20} className="text-red-500" />}
                                                </div>
                                                <h4 className="text-lg font-medium text-slate-800 leading-snug">
                                                    <span className="text-slate-400 font-normal mr-2 inline-block w-4">{i + 1}.</span>
                                                    {originalQ.questionText}
                                                </h4>
                                            </div>

                                            <div className="space-y-3 pl-9">
                                                {originalQ.options.map((opt, optIdx) => {
                                                    const isSelected = reqQ.providedAnswer === optIdx;
                                                    const isActualCorrect = reqQ.correctAnswer === optIdx;

                                                    let bgColor = "bg-white";
                                                    let borderColor = "border-slate-200";
                                                    let textColor = "text-slate-600";

                                                    if (isActualCorrect) {
                                                        bgColor = "bg-emerald-50/50";
                                                        borderColor = "border-emerald-200";
                                                        textColor = "text-emerald-800 font-medium";
                                                    } else if (isSelected && !isActualCorrect) {
                                                        bgColor = "bg-red-50/50";
                                                        borderColor = "border-red-200";
                                                        textColor = "text-red-800 line-through opacity-80";
                                                    }

                                                    return (
                                                        <div key={optIdx} className={`px-5 py-3.5 rounded-lg border ${bgColor} ${borderColor}`}>
                                                            <span className={`text-[15px] ${textColor}`}>{opt}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {reqQ.explanation && (
                                                <div className="ml-9 mt-4 p-5 bg-blue-50/50 border border-blue-100 rounded-lg text-[14px] text-blue-900 leading-relaxed shadow-sm">
                                                    <span className="font-bold mb-1 block uppercase tracking-wider text-[11px] text-blue-600">Explanation</span>
                                                    {reqQ.explanation}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Active Test View
    const q = quizData.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;
    const progressPercentage = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

    return (
        <div className="w-full h-full bg-white flex flex-col rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">

            {/* Minimal Header */}
            <div className="px-6 md:px-10 py-5 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Assessment</h2>
                <div className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {currentQuestionIndex + 1} of {quizData.questions.length}
                </div>
            </div>

            {/* Very thin progress bar */}
            <div className="w-full bg-slate-100 h-1">
                <div className="bg-blue-600 h-full transition-all duration-300 ease-out" style={{ width: `${progressPercentage}%` }}></div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10">
                <div className="max-w-2xl mx-auto w-full py-4 md:py-8">

                    <h3 className="text-xl md:text-[22px] font-medium text-slate-800 mb-8 md:mb-12 leading-relaxed flex items-start">
                        <span className="text-blue-600 font-bold mr-3 mt-0.5">{currentQuestionIndex + 1}.</span>
                        {q.questionText}
                    </h3>

                    <div className="space-y-4">
                        {q.options.map((opt, idx) => {
                            const isSelected = answers[currentQuestionIndex] === idx;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => selectOption(idx)}
                                    className={`flex items-center p-4 md:p-5 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected ? 'border-blue-600 bg-blue-50/30 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center mr-4 transition-colors ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`text-[15px] md:text-[16px] leading-relaxed ${isSelected ? 'text-blue-900 font-semibold' : 'text-slate-700'}`}>
                                        {opt}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

            {/* Footer Navigation */}
            <div className="border-t border-slate-100 flex justify-between items-center bg-white sticky bottom-0 z-10 px-6 md:px-10 py-5">
                <button
                    onClick={prevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center px-4 py-2 md:px-5 md:py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors rounded-lg hover:bg-slate-50"
                >
                    <ArrowLeft size={16} className="mr-2" /> Previous
                </button>

                {!isLastQuestion ? (
                    <button
                        onClick={nextQuestion}
                        disabled={answers[currentQuestionIndex] === null}
                        className="flex items-center px-6 py-2.5 md:px-8 md:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        Next <ArrowRight size={16} className="ml-2" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={answers.some(a => a === null) || submitting}
                        className="flex items-center px-6 py-2.5 md:px-8 md:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {submitting ? 'Submitting...' : 'Submit Assessment'}
                    </button>
                )}
            </div>

        </div>
    );
};

export default QuizTaker;
