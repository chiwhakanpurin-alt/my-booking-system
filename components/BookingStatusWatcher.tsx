'use client';

/**
 * BookingStatusWatcher
 *
 * Mounted on the main home page. Watches Supabase Realtime for UPDATE events
 * on the bookings table and shows an iOS / LINE style top notification banner
 * when their booking's status changes (approved / cancelled).
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

function formatTime(t: string) {
  return t ? t.substring(0, 5) : '';
}

/* ─── iOS / LINE Style Top Notification Banner ─── */
function StatusPopup({ item, onDismiss }: { item: PopupItem; onDismiss: (key: string) => void }) {
  const { update, visible } = item;
  const isApproved = update.status === 'อนุมัติแล้ว' || update.status === 'approved';

  return (
    <div
      style={{
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-140%) scale(0.92)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
      }}
      className="w-[92vw] max-w-[420px] pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div
        onClick={() => onDismiss(item.key)}
        className="relative overflow-hidden rounded-[26px] border border-white/50 dark:border-zinc-700/60 shadow-[0_14px_40px_rgba(0,0,0,0.18)] backdrop-blur-2xl bg-white/90 dark:bg-zinc-900/90 px-4 py-3.5 cursor-pointer select-none"
      >
        <div className="flex items-start gap-3.5">
          {/* App Icon (iOS Banner Style) */}
          <div className="relative shrink-0 mt-0.5">
            <img
              src="/school-logo.png"
              alt="App Icon"
              className="h-11 w-11 rounded-2xl object-cover shadow-sm bg-white p-0.5 border border-slate-100 dark:border-zinc-800"
            />
            <span
              className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center shadow ${
                isApproved ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-white" />
              )}
            </span>
          </div>

          {/* Notification Content */}
          <div className="flex-1 min-w-0">
            {/* Top Header Row: App Name & "ตอนนี้" */}
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
                  onDismiss(item.key);
                }}
                aria-label="ปิด"
                className="shrink-0 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Title (LINE Message Style) */}
            <p
              className={`text-sm font-extrabold leading-tight mt-0.5 ${
                isApproved
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isApproved ? '✅ การจองของคุณได้รับอนุมัติแล้ว!' : '❌ การจองของคุณถูกยกเลิก'}
            </p>

            {/* Activity & Room Details */}
            <p className="mt-1 text-xs font-bold text-slate-800 dark:text-zinc-100 line-clamp-1">
              {update.activity_name} ({update.room_name})
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3 shrink-0" />
                {formatThaiDate(update.booking_date)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {formatTime(update.start_time)}–{formatTime(update.end_time)} น.
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

/* ─── Main watcher ─── */
export default function BookingStatusWatcher() {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const isFirst = useRef(true);

  const dismissPopup = useCallback((key: string) => {
    setPopups((prev) => prev.map((p) => (p.key === key ? { ...p, visible: false } : p)));
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.key !== key)), 450);
  }, []);

  const showPopup = useCallback(
    (update: StatusUpdate) => {
      const key = `${update.id}-${Date.now()}`;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
      }
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
    const channel = supabase
      .channel('public-booking-status-watch')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          if (isFirst.current) return;
          const updated = payload.new as StatusUpdate;
          const prev = payload.old as { status?: string };

          const changed = updated.status !== prev.status;
          const isActionable =
            updated.status === 'อนุมัติแล้ว' ||
            updated.status === 'approved' ||
            updated.status === 'ยกเลิก' ||
            updated.status === 'cancelled';

          if (changed && isActionable) {
            try {
              const pending = JSON.parse(sessionStorage.getItem('pending_bookings') || '[]');
              if (pending.includes(updated.id)) {
                showPopup(updated);
                const newPending = pending.filter((id: string) => id !== updated.id);
                sessionStorage.setItem('pending_bookings', JSON.stringify(newPending));
              }
            } catch (e) {
              console.error('Failed to parse pending_bookings', e);
            }
          }
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
  }, [showPopup]);

  if (popups.length === 0) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 pointer-events-none">
      {popups.map((item) => (
        <StatusPopup key={item.key} item={item} onDismiss={dismissPopup} />
      ))}
    </div>
  );
}
