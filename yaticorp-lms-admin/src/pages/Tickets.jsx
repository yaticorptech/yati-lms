/**
 * @author Preethesh Kulal
 * @description Support ticket management with status filters, admin notes and reply
 */
import React, { useState } from 'react';
import api from '../utils/api';
import { MessageCircleQuestion, CheckCircle2, Clock, AlertCircle, ChevronDown, Save, Send } from 'lucide-react';
import useAutoRefresh from '../hooks/useAutoRefresh';

const statusColors = {
    'open': 'bg-red-50 text-red-600 border-red-200',
    'in-progress': 'bg-amber-50 text-amber-600 border-amber-200',
    'resolved': 'bg-emerald-50 text-emerald-600 border-emerald-200'
};

const statusIcons = {
    'open': <AlertCircle size={14} />,
    'in-progress': <Clock size={14} />,
    'resolved': <CheckCircle2 size={14} />
};

const pageLabels = {
    'login': 'Login Page',
    'signup': 'Signup Page',
    'dashboard': 'Dashboard',
    'other': 'Other'
};

const Tickets = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [adminNotes, setAdminNotes] = useState({});
    const [savingNoteId, setSavingNoteId] = useState(null);
    const [sendingNoteId, setSendingNoteId] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [savedNotes, setSavedNotes] = useState({}); // me changed this line

    const fetchTickets = async () => {
        try {
            const res = await api.get(`/admin/tickets${filterStatus ? `?status=${filterStatus}` : ''}`);
            setTickets(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchTickets, 30000);

    const updateTicket = async (id, status) => {
        setUpdatingId(id);
        try {
            const res = await api.put(`/admin/tickets/${id}`, { status, adminNotes: adminNotes[id] || '' });
            setTickets(prev => prev.map(t => t._id === id ? res.data : t));
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingId(null);
        }
    };

    const saveNote = async (id) => {
        setSavingNoteId(id);
        try {
            await api.put(`/admin/tickets/${id}`, {
                adminNotes: adminNotes[id] || ''
            });

            console.log('Save note for ticket:', id, adminNotes[id]);

            // me changed this line — store saved note text to show above textarea
            setSavedNotes(prev => ({ ...prev, [id]: adminNotes[id] || '' }));

            // ✅ clear textarea
            setAdminNotes(prev => ({ ...prev, [id]: '' }));

            // ✅ refresh UI
            fetchTickets();

        } catch (err) {
            console.error(err);
        } finally {
            setSavingNoteId(null);
        }
    };

    const sendNote = async (id) => {
        setSendingNoteId(id);
        try {
            const res = await api.post(`/tickets/admin/${id}/message`, {
                message: adminNotes[id] || ''
            });

            console.log('Send note for ticket:', id, adminNotes[id]);

            // ✅ beautiful inline success message instead of alert
            setSuccessMessage({ id, text: res.data.message || 'Message sent successfully!', isError: false });
            setTimeout(() => setSuccessMessage(null), 4000);

            // ✅ clear textarea
            setAdminNotes(prev => ({ ...prev, [id]: '' }));

            fetchTickets();

        } catch (err) {
            console.error(err);

            // ✅ beautiful inline error message instead of alert
            setSuccessMessage({ id, text: err.response?.data?.message || 'Failed to send message', isError: true });
            setTimeout(() => setSuccessMessage(null), 4000);

        } finally {
            setSendingNoteId(null);
        }
    };

    const openCount = tickets.filter(t => t.status === 'open').length;
    const inProgressCount = tickets.filter(t => t.status === 'in-progress').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
                    <p className="text-sm lg:text-base text-slate-500 mt-1">Manage and resolve student support requests</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-red-50 rounded-2xl text-red-500 shadow-sm border border-red-100">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open</p>
                            <p className="text-2xl font-bold text-slate-900">{openCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 shadow-sm border border-amber-100">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</p>
                            <p className="text-2xl font-bold text-slate-900">{inProgressCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500 shadow-sm border border-emerald-100">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved</p>
                            <p className="text-2xl font-bold text-slate-900">{resolvedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/50 p-2 rounded-2xl">
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar-hide p-1">
                    {['', 'open', 'in-progress', 'resolved'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border-2 ${filterStatus === s
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'bg-white border-white text-slate-500 hover:border-slate-200'
                                }`}
                        >
                            {s === '' ? 'All Tickets' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
                        </button>
                    ))}
                </div>
                <div className="px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-tighter sm:text-right">
                    Found {tickets.length} records
                </div>
            </div>

            {/* Ticket List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <MessageCircleQuestion size={28} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No tickets found</p>
                    </div>
                ) : tickets.map(ticket => (
                    <div key={ticket._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Ticket Header */}
                        <button onClick={() => setExpandedId(expandedId === ticket._id ? null : ticket._id)}
                            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors">
                            <div className="flex items-start space-x-4 flex-1 min-w-0">
                                <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold flex-shrink-0 ${statusColors[ticket.status]}`}>
                                    {statusIcons[ticket.status]}
                                    <span>{ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 truncate">{ticket.subject}</p>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        <span className="font-medium text-slate-600">{ticket.name}</span>
                                        {' · '}{ticket.email}
                                        {ticket.cardNumber && ` · Card: ${ticket.cardNumber}`}
                                        {' · '}<span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{pageLabels[ticket.page] || ticket.page}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                                <span className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <ChevronDown size={18} className={`text-slate-400 transition-transform ${expandedId === ticket._id ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        {/* Expanded Details */}
                        {expandedId === ticket._id && (
                            <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message</p>
                                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{ticket.message}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Admin Notes</label>

                                    {/*  changed this line — show saved note above textarea with dashed purple border */}
                                    {(savedNotes[ticket._id] || ticket.adminNotes) && (
                                        <div className="border border-dashed border-indigo-300 bg-indigo-50/40 rounded-lg px-3 py-2 text-sm mb-2">
                                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Saved Note · </span>
                                            <span className="text-slate-600">{savedNotes[ticket._id] || ticket.adminNotes}</span>
                                        </div>
                                    )}

                                    <textarea
                                        rows="2"
                                        value={adminNotes[ticket._id] !== undefined ? adminNotes[ticket._id] : ''}
                                        onChange={e => setAdminNotes(prev => ({ ...prev, [ticket._id]: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                                        placeholder="Add internal notes..."
                                    />

                                    {/* ✅ Beautiful inline success / error message */}
                                    {successMessage?.id === ticket._id && (
                                        <div className={`flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                            successMessage.isError
                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        }`}>
                                            {successMessage.isError
                                                ? <AlertCircle size={16} className="shrink-0" />
                                                : <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                            }
                                            {successMessage.text}
                                        </div>
                                    )}

                                    {/* Save Note & Send Note Buttons */}
                                    <div className="flex items-center justify-end gap-2 mt-2">
                                        <button
                                            onClick={() => saveNote(ticket._id)}
                                            disabled={savingNoteId === ticket._id}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-white hover:bg-indigo-50 transition-all disabled:opacity-50"
                                        >
                                            <Save size={13} />
                                            {savingNoteId === ticket._id ? 'Saving...' : 'Save Note'}
                                        </button>
                                        <button
                                            onClick={() => sendNote(ticket._id)}
                                            disabled={sendingNoteId === ticket._id}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm shadow-indigo-200"
                                        >
                                            <Send size={13} />
                                            {sendingNoteId === ticket._id ? 'Sending...' : 'Send Note'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-semibold text-slate-500 mr-1">Set Status:</span>
                                    {['open', 'in-progress', 'resolved'].map(s => (
                                        <button key={s} disabled={updatingId === ticket._id || ticket.status === s}
                                            onClick={() => updateTicket(ticket._id, s)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 border ${ticket.status === s ? `${statusColors[s]} cursor-default` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                                            {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
                                        </button>
                                    ))}
                                    {updatingId === ticket._id && <span className="text-xs text-slate-400 ml-2">Saving...</span>}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Tickets;