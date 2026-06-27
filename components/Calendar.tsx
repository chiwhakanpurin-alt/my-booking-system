'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Clock, User, DoorOpen, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';

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
}

interface CalendarProps {
  bookings: Booking[];
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function Calendar({ bookings }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateBookings, setSelectedDateBookings] = useState<Booking[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Toast & Change Request State
  const { toasts, toast, dismissToast } = useToast();
  const [requestModal, setRequestModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    contactInfo: string;
  }>({
    isOpen: false,
    booking: null,
    contactInfo: ''
  });
  const [loadingRequest, setLoadingRequest] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedDateBookings !== null || requestModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedDateBookings, requestModal.isOpen]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get start day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Helper to format date string to YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const handleDateClick = (day: number, isCurrentMonth = true) => {
    const year = isCurrentMonth ? currentYear : (day > 20 ? currentYear - 1 : currentYear + 1);
    const month = isCurrentMonth ? currentMonth : (day > 20 ? currentMonth - 1 : currentMonth + 1);
    const dateStr = formatDateString(year, month, day);

    const dayBookings = bookings.filter((b) => b.booking_date === dateStr);
    
    setSelectedDateBookings(dayBookings);
    setSelectedDateStr(dateStr);
  };

  const closePopover = () => {
    setSelectedDateBookings(null);
    setSelectedDateStr(null);
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // Returns HH:MM from HH:MM:SS
  };

  const formatThaiDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]) + 543; // Buddhist Era
    const month = THAI_MONTHS[parseInt(parts[1]) - 1];
    const day = parseInt(parts[2]);
    return `${day} ${month} ${year}`;
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModal.booking) return;

    if (!requestModal.contactInfo.trim()) {
      toast.error('กรุณากรอกเบอร์ติดต่อ');
      return;
    }

    try {
      setLoadingRequest(true);
      const res = await fetch('/api/bookings/request-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: requestModal.booking.id,
          contactInfo: requestModal.contactInfo
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('ยกเลิกการจองสำเร็จ', 'รายการจองถูกยกเลิกแล้ว', 4000);
        setRequestModal({ ...requestModal, isOpen: false, contactInfo: '' });
        // Optionally, refresh bookings here if possible, or wait for polling.
      } else {
        toast.error('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถส่งคำขอได้');
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoadingRequest(false);
    }
  };

  // Generate day cells
  const dayCells = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    dayCells.push({ day, isCurrentMonth: false, monthOffset: -1 });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    dayCells.push({ day: i, isCurrentMonth: true, monthOffset: 0 });
  }

  const totalCellsNeeded = dayCells.length > 35 ? 42 : 35;
  const nextMonthDaysNeeded = totalCellsNeeded - dayCells.length;
  for (let i = 1; i <= nextMonthDaysNeeded; i++) {
    dayCells.push({ day: i, isCurrentMonth: false, monthOffset: 1 });
  }

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  return (
    <div className="w-full">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Calendar Card */}
      <div className="rounded-3xl glass-panel shadow-lg border border-slate-200/50 dark:border-zinc-800/40 p-4 sm:p-6">
        
        {/* Month Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {THAI_MONTHS[currentMonth]} {currentYear + 543}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all shadow-sm"
            >
              วันนี้
            </button>
            <button
              onClick={handleNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
              title="เดือนถัดไป"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Weekday Titles */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
          {WEEKDAYS.map((day, idx) => (
            <div key={idx} className="py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {dayCells.map((cell, idx) => {
            const { day, isCurrentMonth, monthOffset } = cell;
            const targetYear = monthOffset === -1 ? (currentMonth === 0 ? currentYear - 1 : currentYear) : (monthOffset === 1 ? (currentMonth === 11 ? currentYear + 1 : currentYear) : currentYear);
            const targetMonth = monthOffset === -1 ? (currentMonth === 0 ? 11 : currentMonth - 1) : (monthOffset === 1 ? (currentMonth === 11 ? 0 : currentMonth + 1) : currentMonth);
            const cellDateStr = formatDateString(targetYear, targetMonth, day);

            // Get bookings for this day cell
            const cellBookings = bookings.filter(
              (b) => b.booking_date === cellDateStr && b.status !== 'ยกเลิก'
            );
            const cellPendingBookings = cellBookings.filter(b => b.status === 'รออนุมัติ' || b.status === 'pending');
            const cellApprovedBookings = cellBookings.filter(b => b.status === 'อนุมัติแล้ว' || b.status === 'approved');

            const hasBookings = cellBookings.length > 0;
            const dayIsToday = isCurrentMonth && isToday(day);

            return (
              <button
                key={idx}
                onClick={() => handleDateClick(day, isCurrentMonth)}
                className={`relative flex flex-col h-14 sm:h-20 w-full justify-between p-1.5 sm:p-2.5 text-left rounded-2xl border transition-all select-none cursor-pointer outline-none group ${
                  isCurrentMonth
                    ? 'bg-white/40 dark:bg-zinc-900/30 border-slate-200/50 dark:border-zinc-800/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 hover:border-indigo-200/70 dark:hover:border-indigo-900/40'
                    : 'bg-slate-50/10 dark:bg-zinc-950/10 border-slate-100/30 dark:border-zinc-900/20 text-slate-300 dark:text-zinc-700 hover:border-indigo-100'
                } ${
                  dayIsToday
                    ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950 border-indigo-400! dark:border-indigo-500!'
                    : ''
                }`}
              >
                {/* Day Number */}
                <span className={`text-xs sm:text-sm font-semibold leading-none ${
                  dayIsToday 
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                    : isCurrentMonth 
                      ? 'text-slate-800 dark:text-zinc-200' 
                      : 'text-slate-400 dark:text-zinc-600'
                }`}>
                  {day}
                </span>

                {/* Booking counts indicators */}
                {hasBookings && (
                  <div className="flex flex-wrap items-center gap-1 mt-auto">
                    {/* Small visual dot system representing bookings */}
                    {cellApprovedBookings.length > 0 && (
                      <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500" title={`อนุมัติแล้ว ${cellApprovedBookings.length} รายการ`} />
                    )}
                    {cellPendingBookings.length > 0 && (
                      <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-cyan-500" title={`รออนุมัติ ${cellPendingBookings.length} รายการ`} />
                    )}
                    
                    {/* On Desktop, show count badge */}
                    <span className="hidden sm:inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-none">
                      {cellBookings.length} จอง
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Details Popover/Bubble Overlay via Portal */}
      {selectedDateBookings !== null && selectedDateStr !== null && mounted && createPortal(
        <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in-scale backdrop-blur-overlay bg-slate-900/60 dark:bg-black/80"
        onClick={closePopover}
      >
          <div
            className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-3xl glass-modal bg-white/98 dark:bg-zinc-900/98 shadow-2xl p-6 animate-fade-in-scale text-slate-900 dark:text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-700/40 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-500" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    รายละเอียดการจอง
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                    วันที่ {formatThaiDate(selectedDateStr)}
                  </p>
                </div>
              </div>
              <button
                onClick={closePopover}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/60 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-300/60 dark:hover:bg-zinc-700/60 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Popover Content */}
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {(() => {
                const validBookings = selectedDateBookings.filter(b => b.status !== 'ยกเลิก');
                
                return (
                  <>
                    {/* Daily Count summary */}
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/20 rounded-xl p-3.5 border border-indigo-200/50 dark:border-indigo-900/30 text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      มีห้องประชุมถูกจองทั้งหมด {validBookings.length} รายการในวันนึ้
                    </div>

                    {validBookings.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-zinc-500 text-sm">
                        ไม่มีการจองห้องประชุมในวันนี้
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {validBookings.map((booking, idx) => {
                    const isApproved = booking.status === 'อนุมัติแล้ว' || booking.status === 'approved';
                    const isPending = booking.status === 'รออนุมัติ' || booking.status === 'pending';
                    const isCancelled = booking.status === 'ยกเลิก' || booking.status === 'cancelled';

                    let badgeColor = '';
                    let statusLabel = booking.status;
                    if (isApproved) {
                      badgeColor = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/25';
                      statusLabel = 'อนุมัติแล้ว';
                    } else if (isPending) {
                      badgeColor = 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-900/25';
                      statusLabel = 'รออนุมัติ';
                    } else if (isCancelled) {
                      badgeColor = 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/30';
                      statusLabel = 'ยกเลิกแล้ว';
                    }

                    return (
                      <div
                        key={booking.id || idx}
                        className="rounded-2xl border border-slate-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-4 transition-all duration-200 hover:shadow-md hover:border-indigo-200/40 dark:hover:border-indigo-800/30"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                            {booking.activity_name}
                          </h4>
                          <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeColor}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <DoorOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span>ห้อง: <strong className="text-slate-800 dark:text-zinc-200">{booking.room_name}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span>เวลา: <strong className="text-slate-800 dark:text-zinc-200">{formatTime(booking.start_time)} - {formatTime(booking.end_time)} น.</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span>ผู้จอง: <strong className="text-slate-800 dark:text-zinc-200">{booking.booked_by}</strong></span>
                          </div>
                        </div>
                        
                        {/* Action buttons to request reschedule/cancel */}
                        {!isCancelled && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-zinc-700/50 flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setRequestModal({
                                  isOpen: true,
                                  booking,
                                  contactInfo: ''
                                });
                                closePopover();
                              }}
                              className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              ยกเลิกการจอง
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Popover Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-zinc-700/40 text-right">
              <button
                onClick={closePopover}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer active:scale-95"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Request Change Modal Overlay via Portal */}
      {requestModal.isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in backdrop-blur-overlay bg-slate-900/60 dark:bg-black/80"
          onClick={() => setRequestModal({ ...requestModal, isOpen: false })}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl glass-modal bg-white dark:bg-zinc-900 shadow-2xl p-6 text-slate-800 dark:text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                ยกเลิกการจอง
              </h3>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mb-5">
              กรุณากรอกเบอร์โทรศัพท์ที่ใช้ในการจองให้ถูกต้อง เพื่อยกเลิกการจองนี้
            </p>
            
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  เบอร์โทรศัพท์ยืนยันตัวตน *
                </label>
                <input
                  type="text"
                  required
                  value={requestModal.contactInfo}
                  onChange={(e) => setRequestModal({ ...requestModal, contactInfo: e.target.value })}
                  placeholder="เช่น 089-xxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={loadingRequest}
                  onClick={() => setRequestModal({ ...requestModal, isOpen: false })}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-sm cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loadingRequest}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition text-sm flex justify-center items-center gap-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none shadow-md shadow-indigo-600/20"
                >
                  {loadingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ยืนยันยกเลิก'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
