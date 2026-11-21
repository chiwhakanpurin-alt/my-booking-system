'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, X, CalendarDays, Clock, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BookingNotification {
  id: string;
  activity_name: string;
  booked_by: string;
  room_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

interface PopupNotif {
  key: string;
  booking: BookingNotification;
  visible: boolean;
}

function formatThaiDate(dateStr: string) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const year = parseInt(parts[0]) + 543;
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  return `${day} ${months[month]} ${year}`;
}

function formatTime(timeStr: string) {
  return timeStr ? timeStr.substring(0, 5) : '';
}

/* ─────────────────────────────────────────────
   iOS / LINE Style Top Notification Banner
───────────────────────────────────────────── */
function BookingPopup({
  notif,
  onDismiss,
}: {
  notif: PopupNotif;
  onDismiss: (key: string) => void;
}) {
  const { booking, visible } = notif;

  return (
    <div
      style={{
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-140%) scale(0.92)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
      }}
      className="w-[92vw] max-w-[420px] pointer-events-auto"
      role="alert"
      aria-live="polite"
    >
      <div
        onClick={() => onDismiss(notif.key)}
        className="relative overflow-hidden rounded-[26px] border border-white/50 dark:border-zinc-700/60 bg-white/90 dark:bg-zinc-900/90 shadow-[0_14px_40px_rgba(0,0,0,0.18)] backdrop-blur-2xl px-4 py-3.5 cursor-pointer select-none"
      >
        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="relative shrink-0 mt-0.5">
            <img
              src="/school-logo.png"
              alt="App Icon"
              className="h-11 w-11 rounded-2xl object-cover shadow-sm bg-white p-0.5 border border-slate-100 dark:border-zinc-800"
            />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white dark:border-zinc-900" />
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-tight">
                  ระบบจองห้องประชุม
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">• ตอนนี้</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(notif.key);
                }}
                aria-label="ปิดการแจ้งเตือน"
                className="shrink-0 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">
              📋 มีคำขอจองห้องประชุมใหม่!
            </p>

            <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
              {booking.activity_name} ({booking.room_name})
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                <User className="h-3 w-3 shrink-0" />
                {booking.booked_by}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {formatThaiDate(booking.booking_date)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)} น.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom iOS Grabber Pill */}
        <div className="mt-2.5 flex justify-center">
          <div className="h-1 w-9 rounded-full bg-slate-300/80 dark:bg-zinc-700/80" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Bell icon + counter badge (for Navbar use)
───────────────────────────────────────────── */
export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [popups, setPopups] = useState<PopupNotif[]>([]);
  const isFirst = useRef(true);

  const dismissPopup = useCallback((key: string) => {
    setPopups((prev) =>
      prev.map((p) => (p.key === key ? { ...p, visible: false } : p))
    );
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.key !== key));
    }, 450);
  }, []);

  const addPopup = useCallback(
    (booking: BookingNotification) => {
      if (booking.activity_name === 'ADMIN_SUBSCRIPTION') return;
      const key = `${booking.id}-${Date.now()}`;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
      }
      setPopups((prev) => [...prev, { key, booking, visible: false }]);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPopups((prev) =>
            prev.map((p) => (p.key === key ? { ...p, visible: true } : p))
          );
        });
      });
      setUnreadCount((c) => c + 1);
      setTimeout(() => dismissPopup(key), 8500);
    },
    [dismissPopup]
  );

  useEffect(() => {
    const channel = supabase
      .channel('admin-booking-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          if (isFirst.current) return;
          const booking = payload.new as BookingNotification;
          addPopup(booking);
        }
      )
      .subscribe();

    const t = setTimeout(() => {
      isFirst.current = false;
    }, 1500);

    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [addPopup]);

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setUnreadCount(0)}
        aria-label={`การแจ้งเตือน ${unreadCount} รายการ`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
      >
        <Bell className={`h-4.5 w-4.5 ${unreadCount > 0 ? 'animate-[wiggle_0.5s_ease-in-out]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popup stack — fixed top-center (iOS Notification Banner style) */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 pointer-events-none">
        {popups.map((notif) => (
          <BookingPopup key={notif.key} notif={notif} onDismiss={dismissPopup} />
        ))}
      </div>
    </>
  );
}
