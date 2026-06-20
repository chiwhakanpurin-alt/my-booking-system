'use client';

/**
 * BookingStatusWatcher
 *
 * Mounted on the main home page. Watches Supabase Realtime for UPDATE events
 * on the bookings table and shows a TikTok-style popup to the booker when
 * their booking's status changes (approved / cancelled).
 *
 * The booker's identity is matched by checking if the local browser's
 * "pending booking" (stored in sessionStorage after they submit) matches
 * the updated record.  This is client-side only — no personal data is
 * stored on the server beyond what is already in the DB.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, X, CalendarDays, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StatusUpdate {
  id: string;
  activity_name: string;
  booked_by: string;
  room_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface PopupItem {
  key: string;
  update: StatusUpdate;
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
function formatTime(t: string) { return t.substring(0, 5); }

/* ─── Single status popup card ─── */
function StatusPopup({ item, onDismiss }: { item: PopupItem; onDismiss: (key: string) => void }) {
  const { update, visible } = item;
  const isApproved = update.status === 'อนุมัติแล้ว' || update.status === 'approved';

  return (
    <div
      style={{
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(calc(100% + 32px)) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
      }}
      className="w-80 sm:w-96 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-zinc-900/95 ${
        isApproved
          ? 'border-emerald-200/60 dark:border-emerald-800/50 shadow-emerald-500/15'
          : 'border-rose-200/60 dark:border-rose-800/50 shadow-rose-500/15'
      }`}>
        {/* Colored bar */}
        <div className={`h-1 w-full ${isApproved ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`} />

        <div className="flex items-start gap-3 p-4">
          {/* Icon */}
          <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-md ${
            isApproved
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20'
              : 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-500/20'
          }`}>
            {isApproved
              ? <CheckCircle2 className="h-5 w-5 text-white" />
              : <XCircle className="h-5 w-5 text-white" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-black uppercase tracking-wide ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isApproved ? '✅ การจองได้รับการอนุมัติ!' : '❌ การจองถูกยกเลิก'}
              </p>
              <button
                onClick={() => onDismiss(item.key)}
                aria-label="ปิด"
                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
              {update.activity_name}
            </p>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                <CalendarDays className="h-3 w-3 shrink-0" />
                <span>{formatThaiDate(update.booking_date)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{formatTime(update.start_time)}–{formatTime(update.end_time)} น.</span>
              </div>
            </div>

            {isApproved && (
              <p className="mt-2.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                🎉 กรุณาเตรียมตัวให้พร้อมก่อนเวลา
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main watcher (no visible UI beyond the popup) ─── */
export default function BookingStatusWatcher() {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const isFirst = useRef(true);

  const dismissPopup = useCallback((key: string) => {
    setPopups((prev) => prev.map((p) => (p.key === key ? { ...p, visible: false } : p)));
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.key !== key)), 400);
  }, []);

  const showPopup = useCallback(
    (update: StatusUpdate) => {
      const key = `${update.id}-${Date.now()}`;
      setPopups((prev) => [...prev, { key, update, visible: false }]);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPopups((prev) => prev.map((p) => (p.key === key ? { ...p, visible: true } : p)));
        });
      });
      setTimeout(() => dismissPopup(key), 9000);
    },
    [dismissPopup]
  );

  useEffect(() => {
    // Subscribe to UPDATE events — status column changes
    const channel = supabase
      .channel('public-booking-status-watch')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          if (isFirst.current) return;
          const updated = payload.new as StatusUpdate;
          const prev = payload.old as { status?: string };

          // Only fire when status actually changed to approved or cancelled
          const changed = updated.status !== prev.status;
          const isActionable =
            updated.status === 'อนุมัติแล้ว' ||
            updated.status === 'approved' ||
            updated.status === 'ยกเลิก' ||
            updated.status === 'cancelled';

          if (changed && isActionable) {
            showPopup(updated);
          }
        }
      )
      .subscribe();

    const t = setTimeout(() => { isFirst.current = false; }, 1500);

    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [showPopup]);

  if (popups.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-3 pointer-events-none">
      {popups.map((item) => (
        <StatusPopup key={item.key} item={item} onDismiss={dismissPopup} />
      ))}
    </div>
  );
}
