'use client';

import React, { useMemo } from 'react';
import { Trophy, BarChart2 } from 'lucide-react';
import {
  Gauge,
  GaugeTrack,
  GaugeBands,
  GaugeIndicator,
  GaugeValue,
  GaugeLabel,
} from '@/components/ui/gauge';

interface Booking {
  id: string;
  activity_name: string;
  booked_by: string;
  room_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface RoomUsageStatsProps {
  bookings: Booking[];
}

// Tone cycling per room rank
const ROOM_TONES = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;

export default function RoomUsageStats({ bookings }: RoomUsageStatsProps) {
  const { rooms, totalThisMonth, mostUsed, monthName, year } = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const thisMonthBookings = bookings.filter(b => {
      if (b.status === 'ยกเลิก' || b.status === 'cancelled') return false;
      const d = new Date(b.booking_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const roomCounts: Record<string, number> = {};
    thisMonthBookings.forEach(b => {
      roomCounts[b.room_name] = (roomCounts[b.room_name] || 0) + 1;
    });

    const sortedRooms = Object.entries(roomCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const monthName = thMonths[currentMonth];
    const year = currentYear + 543;

    return {
      rooms: sortedRooms,
      totalThisMonth: thisMonthBookings.length,
      mostUsed: sortedRooms.length > 0 ? sortedRooms[0] : null,
      monthName,
      year,
    };
  }, [bookings]);

  if (rooms.length === 0) {
    return (
      <div className="w-full rounded-3xl glass-panel p-6 sm:p-8 border border-slate-200/50 dark:border-zinc-800/40 shadow-sm flex flex-col items-center justify-center gap-3">
        <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500">
          <BarChart2 className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">ยังไม่มีข้อมูลการใช้งานในเดือนนี้</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ประจำเดือน {monthName} {year}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl glass-panel border border-slate-200/50 dark:border-zinc-800/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 sm:p-8 border-b border-slate-200/50 dark:border-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-500" />
            สถิติการใช้งานประจำเดือน
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium mt-1">
            เดือน {monthName} {year} • จำนวนการจองทั้งหมด {totalThisMonth} ครั้ง
          </p>
        </div>

        {mostUsed && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 px-4 py-2.5 rounded-2xl border border-amber-100/50 dark:border-amber-900/50">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">ห้องยอดฮิตเดือนนี้</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">{mostUsed.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Gauge Grid */}
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-items-center">
          {rooms.map((room, index) => {
            const percentage = Math.round((room.count / totalThisMonth) * 100);
            const tone = ROOM_TONES[index % ROOM_TONES.length];

            // Threshold bands: green → warning at 60% → destructive at 85%
            const thresholds = [
              { value: 0,  tone: tone as 'chart-1' },
              { value: 60, tone: 'warning' as const, label: 'สูง' },
              { value: 85, tone: 'destructive' as const, label: 'สูงมาก' },
            ];

            return (
              <div key={room.name} className="flex flex-col items-center gap-2">
                <Gauge
                  value={percentage}
                  min={0}
                  max={100}
                  size="default"
                  tone={tone}
                  thresholds={thresholds}
                >
                  <GaugeTrack />
                  <GaugeBands />
                  <GaugeIndicator />
                  <GaugeValue format={v => `${Math.round(v)}%`} />
                  <GaugeLabel>{room.name}</GaugeLabel>
                </Gauge>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {room.count} ครั้ง
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
