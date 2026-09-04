/**
 * @author Preethesh Kulal
 * @description Student management: add/edit/delete students with QR-only card flow
 */
import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { UserCheck, UserSearch, Upload, Download, QrCode, Lock, Camera, Keyboard } from 'lucide-react';
import * as XLSX from 'xlsx';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';
import { Html5Qrcode } from 'html5-qrcode';
import useAutoRefresh from '../hooks/useAutoRefresh';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [courses, setCourses] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [selectedAssignType, setSelectedAssignType] = useState('Course');
    const [selectedAssignId, setSelectedAssignId] = useState('');

    const [search, setSearch] = useState('');

    // invalid entry interactive popup 
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('error');

    // Delete User Modal State
    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Remove Enrollment Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);

    // Reset Progress Confirm State
    const [showResetModal, setShowResetModal] = useState(false);
    const [enrollmentToReset, setEnrollmentToReset] = useState(null);
    const [resetLoading, setResetLoading] = useState(false);

    // New User Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '' });

    // Add Student QR state
    const [addQrCode, setAddQrCode] = useState('');
    const [addQrValidated, setAddQrValidated] = useState(false);
    const [addQrValidating, setAddQrValidating] = useState(false);
    const [addCardDetails, setAddCardDetails] = useState({ CardNumber: '', CVV: '' });
    const [addScanMode, setAddScanMode] = useState('manual');
    const [addScannerError, setAddScannerError] = useState('');
    const addScannerRef = useRef(null);
    const ADD_SCANNER_ID = 'qr-reader-add-student';

    // Bulk Upload State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkResults, setBulkResults] = useState(null);
    const bulkFileRef = useRef(null);

    // Edit User State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editUserForm, setEditUserForm] = useState({ _id: '', name: '', email: '', phone: '', password: '' });
    const [editPwFocused, setEditPwFocused] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchUsers, 30000);

    useEffect(() => {
        // ✅ Filter only published courses
        api.get('/admin/courses')
            .then(res => {
                const publishedCourses = res.data.filter(c => c.isPublished === true);
                setCourses(publishedCourses);
            })
            .catch(console.error);

        // ✅ Filter only published bundles
        api.get('/admin/bundles')
            .then(res => {
                const publishedBundles = res.data.filter(b => b.isPublished === true);
                setBundles(publishedBundles);
            })
            .catch(console.error);

    }, []);

    // Add student scanner effect
    useEffect(() => {
        if (showAddModal && addScanMode === 'camera') {
            startAddScanner();
        } else {
            stopAddScanner();
        }
        return () => stopAddScanner();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAddModal, addScanMode]);

    const openUserModal = async (user) => {
        setSelectedUser(user);
        try {
            const res = await api.get(`/admin/users/${user._id}`);
            setUserDetails(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const closeUserModal = () => {
        setSelectedUser(null);
        setUserDetails(null);
        setSelectedAssignId('');
    };

    const toggleStatus = async (user) => {
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        try {
            await api.put(`/admin/users/${user._id}/status`, { status: newStatus });
            fetchUsers();
            if (selectedUser && selectedUser._id === user._id) {
                setSelectedUser(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const assignContent = async () => {
        if (!selectedAssignId) {
            setAlertType('error');
            setAlertMessage('Please select a course or bundle');
            setShowAlert(true);
            return;
        }

        try {
            await api.post('/admin/enrollments', {
                userId: selectedUser._id,
                type: selectedAssignType,
                courseId: selectedAssignType === 'Course' ? selectedAssignId : undefined,
                bundleId: selectedAssignType === 'Bundle' ? selectedAssignId : undefined
            });

            setAlertType('success');
            setAlertMessage(`${selectedAssignType} assigned successfully`);
            setShowAlert(true);

            openUserModal(selectedUser);

        } catch (err) {
            setAlertType('error');

            if (err.response?.status === 400) {
                setAlertMessage(err.response.data.message);
            } else {
                setAlertMessage('Assignment failed');
            }

            setShowAlert(true);
        }
    };

    // Add Student scanner helpers
    const startAddScanner = async () => {
        setAddScannerError('');
        try {
            const scanner = new Html5Qrcode(ADD_SCANNER_ID);
            addScannerRef.current = scanner;
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decoded) => {
                    const value = decoded.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setAddQrCode(value);
                    stopAddScanner();
                    setAddScanMode('manual');
                },
                () => { }
            );
        } catch {
            setAddScannerError('Camera access denied. Please enter the QR code manually.');
            setAddScanMode('manual');
        }
    };

    const stopAddScanner = () => {
        if (addScannerRef.current) {
            addScannerRef.current.stop().catch(() => { });
            addScannerRef.current = null;
        }
    };

    const resetAddModal = () => {
        stopAddScanner();
        setAddQrCode('');
        setAddQrValidated(false);
        setAddCardDetails({ CardNumber: '', CVV: '' });
        setAddScanMode('manual');
        setAddScannerError('');
        setNewUser({ name: '', email: '', phone: '', password: '' });
        setShowAddModal(false);
    };

    const handleValidateAddQR = async () => {
        if (!addQrCode.trim()) {
            setAlertMessage('Please enter or scan a QR Code.'); setShowAlert(true); return;
        }
        setAddQrValidating(true);
        try {
            const res = await api.post('/auth/validate-qr', { qrCodeNumber: addQrCode.trim() });
            setAddCardDetails({ CardNumber: res.data.cardNumber, CVV: res.data.cvv });
            setAddQrValidated(true);
        } catch (err) {
            setAlertMessage(err.response?.data?.message || 'Invalid QR Code.');
            setShowAlert(true);
        } finally {
            setAddQrValidating(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();

        if (!addQrValidated) {
            setAlertMessage('Please validate the QR Code first.'); setShowAlert(true); return;
        }
        if (!newUser.email.toLowerCase().endsWith('@gmail.com')) {
            setAlertMessage('Only @gmail.com email addresses are allowed.'); setShowAlert(true); return;
        }

        try {
            const createdName = newUser.name;
            await api.post('/admin/users', {
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                password: newUser.password,
                cardNumber: addCardDetails.CardNumber,
                cvv: addCardDetails.CVV,
                qrCodeNumber: addQrCode.trim()
            });
            resetAddModal();
            fetchUsers();
            setAlertType('success');
            setAlertMessage(`Student "${createdName}" added successfully!`);
            setShowAlert(true);
        } catch (err) {
            setAlertType('error');
            setAlertMessage(err.response?.data?.message || 'Failed to create user');
            setShowAlert(true);
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Name', 'Email', 'Phone', 'CardNumber', 'CVV', 'QRCodeNumber', 'Password'],
            ['John Doe', 'john@gmail.com', '+1234567890', '123456789012', '12345', 'QR123456', 'securepass1'],
            ['Jane Smith', 'jane@gmail.com', '+9876543210', '210987654321', '54321', 'QR654321', 'securepass2'],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        XLSX.writeFile(wb, 'bulk_users_template.xlsx');
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) { setAlertMessage('Please select an Excel file first.'); setShowAlert(true); return; }
        const formData = new FormData();
        formData.append('file', bulkFile);
        setBulkUploading(true);
        setBulkResults(null);
        try {
            const res = await api.post('/admin/users/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkResults(res.data.results);
            fetchUsers();
        } catch (err) {
            setAlertMessage(err.response?.data?.message || 'Bulk upload failed'); setShowAlert(true);
        } finally {
            setBulkUploading(false);
        }
    };

    const openEditModal = (user) => {
        setEditUserForm({
            _id: user._id,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '', // Keep empty, only send if they want to change it
            // Rewards: money eligibility and leaderboard cohorts
            accountType: user.accountType || 'school_student',
            walletAccess: user.walletAccess || 'default',
            institution: user.institution || '',
            className: user.className || ''
        });
        setShowEditModal(true);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();

        if (editUserForm.email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(editUserForm.email)) {
            setAlertMessage('Only @gmail.com email addresses are allowed.'); setShowAlert(true); return;
        }

        if (!/^\+?[\d\s\-()]{7,15}$/.test(editUserForm.phone)) {
            setAlertMessage('Please enter a valid phone number.'); setShowAlert(true); return;
        }

        try {
            const dataToSubmit = { ...editUserForm };
            if (!dataToSubmit.password) {
                delete dataToSubmit.password;
            }

            await api.put(`/admin/users/${editUserForm._id}`, dataToSubmit);
            setShowEditModal(false);
            fetchUsers();
            if (selectedUser && selectedUser._id === editUserForm._id) {
                openUserModal(selectedUser);
            }
        } catch (err) {
            setAlertMessage(err.response?.data?.message || 'Failed to update user'); setShowAlert(true);
        }
    };

    const confirmRemoveEnrollment = (enrollment) => {
        setEnrollmentToDelete(enrollment);
        setShowDeleteModal(true);
    };

    const executeRemoveEnrollment = async () => {
        if (!enrollmentToDelete) return;
        try {
            await api.delete(`/admin/enrollments/${enrollmentToDelete._id}`);
            openUserModal(selectedUser);
            setShowDeleteModal(false);
            setEnrollmentToDelete(null);
        } catch (err) {
            console.error(err);
        }
    };

    const confirmResetProgress = (enrollment) => {
        setEnrollmentToReset(enrollment);
        setShowResetModal(true);
    };

    const executeResetProgress = async () => {
        if (!enrollmentToReset || !enrollmentToReset.courseId?._id) return;
        setResetLoading(true);
        try {
            await api.delete(`/admin/users/${selectedUser._id}/progress/${enrollmentToReset.courseId._id}`);
            setShowResetModal(false);
            setEnrollmentToReset(null);
        } catch {
            // 404 is fine — means no progress existed
            setShowResetModal(false);
            setEnrollmentToReset(null);
        } finally {
            setResetLoading(false);
        }
    };

    const confirmDeleteUser = (user) => {
        setUserToDelete(user);
        setShowDeleteUserModal(true);
    };

    const executeDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/admin/users/${userToDelete._id}`);
            setShowDeleteUserModal(false);
            setUserToDelete(null);
            if (selectedUser && selectedUser._id === userToDelete._id) {
                closeUserModal();
            }
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in relative z-0 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">User Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage platform students, roles, and course enrollments.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm shadow-sm transition-all"
                        />
                        <UserSearch className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <Download size={16} />
                        <span>Template</span>
                    </button>
                    <button
                        onClick={() => { setShowBulkModal(true); setBulkResults(null); setBulkFile(null); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <Upload size={16} />
                        <span>Bulk Create</span>
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <UserCheck size={18} />
                        <span>Add Student</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading users...</div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase">
                                <th className="px-6 py-4 font-semibold">User Details</th>
                                <th className="px-6 py-4 font-semibold">Card Number</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                                <tr key={user._id} onClick={() => openUserModal(user)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{user.name}</div>
                                        <div className="text-sm text-slate-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{user.cardNumber}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => openUserModal(user)}
                                            className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors"
                                        >
                                            Manage
                                        </button>
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-slate-500 hover:text-indigo-600 font-medium text-sm transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(user)}
                                            className={`${user.status === 'active' ? 'text-orange-500 hover:text-orange-700' : 'text-emerald-500 hover:text-emerald-700'} font-medium text-sm transition-colors`}
                                        >
                                            {user.status === 'active' ? 'Block' : 'Unblock'}
                                        </button>
                                        <button
                                            onClick={() => confirmDeleteUser(user)}
                                            className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>

            {/* User Management Modal */}
            {
                selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm pt-15 animate-fade-in text-left overflow-y-auto">
                        <div className="relative top-8 md:top-10 bg-white rounded-1xl shadow-xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[calc(100vh-8rem)] mb-4">
                            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <UserCheck size={24} className="text-indigo-600" />
                                    {selectedUser.name}'s Profile
                                </h2>
                                <button
                                    onClick={closeUserModal}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* <div className="p-5 overflow-y-auto space-y-6"> */}
                            <div className="p-6 overflow-y-auto space-y-8 flex-1 scrollbar-thin scrollbar-thumb-slate-300">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">User Details</h3>
                                    {userDetails ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <div>
                                                <p className="text-xs text-slate-400 font-semibold uppercase">Email</p>
                                                <p className="font-medium text-slate-800">{userDetails.user.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-semibold uppercase">Phone</p>
                                                <p className="font-medium text-slate-800">{userDetails.user.phone || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-semibold uppercase">Card Number</p>
                                                <p className="font-mono text-slate-800">{userDetails.user.cardNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-semibold uppercase">Serial Number</p>
                                                <p className="font-mono text-slate-800">{userDetails.user.serialNumber || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-semibold uppercase">Joined</p>
                                                <p className="font-medium text-slate-800">{new Date(userDetails.user.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-semibold uppercase">
                                                    QR NUMBER
                                                </p>

                                                <p className="font-mono text-sm text-slate-800 mt-0.5">
                                                    {userDetails?.user?.qrNumber || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-pulse h-24 bg-slate-100 rounded-xl"></div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">

                                    {/* TYPE SELECT */}
                                    <select
                                        value={selectedAssignType}
                                        onChange={(e) => {
                                            setSelectedAssignType(e.target.value);
                                            setSelectedAssignId('');
                                            setShowAlert(false); // ✅ clear previous popup
                                        }}
                                        className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm w-40 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Course">Course</option>
                                        <option value="Bundle">Bundle</option>
                                    </select>

                                    {/* COURSE SELECT */}
                                    <select
                                        value={selectedAssignId}
                                        onChange={(e) => setSelectedAssignId(e.target.value)}
                                        className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm w-52 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select</option>

                                        {selectedAssignType === 'Course'
                                            ? courses.map(c => (
                                                <option key={c._id} value={c._id}>
                                                    {c.title}
                                                </option>
                                            ))
                                            : bundles.map(b => (
                                                <option key={b._id} value={b._id}>
                                                    {b.title}
                                                </option>
                                            ))
                                        }
                                    </select>

                                    {/* BUTTON */}
                                    <button
                                        onClick={assignContent}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                                    >
                                        Assign
                                    </button>

                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Current Active Enrollments</h3>
                                    {userDetails ? (
                                        userDetails.enrollments.length > 0 ? (
                                            <div className="grid gap-4 mt-2">
                                                {userDetails.enrollments.map(enr => (
                                                    <div key={enr._id} className="flex justify-between items-center p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-white shadow-sm">
                                                        <div>
                                                            <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600 mr-2">{enr.type.toUpperCase()}</span>
                                                            <span className="font-medium text-slate-800">
                                                                {enr.type === 'Course' ? (enr.courseId?.title || 'Untitled Course') : (enr.bundleId?.title || 'Untitled Bundle')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {enr.type === 'Course' && (
                                                                <button
                                                                    onClick={() => confirmResetProgress(enr)}
                                                                    className="text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-amber-200"
                                                                >
                                                                    Reset Progress
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => confirmRemoveEnrollment(enr)}
                                                                className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-200"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-slate-500 bg-slate-50 p-6 rounded-xl text-center border border-slate-200 italic">
                                                No active enrollments found for this user.
                                            </div>
                                        )
                                    ) : (
                                        <div className="animate-pulse flex space-x-4 p-4">
                                            <div className="flex-1 space-y-4 py-1">
                                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-slate-200 rounded"></div>
                                                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Progress Summary */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Course Progress Report</h3>
                                    {userDetails?.progressSummary && userDetails.progressSummary.length > 0 ? (
                                        <div className="space-y-3">
                                            {userDetails.progressSummary.map(prog => (
                                                <div key={prog.courseId} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="font-semibold text-slate-800 text-sm truncate max-w-full sm:max-w-[220px]" title={prog.courseTitle}>{prog.courseTitle}</p>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${prog.percentage >= 100 ? 'bg-emerald-100 text-emerald-700' : prog.percentage > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                                            {prog.percentage >= 100 ? '✓ Completed' : `${prog.percentage}%`}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
                                                        <div
                                                            className={`h-2 rounded-full transition-all ${prog.percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${prog.percentage}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        <span>📗 {prog.completedLessons} lessons done</span>
                                                        <span>🏆 {prog.passedQuizzes} quizzes passed</span>
                                                        {prog.lastActivity && (
                                                            <span className="ml-auto">Last active: {new Date(prog.lastActivity).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-6 italic text-sm">
                                            No progress data found. This student hasn&apos;t started any courses yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {/* Reset Progress Confirm Dialog */}
            {showResetModal && enrollmentToReset && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800">Reset Course Progress?</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                This will wipe all progress for <span className="font-semibold text-slate-700">{enrollmentToReset.courseId?.title}</span> for{' '}
                                <span className="font-semibold text-slate-700">{selectedUser?.name}</span>. They will start the course from 0%.
                            </p>
                            <p className="text-xs text-amber-600 mt-2 font-semibold">This action cannot be undone.</p>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50">
                            <button
                                onClick={() => { setShowResetModal(false); setEnrollmentToReset(null); }}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeResetProgress}
                                disabled={resetLoading}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-50"
                            >
                                {resetLoading ? 'Resetting...' : 'Reset Progress'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-6 pt-50 animate-fade-in text-left overflow-y-auto"> {/* new changes */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 font-bold text-lg flex justify-between">
                            <div className="flex items-center gap-2">
                                <Upload size={20} className="text-emerald-600" />
                                <span>Bulk Create Students</span>
                            </div>
                            <button onClick={() => { setShowBulkModal(false); setBulkResults(null); setBulkFile(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-5">
                            {!bulkResults ? (
                                <>
                                    <p className="text-sm text-slate-600">
                                        Upload an Excel file (<code>.xlsx</code>) with columns: <strong>Name, Email, Phone, CardNumber, CVV, QRCodeNumber, Password</strong>.
                                        Download the template to get started.
                                    </p>
                                    <button
                                        onClick={downloadTemplate}
                                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition-colors"
                                    >
                                        <Download size={16} /> Download Template
                                    </button>
                                    <div
                                        onClick={() => bulkFileRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-colors"
                                    >
                                        <Upload size={28} className="mx-auto mb-2 text-slate-400" />
                                        {bulkFile ? (
                                            <p className="text-sm font-semibold text-emerald-700">{bulkFile.name}</p>
                                        ) : (
                                            <p className="text-sm text-slate-500">Click to select an Excel file (.xlsx)</p>
                                        )}
                                        <input
                                            ref={bulkFileRef}
                                            type="file"
                                            accept=".xlsx, .xls"
                                            className="hidden"
                                            onChange={(e) => setBulkFile(e.target.files[0] || null)}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => { setShowBulkModal(false); setBulkFile(null); }}
                                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleBulkUpload}
                                            disabled={bulkUploading || !bulkFile}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {bulkUploading ? 'Uploading...' : 'Upload & Create'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-bold text-emerald-600">{bulkResults.successCount}</p>
                                            <p className="text-sm text-emerald-700 font-semibold mt-1">Created</p>
                                        </div>
                                        <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-bold text-red-600">{bulkResults.failedCount}</p>
                                            <p className="text-sm text-red-700 font-semibold mt-1">Failed</p>
                                        </div>
                                    </div>
                                    {bulkResults.errors.length > 0 && (
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 mb-2">Errors:</p>
                                            <div className="max-h-52 overflow-y-auto space-y-2">
                                                {bulkResults.errors.map((err, idx) => (
                                                    <div key={idx} className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
                                                        <span className="font-semibold text-red-700">Row {err.row} ({err.email}):</span>{' '}
                                                        <span className="text-red-600">{err.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => { setBulkResults(null); setBulkFile(null); }}
                                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Upload Another
                                        </button>
                                        <button
                                            onClick={() => { setShowBulkModal(false); setBulkResults(null); setBulkFile(null); }}
                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add New User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-6 pt-16 animate-fade-in text-left overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 font-bold text-lg flex justify-between">
                            <span>Add New Student</span>
                            <button onClick={resetAddModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">

                            {/* QR Code Section */}
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-700">QR Code *</label>

                                {/* Scan mode toggle */}
                                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                    <button type="button" onClick={() => setAddScanMode('manual')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${addScanMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                                        <Keyboard size={13} /> Manual
                                    </button>
                                    <button type="button" onClick={() => setAddScanMode('camera')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${addScanMode === 'camera' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                                        <Camera size={13} /> Scan Camera
                                    </button>
                                </div>

                                {/* Camera view */}
                                {addScanMode === 'camera' && (
                                    <div>
                                        <div id={ADD_SCANNER_ID} className="w-full rounded-xl overflow-hidden border border-slate-200" />
                                        {addScannerError && <p className="text-xs text-red-500 mt-1">{addScannerError}</p>}
                                        <p className="text-xs text-slate-400 text-center mt-1">Point camera at the QR code on the card</p>
                                    </div>
                                )}

                                {/* Manual input */}
                                {addScanMode === 'manual' && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            maxLength={11}
                                            placeholder="Enter QR Code"
                                            value={addQrCode}
                                            onChange={e => { setAddQrCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setAddQrValidated(false); }}
                                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleValidateAddQR}
                                            disabled={addQrValidating || !addQrCode.trim()}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-all whitespace-nowrap"
                                        >
                                            {addQrValidating ? '...' : 'Validate'}
                                        </button>
                                    </div>
                                )}

                                {/* Validated card info */}
                                {addQrValidated && (
                                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                        <Lock size={13} className="text-emerald-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-emerald-700">QR Code Valid ✓</p>
                                            <p className="text-xs font-mono text-emerald-800">Card: {addCardDetails.CardNumber}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Personal details — shown after QR validated */}
                            {addQrValidated && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                                        <input type="text" required placeholder="Enter full name"
                                            value={newUser.name}
                                            onChange={e => setNewUser({ ...newUser, name: e.target.value.replace(/[^A-Za-z\s]/g, '') })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                                        <input type="email" placeholder="Enter Email" required value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                        <p className="mt-1 text-xs text-slate-400">Only @gmail.com addresses accepted.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={newUser.phoneCode || '+91'}
                                                onChange={e => setNewUser({ ...newUser, phoneCode: e.target.value })}
                                                className="px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm w-24"
                                            >
                                                <option value="+91">🇮🇳 +91</option>
                                                <option value="+1">🇺🇸 +1</option>
                                                <option value="+44">🇬🇧 +44</option>
                                                <option value="+971">🇦🇪 +971</option>
                                                <option value="+61">🇦🇺 +61</option>
                                                <option value="+65">🇸🇬 +65</option>
                                                <option value="+60">🇲🇾 +60</option>
                                            </select>
                                            <input type="tel" required placeholder="Phone number"
                                                value={newUser.phone}
                                                onChange={e => setNewUser({ ...newUser, phone: e.target.value.replace(/\D/g, '') })} pattern="\d{10}" maxLength={10}
                                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password *</label>
                                        <input type="text" required placeholder="Set a password"
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                        <PasswordStrengthChecker password={newUser.password} focused={!!newUser.password} />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={resetAddModal} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={!addQrValidated} className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-40">
                                    Create Student
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {
                showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-6 pt-25 animate-fade-in text-left overflow-y-auto"> {/* new changes */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-200 bg-slate-50 font-bold text-lg flex justify-between">
                                <span>Edit Student Profile</span>
                                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <form onSubmit={handleEditUser} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                    <input type="text" required placeholder="Enter full name" value={editUserForm.name} onChange={(e) => { const value = e.target.value.replace(/[^A-Za-z\s]/g, ''); setEditUserForm({ ...editUserForm, name: value }); }} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                    <input type="email" required value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={editUserForm.phoneCode || '+91'}
                                            onChange={e => setEditUserForm({ ...editUserForm, phoneCode: e.target.value })}
                                            className="px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm w-24"
                                        >
                                            <option value="+91">🇮🇳 +91</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+44">🇬🇧 +44</option>
                                            <option value="+971">🇦🇪 +971</option>
                                            <option value="+61">🇦🇺 +61</option>
                                            <option value="+65">🇸🇬 +65</option>
                                            <option value="+60">🇲🇾 +60</option>
                                        </select>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="Phone number"
                                            value={editUserForm.phone.replace(/^\+\d+\s?/, '')}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                setEditUserForm({ ...editUserForm, phone: digits });
                                            }}
                                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                    <div className="col-span-2 text-[11px] font-black uppercase tracking-wider text-slate-400 pt-2">Rewards &amp; wallet</div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Account type</label>
                                        <select value={editUserForm.accountType || 'school_student'} onChange={e => setEditUserForm({ ...editUserForm, accountType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm">
                                            <option value="school_student">School student</option>
                                            <option value="college_student">College student</option>
                                            <option value="adult">Adult</option>
                                            <option value="professional">Professional</option>
                                            <option value="instructor">Instructor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Cash rewards</label>
                                        <select value={editUserForm.walletAccess || 'default'} onChange={e => setEditUserForm({ ...editUserForm, walletAccess: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm">
                                            <option value="default">By account type (default)</option>
                                            <option value="enabled">Always enabled</option>
                                            <option value="disabled">Always disabled</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Institution</label>
                                        <input type="text" placeholder="e.g. ABC College" value={editUserForm.institution || ''} onChange={e => setEditUserForm({ ...editUserForm, institution: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Class / batch</label>
                                        <input type="text" placeholder="e.g. BCA 2nd year" value={editUserForm.className || ''} onChange={e => setEditUserForm({ ...editUserForm, className: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">New Password (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Leave empty to keep current"
                                        value={editUserForm.password}
                                        onFocus={() => setEditPwFocused(true)}
                                        onBlur={() => setEditPwFocused(false)}
                                        onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <PasswordStrengthChecker password={editUserForm.password} focused={editPwFocused} />
                                </div>
                                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                    <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors">Save Changes</button>
                                </div>
                            </form >
                        </div >
                    </div >
                )
            }
            {
                showAlert && (
                    <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center z-[100]">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">

                            {/* ✅ Dynamic Title */}
                            <h2 className={`text-lg font-bold mb-3 ${alertType === 'success' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {alertType === 'success' ? 'Success' : 'Error'}
                            </h2>

                            {/* ✅ Message */}
                            <p className="text-sm text-slate-600 mb-5">
                                {alertMessage}
                            </p>

                            {/* ✅ Button */}
                            <button
                                onClick={() => setShowAlert(false)}
                                className={`px-5 py-2 rounded-lg text-white ${alertType === 'success'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                OK
                            </button>

                        </div>
                    </div>
                )
            }

            {/* Delete Enrollment Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={executeRemoveEnrollment}
                title="Revoke Access"
                message={`Are you sure you want to revoke this student's access to the selected ${enrollmentToDelete?.type?.toLowerCase() || 'course'}?`}
                itemName={enrollmentToDelete?.type === 'Course' ? enrollmentToDelete?.courseId?.title : enrollmentToDelete?.bundleId?.title}
            />

            {/* Delete User Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteUserModal}
                onClose={() => setShowDeleteUserModal(false)}
                onConfirm={executeDeleteUser}
                title="Delete Student"
                message="Are you sure you want to permanently delete this student? This will remove all their data, clear their enrollments, and free up their card for reuse."
                itemName={userToDelete?.name}
            />
        </div >
    );
};

export default Users;
