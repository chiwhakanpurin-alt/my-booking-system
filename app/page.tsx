'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import DashboardStats from '@/components/DashboardStats';
import Calendar from '@/components/Calendar';
import BookingStatusWatcher from '@/components/BookingStatusWatcher';
import { CalendarPlus, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

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

export default function Home() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      if (!res.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลการจองได้');
      }
      const json = await res.json();
      if (json.success) {
        setBookings(json.data || []);
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200">
      <Navbar />
      {/* Real-time booking status watcher for visitors/bookers */}
      <BookingStatusWatcher />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 sm:p-10 shadow-lg shadow-indigo-500/10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-indigo-200 uppercase tracking-wider">
                PR Rooms Booking System
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                จองห้องประชุมออนไลน์ ได้ง่าย ๆ ในไม่กี่คลิก
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100 font-medium max-w-lg leading-relaxed">
                ระบบจัดการจองห้องประชุมอัจฉริยะ ค้นหาช่วงเวลาว่าง ตรวจสอบสถานะการจองได้ทันที รองรับทั้งคอมพิวเตอร์และมือถืออย่างสมบูรณ์แบบ
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/book"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-700 font-bold hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-slate-900/10 transition-all text-sm cursor-pointer"
              >
                <CalendarPlus className="h-4.5 w-4.5" />
                จองห้องประชุม
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm cursor-pointer"
              >
                ผู้ดูแลระบบ (Admin)
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Loading / Error state / Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-500">
              กำลังโหลดข้อมูลตารางจองห้องประชุม...
            </p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/20 max-w-xl mx-auto shadow-sm">
            <ShieldAlert className="h-5.5 w-5.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">ไม่สามารถเชื่อมต่อฐานข้อมูลได้</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Dashboard metrics at the top */}
            <section aria-label="Dashboard Statistics">
              <DashboardStats bookings={bookings} totalRooms={3} />
            </section>

            {/* Interactive monthly calendar */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    ปฏิทินแสดงตารางการใช้ห้องประชุม
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium">
                    คลิกที่วันใดก็ได้เพื่อดูรายละเอียดและรายการจองห้องประชุมในวันนั้น
                  </p>
                </div>
                {/* Visual Legend */}
                <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>อนุมัติแล้ว</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    <span>รออนุมัติ</span>
                  </div>
                </div>
              </div>
              
              <Calendar bookings={bookings} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
