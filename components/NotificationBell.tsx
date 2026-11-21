'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellIcon, X, Clock, User, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button-1';
import { Badge } from '@/components/ui/badge';

interface BookingNotification {
  id: string;
  activity_name: string;
  booked_by: string;
  room_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status?: string;
  created_at: string;
}

interface PopupNotif {
  key: string;
  booking: BookingNotification;
  visible: boolean;
  isWelcome?: boolean;
}

interface NotificationBellProps {
  isAdmin?: boolean;
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

/** เล่นเสียงแจ้งเตือนสไตล์ iOS (Web Audio API — ไม่ต้องใช้ไฟล์เสียงภายนอก ทำงานได้ทุกเบราว์เซอร์รวมถึง iOS Safari) */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // โน้ต 2 จังหวะสไตล์ iOS Tri-tone / Chime (C6 -> G6)
    const notes = [1046.5, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.36);
    });
  } catch {
    // ignore audio policy restriction if no user interaction yet
  }
}

/** แสดง Native / Service Worker Notification ควบคู่กับแบนเนอร์บนหน้าเว็บ (ถ้ารองรับ) */
export async function triggerBrowserNotification(title: string, body: string, url = '/') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/school-logo.png',
          badge: '/school-logo.png',
          data: { url },
        });
        return;
      }
    }
    new Notification(title, {
      body,
      icon: '/school-logo.png',
    });
  } catch {
    // ignore on platforms that restrict direct Notification constructor
  }
}

/** ฟังก์ชันลงทะเบียน Web Push Subscription (รองรับทั้งผู้ใช้ทั่วไปและ Admin รวมถึง iOS Home Screen PWA) */
export async function requestAndSubscribePush(isAdmin = false, sendTestPush = false): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;

  try {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    if (permission !== 'granted') return null;

    if (!('serviceWorker' in navigator)) {
      return null;
    }

    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) return null;

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) return null;

    const padding = '='.repeat((4 - (publicVapidKey.length % 4)) % 4);
    const base64 = (publicVapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      });
    }

    // เก็บไว้ใน localStorage เพื่อใช้แนบตอนจองและจำค่าเครื่อง
    localStorage.setItem('cached_push_subscription', JSON.stringify(subscription));

    if (isAdmin) {
      await fetch('/api/admin/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushSubscription: subscription }),
      });
    }

    // ผูก Push Subscription กับรายการจองที่ค้างอยู่ในเครื่อง และส่ง Web Push จริงผ่าน Apple APNs / FCM เมื่อกดอนุญาต
    try {
      const pendingSession = JSON.parse(sessionStorage.getItem('pending_bookings') || '[]');
      const pendingLocal = JSON.parse(localStorage.getItem('pending_bookings') || '[]');
      const pendingBookingIds = Array.from(new Set([...pendingSession, ...pendingLocal])).filter(Boolean);

      if (sendTestPush || pendingBookingIds.length > 0) {
        await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pushSubscription: subscription,
            pendingBookingIds,
            sendTestPush,
          }),
        });
      }
    } catch {
      // ignore test push error
    }

    return subscription;
  } catch (err) {
    console.warn('Web push subscription note:', err);
    return null;
  }
}

/* ─────────────────────────────────────────────
   iOS / LINE Style Top Notification Banner (Admin & Welcome Confirmation)
───────────────────────────────────────────── */
function BookingPopup({
  notif,
  onDismiss,
}: {
  notif: PopupNotif;
  onDismiss: (key: string) => void;
}) {
  const { booking, visible, isWelcome } = notif;

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
            {isWelcome ? (
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white dark:border-zinc-900" />
              </span>
            )}
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

            {isWelcome ? (
              <>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                  🔔 เปิดรับการแจ้งเตือนสำเร็จ!
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-zinc-300 leading-snug">
                  ระบบจะเด้งแจ้งเตือนสถานะการจองให้คุณทราบทันทีบนอุปกรณ์นี้
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
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
   Bell icon + Initial Permission Modal
───────────────────────────────────────────── */
export default function NotificationBell({ isAdmin = false }: NotificationBellProps) {
  const [popups, setPopups] = useState<PopupNotif[]>([]);
  const [isGranted, setIsGranted] = useState<boolean>(true); // default true until client hydration check
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const isFirst = useRef(true);
  const seenBookingIds = useRef<Set<string>>(new Set());
  const pollInitialized = useRef(false);

  const dismissPopup = useCallback((key: string) => {
    setPopups((prev) =>
      prev.map((p) => (p.key === key ? { ...p, visible: false } : p))
    );
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.key !== key));
    }, 450);
  }, []);

  const addPopup = useCallback(
    (booking: BookingNotification, isWelcome = false) => {
      if (booking.activity_name === 'ADMIN_SUBSCRIPTION') return;
      if (!isWelcome) {
        if (seenBookingIds.current.has(booking.id)) return;
        seenBookingIds.current.add(booking.id);
      }

      const key = `${booking.id}-${Date.now()}`;
      playNotificationChime();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
      }

      if (!isWelcome) {
        triggerBrowserNotification(
          '📋 มีคำขอจองห้องประชุมใหม่!',
          `${booking.activity_name} (${booking.room_name}) โดย ${booking.booked_by}`,
          '/admin'
        );
      }

      setPopups((prev) => [...prev, { key, booking, visible: false, isWelcome }]);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPopups((prev) =>
            prev.map((p) => (p.key === key ? { ...p, visible: true } : p))
          );
        });
      });
      setTimeout(() => dismissPopup(key), isWelcome ? 5000 : 8500);
    },
    [dismissPopup]
  );

  // Check saved permission status on mount
  useEffect(() => {
    const checkPermissionStatus = () => {
      const savedConsent = localStorage.getItem('notification_consent_status'); // 'granted' | 'denied' | null
      const hasNativeNotif = typeof window !== 'undefined' && 'Notification' in window;
      const browserGranted = hasNativeNotif && Notification.permission === 'granted';
      const browserDefault = hasNativeNotif && Notification.permission === 'default';

      if (browserGranted || (!hasNativeNotif && savedConsent === 'granted')) {
        setIsGranted(true);
        localStorage.setItem('notification_consent_status', 'granted');
        if (isAdmin) {
          requestAndSubscribePush(true);
        }
      } else if (savedConsent === 'denied') {
        setIsGranted(false);
        setShowPromptModal(false);
      } else if (browserDefault && savedConsent === 'granted') {
        // เคยกดในเว็บแล้วแต่ยังไม่ได้กด Allow ของเบราว์เซอร์ -> ให้แสดงปุ่มขออนุญาตแจ้งเตือนชัดเจน
        setIsGranted(false);
        setShowPromptModal(false);
      } else {
        // เข้าเว็บครั้งแรก -> เด้งป๊อปอัปขออนุญาตอัตโนมัติ + แสดงปุ่มขออนุญาตแจ้งเตือน
        setIsGranted(false);
        setShowPromptModal(true);
      }
    };

    checkPermissionStatus();

    const handleOpenModal = () => setShowPromptModal(true);
    const handleConsentChanged = () => checkPermissionStatus();
    window.addEventListener('open-notification-permission-modal', handleOpenModal);
    window.addEventListener('notification-consent-granted', handleConsentChanged);
    return () => {
      window.removeEventListener('open-notification-permission-modal', handleOpenModal);
      window.removeEventListener('notification-consent-granted', handleConsentChanged);
    };
  }, [isAdmin]);

  const handleAllowNotifications = async () => {
    setShowPromptModal(false);

    // ขอสิทธิ์ Web Push ทันทีในจังหวะที่ผู้ใช้กดปุ่ม (User Gesture สำหรับ iOS Home Screen PWA / Safari / Chrome)
    const sub = await requestAndSubscribePush(isAdmin, true);

    const hasNativeNotif = typeof window !== 'undefined' && 'Notification' in window;
    if (hasNativeNotif && Notification.permission !== 'granted') {
      // กรณีผู้ใช้เผลอกด "ไม่อนุญาต" ในป๊อปอัปของระบบ iOS / เบราว์เซอร์
      setIsGranted(false);
      return;
    }

    localStorage.setItem('notification_consent_status', 'granted');
    setIsGranted(true);

    // แสดงป๊อปอัปแบนเนอร์ยืนยันด้านบนจอ + เสียงแจ้งเตือนทันทีที่กดอนุญาต
    addPopup(
      {
        id: 'welcome-notif',
        activity_name: 'เปิดรับการแจ้งเตือนสำเร็จ',
        booked_by: '',
        room_name: '',
        booking_date: '',
        start_time: '',
        end_time: '',
        created_at: new Date().toISOString(),
      },
      true
    );

    // ถ้าไม่ได้ส่งผ่าน Server Web Push (เช่น เปิดในแท็บ Safari ปกติที่ไม่มี Push Subscription) ให้เรียก Local Notification แทน
    if (!sub) {
      triggerBrowserNotification(
        '🔔 เปิดรับการแจ้งเตือนสำเร็จ!',
        'ระบบจะแจ้งเตือนสถานะการจองห้องประชุมให้คุณทราบทันที',
        '/'
      );
    }

    window.dispatchEvent(new CustomEvent('notification-consent-granted'));
  };

  const handleDenyNotifications = () => {
    localStorage.setItem('notification_consent_status', 'denied');
    setIsGranted(false);
    setShowPromptModal(false);
  };

  // Realtime + Smart Polling listener for Admin when new booking arrives
  useEffect(() => {
    if (!isAdmin) return;

    const checkNewAdminBookings = async () => {
      try {
        const res = await fetch('/api/bookings', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;

        const list: BookingNotification[] = json.data;
        if (!pollInitialized.current) {
          list.forEach((b) => seenBookingIds.current.add(b.id));
          pollInitialized.current = true;
          return;
        }

        for (const b of list) {
          if (!seenBookingIds.current.has(b.id) && (b.status === 'รออนุมัติ' || b.status === 'pending')) {
            addPopup(b);
          } else {
            seenBookingIds.current.add(b.id);
          }
        }
      } catch {
        // ignore network poll errors
      }
    };

    checkNewAdminBookings();
    const pollInterval = setInterval(checkNewAdminBookings, 5000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkNewAdminBookings();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', checkNewAdminBookings);

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
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', checkNewAdminBookings);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, addPopup]);

  return (
    <>
      {/* ปุ่มกระดิ่งแจ้งเตือน: แสดงป้ายเลข 1 เฉพาะตอนที่ยังไม่ได้กดอนุญาต พอกดอนุญาตแล้วซ่อนป้ายตัวเลข */}
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setShowPromptModal(true)}
        title={!isGranted ? 'ขออนุญาตแจ้งเตือน' : 'ตั้งค่าการแจ้งเตือน'}
        aria-label="การแจ้งเตือน"
        className="relative rounded-full"
      >
        <BellIcon className={!isGranted ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''} />
        {!isGranted && (
          <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1 text-[10px]">
            1
          </Badge>
        )}
      </Button>

      {/* ป๊อปอัปเด้งถามอนุญาตแจ้งเตือน (ใช้ createPortal ไปที่ document.body เพื่อให้แสดงกึ่งกลางหน้าจอเต็มจอ ไม่ติด backdrop-filter ของ Navbar) */}
      {typeof document !== 'undefined' &&
        showPromptModal &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-[320px] rounded-[24px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-white/40 dark:border-zinc-800 shadow-2xl overflow-hidden text-center">
              <div className="px-5 pt-6 pb-4 space-y-2.5">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center shadow-inner">
                  <Bell className="h-6 w-6 text-pink-500" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                  “ระบบจองห้องประชุม”<br />ต้องการส่งการแจ้งเตือนถึงคุณ
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  การแจ้งเตือนจะแสดงป๊อปอัปสถานะการอนุมัติหรือยกเลิกการจองห้องประชุมของคุณทันที
                </p>
              </div>

              {/* ปุ่ม ไม่อนุญาต | อนุญาต สไตล์ iOS */}
              <div className="grid grid-cols-2 border-t border-slate-200/80 dark:border-zinc-800 divide-x divide-slate-200/80 dark:divide-zinc-800">
                <button
                  type="button"
                  onClick={handleDenyNotifications}
                  className="py-3.5 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                >
                  ไม่อนุญาต
                </button>
                <button
                  type="button"
                  onClick={handleAllowNotifications}
                  className="py-3.5 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50/60 dark:hover:bg-pink-950/30 transition cursor-pointer"
                >
                  อนุญาต
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Popup stack — fixed top-center (Portaled to document.body) */}
      {typeof document !== 'undefined' &&
        popups.length > 0 &&
        createPortal(
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 pointer-events-none">
            {popups.map((notif) => (
              <BookingPopup key={notif.key} notif={notif} onDismiss={dismissPopup} />
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
