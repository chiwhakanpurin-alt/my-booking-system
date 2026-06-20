import React from 'react';
import { Home, Calendar, Clock, CheckCircle } from 'lucide-react';

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

interface DashboardStatsProps {
  bookings: Booking[];
  totalRooms?: number;
}

export default function DashboardStats({ bookings, totalRooms = 5 }: DashboardStatsProps) {
  // Format today's date in local YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();

  // 1. Today's bookings count (where status is approved or pending)
  const todayBookingsCount = bookings.filter(
    (b) => b.booking_date === todayStr && b.status !== 'ยกเลิก'
  ).length;

  // 2. Pending approvals count
  const pendingCount = bookings.filter((b) => b.status === 'รออนุมัติ' || b.status === 'pending').length;

  // 3. Approved bookings count
  const approvedCount = bookings.filter((b) => b.status === 'อนุมัติแล้ว' || b.status === 'approved').length;

  const stats = [
    {
      label: 'จำนวนห้องประชุมทั้งหมด',
      value: totalRooms,
      icon: Home,
      colorClass: 'from-blue-500 to-indigo-600',
      bgGlow: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'จำนวนการจองวันนี้',
      value: todayBookingsCount,
      icon: Calendar,
      colorClass: 'from-purple-500 to-pink-600',
      bgGlow: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'จำนวนรายการรออนุมัติ',
      value: pendingCount,
      icon: Clock,
      colorClass: 'from-violet-500 to-indigo-600',
      bgGlow: 'bg-violet-500/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'จำนวนรายการอนุมัติแล้ว',
      value: approvedCount,
      icon: CheckCircle,
      colorClass: 'from-emerald-400 to-teal-600',
      bgGlow: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className="relative group hover:scale-[1.01] transition-all duration-300">
            {/* Smooth Aura Glow behind the card (hardware accelerated, avoids blocky clipping) */}
            <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${stat.colorClass} opacity-15 blur-xl group-hover:opacity-30 group-hover:blur-2xl transition-all duration-500 will-change-[filter,opacity]`}></div>

            {/* Main Card */}
            <div className="relative h-full overflow-hidden rounded-2xl glass-panel p-5 shadow-sm border border-slate-200/50 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </h3>
                </div>
                <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgGlow} ${stat.iconColor} shadow-inner`}>
                  {/* Subtle inner glow for the icon */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${stat.colorClass} opacity-10`}></div>
                  <IconComponent className="h-6 w-6 stroke-[1.8] relative z-10" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
