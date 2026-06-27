'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Check, X, HelpCircle, Loader2, RefreshCw, Search, UserCheck, Trash2 } from 'lucide-react';

interface Booking {
  id: string;
  activity_name: string;
  booked_by: string;
  room_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  details?: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ยกเลิก'>('ทั้งหมด');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    bookingId: string;
    action: 'อนุมัติแล้ว' | 'ยกเลิก' | 'ลบ';
    activityName: string;
  } | null>(null);

  // Details Modal state
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    details: string;
    activityName: string;
  } | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setBookings(json.data || []);
        }
      }
    } catch (err) {
      console.error('Fetch bookings in admin error:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeAdminToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) return;

      const padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
      const base64 = (publicVapidKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });
      }

      // Send to server
      await fetch('/api/admin/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushSubscription: subscription }),
      });
    } catch (err) {
      console.error('Admin push sub error:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    subscribeAdminToPush();
  }, []);

  const handleActionClick = (bookingId: string, action: 'อนุมัติแล้ว' | 'ยกเลิก' | 'ลบ', activityName: string) => {
    setConfirmModal({
      isOpen: true,
      bookingId,
      action,
      activityName,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;

    const { bookingId, action } = confirmModal;
    setConfirmModal(null);
    setUpdatingId(bookingId);

    try {
      let endpoint = '/api/admin/update';
      let body: any = { bookingId };

      if (action === 'ลบ') {
        endpoint = '/api/admin/delete';
      } else {
        body.status = action;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (action === 'ลบ') {
          // Remove from local state for delete
          setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        } else {
          // Update status for approve/cancel
          setBookings((prev) =>
            prev.map((b) => (b.id === bookingId ? { ...b, status: action } : b))
          );
        }
      } else {
        alert(data.message || 'การดำเนินการล้มเหลว');
      }
    } catch (err) {
      console.error('Action execution error:', err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const formatThaiDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]) + 543;
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return `${day}/${month}/${year}`;
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchSearch =
      booking.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booked_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ทั้งหมด') return matchSearch;
    if (statusFilter === 'รออนุมัติ') return matchSearch && (booking.status === 'รออนุมัติ' || booking.status === 'pending');
    if (statusFilter === 'อนุมัติแล้ว') return matchSearch && (booking.status === 'อนุมัติแล้ว' || booking.status === 'approved');
    if (statusFilter === 'ยกเลิก') return matchSearch && (booking.status === 'ยกเลิก' || booking.status === 'cancelled');
    return matchSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        
        {/* Admin Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-indigo-500" />
              แผงควบคุมระบบ (Admin Control Panel)
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium">
              จัดการรายการจองห้องประชุม อนุมัติคำขอจอง หรือยกเลิกการจอง
            </p>
          </div>

          <button
            onClick={fetchBookings}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-sm cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            ดึงข้อมูลใหม่
          </button>
        </div>

        {/* Filter and Search Bar Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-200/50 dark:border-zinc-800/40">
          
          {/* Status Tabs Filter */}
          <div className="flex flex-wrap gap-1">
            {(['ทั้งหมด', 'รออนุมัติ', 'อนุมัติแล้ว', 'ยกเลิก'] as const).map((tab) => {
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:max-w-xs">
            <input
              type="text"
              placeholder="ค้นหาชื่อกิจกรรม, ผู้จอง, หรือห้อง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-xs"
            />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          </div>

        </div>

        {/* Main Table Grid Container */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-500">
              กำลังดึงข้อมูลรายการจอง...
            </p>
          </div>
        ) : (
          <div className="rounded-3xl glass-panel border border-slate-200/50 dark:border-zinc-800/40 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-zinc-800 bg-slate-100/30 dark:bg-zinc-900/10 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-4 font-semibold">ชื่อกิจกรรม / รายละเอียด</th>
                    <th className="px-5 py-4 font-semibold">ผู้จอง</th>
                    <th className="px-5 py-4 font-semibold">ห้องประชุม</th>
                    <th className="px-5 py-4 font-semibold">วันที่จอง</th>
                    <th className="px-5 py-4 font-semibold">ช่วงเวลา</th>
                    <th className="px-5 py-4 font-semibold">สถานะ</th>
                    <th className="px-5 py-4 font-semibold text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-slate-400 dark:text-zinc-500">
                        ไม่พบข้อมูลการจองห้องประชุม
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => {
                      const isPending = booking.status === 'รออนุมัติ' || booking.status === 'pending';
                      const isApproved = booking.status === 'อนุมัติแล้ว' || booking.status === 'approved';
                      const isCancelled = booking.status === 'ยกเลิก' || booking.status === 'cancelled';
                      const isWorking = updatingId === booking.id;

                      let statusBadge = '';
                      let statusText = booking.status;
                      if (isApproved) {
                        statusBadge = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/25';
                        statusText = 'อนุมัติแล้ว';
                      } else if (isPending) {
                        statusBadge = 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-900/25';
                        statusText = 'รออนุมัติ';
                      } else if (isCancelled) {
                        statusBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30';
                        statusText = 'ยกเลิกแล้ว';
                      }

                      let cleanDetails = '';
                      let contactInfo = '';
                      if (booking.details) {
                        const noPushSub = booking.details.split('---PUSH_SUB---')[0];
                        const contactSplit = noPushSub.split('---CONTACT_INFO---');
                        cleanDetails = contactSplit[0].replace(/^อีเมลผู้จอง:\s*[^\s]+\s*/, '').trim();
                        if (contactSplit.length > 1) {
                          contactInfo = contactSplit[1].trim();
                        }
                      }

                      return (
                        <tr
                          key={booking.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition duration-150"
                        >
                          {/* Activity details */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {booking.activity_name}
                            </div>
                            {cleanDetails && (
                              <button
                                onClick={() => setDetailsModal({
                                  isOpen: true,
                                  details: cleanDetails,
                                  activityName: booking.activity_name
                                })}
                                className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50 dark:hover:bg-indigo-900/50 transition cursor-pointer"
                              >
                                ดูรายละเอียด
                              </button>
                            )}
                          </td>
                          {/* Booked by */}
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-700 dark:text-zinc-300">
                              {booking.booked_by}
                            </div>
                            {contactInfo && (
                              <div className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
                                โทร: {contactInfo}
                              </div>
                            )}
                          </td>
                          {/* Room Name */}
                          <td className="px-5 py-4 text-slate-700 dark:text-zinc-300 font-semibold">
                            {booking.room_name}
                          </td>
                          {/* Date */}
                          <td className="px-5 py-4 text-slate-600 dark:text-zinc-400">
                            {formatThaiDate(booking.booking_date)}
                          </td>
                          {/* Time */}
                          <td className="px-5 py-4 font-semibold text-slate-700 dark:text-zinc-300">
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)} น.
                          </td>
                          {/* Status */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider ${statusBadge}`}>
                              {statusText}
                            </span>
                          </td>
                          {/* Action management */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {isWorking ? (
                                <Loader2 className="h-4.5 w-4.5 text-indigo-500 animate-spin" />
                              ) : (
                                <>
                                  {/* Approve Button — shown for pending and cancelled bookings */}
                                  {(isPending || isCancelled) && (
                                    <button
                                      onClick={() => handleActionClick(booking.id, 'อนุมัติแล้ว', booking.activity_name)}
                                      className="flex h-8 px-3.5 items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm hover:scale-[1.03] active:scale-[0.97] cursor-pointer text-xs"
                                      title="อนุมัติการจอง"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      อนุมัติ
                                    </button>
                                  )}

                                  {/* Cancel Button — shown for pending and approved bookings */}
                                  {(isPending || isApproved) && (
                                    <button
                                      onClick={() => handleActionClick(booking.id, 'ยกเลิก', booking.activity_name)}
                                      className="flex h-8 px-3.5 items-center gap-1 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200/50 dark:border-rose-900/25 font-bold transition shadow-sm hover:scale-[1.03] active:scale-[0.97] cursor-pointer text-xs"
                                      title="ยกเลิกการจอง"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      ยกเลิก
                                    </button>
                                  )}

                                  {/* Delete Button — shown only for cancelled bookings */}
                                  {isCancelled && (
                                    <button
                                      onClick={() => handleActionClick(booking.id, 'ลบ', booking.activity_name)}
                                      className="flex h-8 px-3.5 items-center gap-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-300/60 dark:hover:bg-slate-700/40 font-bold transition shadow-sm hover:scale-[1.03] active:scale-[0.97] cursor-pointer text-xs"
                                      title="ลบการจอง"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      ลบ
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Confirmation Modal Overlay */}
      {confirmModal && confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl glass-modal shadow-2xl border border-slate-200/50 dark:border-zinc-800/40 p-6 animate-fade-in text-slate-800 dark:text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600 dark:text-indigo-400 shadow-inner">
                <HelpCircle className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  ยืนยันการดำเนินการ
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium">
                  {confirmModal.action === 'อนุมัติแล้ว'
                    ? `คุณต้องการอนุมัติรายการ "${confirmModal.activityName}" ใช่หรือไม่?`
                    : confirmModal.action === 'ยกเลิก'
                    ? `คุณต้องการยกเลิกรายการ "${confirmModal.activityName}" ใช่หรือไม่?`
                    : `คุณต้องการลบรายการ "${confirmModal.activityName}" ใช่หรือไม่?`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-xs sm:text-sm cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`flex-1 py-2.5 rounded-xl text-white font-bold hover:scale-[1.01] transition text-xs sm:text-sm cursor-pointer ${
                    confirmModal.action === 'อนุมัติแล้ว'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : confirmModal.action === 'ยกเลิก'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal Overlay */}
      {detailsModal && detailsModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          onClick={() => setDetailsModal(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl glass-modal shadow-2xl border border-slate-200/50 dark:border-zinc-800/40 p-6 animate-fade-in text-slate-800 dark:text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug flex items-center justify-between">
                  <span>รายละเอียดเพิ่มเติม</span>
                  <button onClick={() => setDetailsModal(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition cursor-pointer">
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {detailsModal.activityName}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80">
                <p className="text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {detailsModal.details}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setDetailsModal(null)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-sm cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
