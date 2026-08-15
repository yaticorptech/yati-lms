/**
 * @author Preethesh Kulal
 * @description Reusable confirmation modal for delete actions
 */
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, itemName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in text-left">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col transform transition-all">
                <div className="p-6 border-b border-slate-100 bg-red-50/50 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">{title || 'Confirm Deletion'}</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-sm">
                        {message || `Are you sure you want to delete this item? This action cannot be undone.`}
                    </p>
                    {itemName && (
                        <div className="mt-3 py-2 px-4 bg-white border border-slate-200 rounded-lg shadow-sm w-full font-mono text-sm text-slate-700 truncate">
                            {itemName}
                        </div>
                    )}
                </div>

                <div className="p-6 flex gap-3 sm:flex-row flex-col">
                    <button
                        onClick={onClose}
                        className="flex-1 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 px-5 py-2.5 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        <Trash2 size={18} />
                        Delete Permanently
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
