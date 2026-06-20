'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, X, CalendarDays, Clock, User, CheckCircle2 } from 'lucide-react';
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
  return timeStr.substring(0, 5);
}

/* ─────────────────────────────────────────────
   Single popup card (TikTok / LINE style)
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
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(calc(100% + 32px)) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
      }}
      className="w-80 sm:w-96 pointer-events-auto"
      role="alert"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 dark:border-indigo-800/50 bg-white/95 dark:bg-zinc-900/95 shadow-2xl shadow-indigo-500/15 backdrop-blur-xl">
        {/* Colored top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Animated shimmer ring around icon */}
        <div className="flex items-start gap-3 p-4">
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            {/* live pulse dot */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                📋 มีการจองใหม่!
              </p>
              <button
                onClick={() => onDismiss(notif.key)}
                aria-label="ปิดการแจ้งเตือน"
                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
              {booking.activity_name}
            </p>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                <User className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="font-semibold">{booking.booked_by}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                <span>
                  {formatThaiDate(booking.booking_date)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)} น.
                </span>
              </div>
            </div>

            <div className="mt-2.5 text-[10px] text-slate-400 dark:text-zinc-500 truncate">
              🏢 {booking.room_name}
            </div>
          </div>
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
  const isFirst = useRef(true); // skip initial fetch notifications

  const dismissPopup = useCallback((key: string) => {
    // animate out
    setPopups((prev) =>
      prev.map((p) => (p.key === key ? { ...p, visible: false } : p))
    );
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.key !== key));
    }, 400);
  }, []);

  const addPopup = useCallback(
    (booking: BookingNotification) => {
      const key = `${booking.id}-${Date.now()}`;
      // slide in
      setPopups((prev) => [...prev, { key, booking, visible: false }]);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPopups((prev) =>
            prev.map((p) => (p.key === key ? { ...p, visible: true } : p))
          );
        });
      });
      setUnreadCount((c) => c + 1);
      // auto dismiss after 8 seconds
      setTimeout(() => dismissPopup(key), 8000);
    },
    [dismissPopup]
  );

  useEffect(() => {
    // Subscribe to INSERT events on bookings table
    const channel = supabase
      .channel('admin-booking-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          // Skip firing on initial load (Supabase sometimes replays recent events)
          if (isFirst.current) return;
          const booking = payload.new as BookingNotification;
          addPopup(booking);
        }
      )
      .subscribe();

    // After short delay, mark initial load done
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

      {/* Popup stack — fixed top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {popups.map((notif) => (
          <BookingPopup key={notif.key} notif={notif} onDismiss={dismissPopup} />
        ))}
      </div>
    </>
  );
}
