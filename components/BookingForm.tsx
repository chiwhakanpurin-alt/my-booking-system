'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, User, Clock, FileText, ArrowLeft, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useToast, ToastContainer } from '@/components/Toast';

const MEETING_ROOMS = [
  'ห้องประชุมปลายน้ำ',
  'ห้องประชุมพรหมโลก',
  'ห้องประชุมอ้ายเขียว',
];

export default function BookingForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    activity_name: '',
    booked_by: '',
    contact_info: '',
    room_name: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    details: '',
  });

  const [loading, setLoading] = useState(false);
  const { toasts, toast, dismissToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Front-end validations
    if (!formData.activity_name.trim()) {
      toast.error('กรุณากรอกชื่อกิจกรรม');
      return;
    }
    if (!formData.booked_by.trim()) {
      toast.error('กรุณากรอกชื่อผู้จอง');
      return;
    }
    if (!formData.contact_info.trim()) {
      toast.error('กรุณากรอกเบอร์ติดต่อ');
      return;
    }
    if (!formData.room_name) {
      toast.error('กรุณาเลือกห้องประชุม');
      return;
    }
    if (!formData.booking_date) {
      toast.error('กรุณาเลือกวันที่ต้องการจอง');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error('กรุณาระบุช่วงเวลาให้ครบถ้วน');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      toast.error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      return;
    }

    const subscribeToPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;
        const registration = await navigator.serviceWorker.ready;
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) return null;

        const padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
        const base64 = (publicVapidKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) return existingSub;

        return await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });
      } catch (err) {
        console.error('Push sub error:', err);
        return null;
      }
    };

    try {
      setLoading(true);
      const pushSubscription = await subscribeToPush();

      const payload = {
        ...formData,
        pushSubscription
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store booking ID in sessionStorage to show notifications only to this user
        try {
          const pending = JSON.parse(sessionStorage.getItem('pending_bookings') || '[]');
          if (data.data?.id) {
            pending.push(data.data.id);
            sessionStorage.setItem('pending_bookings', JSON.stringify(pending));
          }
        } catch (e) {
          console.error('Failed to save to sessionStorage', e);
        }

        toast.success('ส่งคำขอจองสำเร็จ! 🎉', 'ระบบรออนุมัติจากผู้ดูแล กำลังพากลับหน้าหลัก...', 3000);
        // Reset form
        setFormData({
          activity_name: '',
          booked_by: '',
          contact_info: '',
          room_name: '',
          booking_date: '',
          start_time: '',
          end_time: '',
          details: '',
        });
        // Redirect home after 2.5 seconds
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 2500);
      } else {
        toast.error('บันทึกไม่สำเร็จ', data.message || 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (error) {
      console.error('Submit booking error:', error);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Floating Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 mb-6 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับหน้าหลัก
      </Link>

      <div className="rounded-3xl glass-panel shadow-xl border border-slate-200/50 dark:border-zinc-800/40 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 text-white shadow-md shadow-pink-500/15">
            <CalendarDays className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              จองห้องประชุม
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              กรุณากรอกข้อมูลการจองให้ครบถ้วน คำขอนี้จะได้รับการตรวจสอบและอนุมัติโดย Admin
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Activity Name */}
          <div className="space-y-1.5">
            <label htmlFor="activity_name" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
              ชื่อกิจกรรม / หัวข้อประชุม <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="activity_name"
                name="activity_name"
                type="text"
                required
                value={formData.activity_name}
                onChange={handleChange}
                placeholder="เช่น ประชุมสรุปโปรเจกต์ประจำสัปดาห์"
                className="w-full px-4 py-3 pl-11 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm"
              />
              <FileText className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
            </div>
          </div>

          {/* Booked By */}
          <div className="space-y-1.5">
            <label htmlFor="booked_by" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
              ชื่อผู้จอง <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="booked_by"
                name="booked_by"
                type="text"
                required
                value={formData.booked_by}
                onChange={handleChange}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full px-4 py-3 pl-11 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm"
              />
              <User className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-1.5">
            <label htmlFor="contact_info" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
              เบอร์ติดต่อ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="contact_info"
                name="contact_info"
                type="text"
                required
                value={formData.contact_info}
                onChange={handleChange}
                placeholder="เช่น 089-xxxxxxx"
                className="w-full px-4 py-3 pl-11 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm"
              />
              <Mail className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
            </div>
          </div>

          {/* Meeting Room */}
          <div className="space-y-1.5">
            <label htmlFor="room_name" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
              ห้องประชุมที่ต้องการจอง <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="room_name"
                name="room_name"
                required
                value={formData.room_name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="" disabled className="dark:bg-zinc-900">-- กรุณาเลือกห้องประชุม --</option>
                {MEETING_ROOMS.map((room, idx) => (
                  <option key={idx} value={room} className="dark:bg-zinc-900 text-slate-900 dark:text-white">
                    {room}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500 dark:border-t-zinc-400 w-0 h-0"></div>
            </div>
          </div>

          {/* Booking Date */}
          <div className="space-y-1.5">
            <label htmlFor="booking_date" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
              เลือกวันที่จอง <span className="text-rose-500">*</span>
            </label>
            <input
              id="booking_date"
              name="booking_date"
              type="date"
              required
              min={new Date().toLocaleDateString('en-CA')} // YYYY-MM-DD local timezone format
              value={formData.booking_date}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm cursor-pointer"
            />
          </div>

          {/* Time Picker Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-1.5">
              <label htmlFor="start_time" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
                เวลาเริ่มต้น <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="start_time"
                  name="start_time"
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pl-11 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm cursor-pointer"
                />
                <Clock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-1.5">
              <label htmlFor="end_time" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
                เวลาสิ้นสุด <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="end_time"
                  name="end_time"
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pl-11 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm cursor-pointer"
                />
                <Clock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
              </div>
            </div>
          </div>

          {/* Details / Optional description */}
          <div className="space-y-1.5">
            <label htmlFor="details" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 font-medium">
              รายละเอียดการประชุมเพิ่มเติม (ถ้ามี)
            </label>
            <textarea
              id="details"
              name="details"
              rows={3}
              value={formData.details}
              onChange={handleChange}
              placeholder="ระบุสิ่งที่ต้องการเตรียมเพิ่มเติม เช่น โทรทัศน์โปรเจคเตอร์, อาหารว่าง หรือรูปแบบการจัดห้อง"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-sm resize-y"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold hover:from-pink-600 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังส่งข้อมูลการจอง...
              </>
            ) : (
              'ส่งคำขอจองห้องประชุม'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
