import React, { useMemo } from 'react';
import { Trophy, BarChart2, DoorOpen } from 'lucide-react';

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

export default function RoomUsageStats({ bookings }: RoomUsageStatsProps) {
  const { rooms, totalThisMonth, mostUsed, monthName, year } = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Filter bookings for current month, non-cancelled
    const thisMonthBookings = bookings.filter(b => {
      // ไม่นับยกเลิก
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
      .sort((a, b) => b.count - a.count); // sort by count descending

    const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const monthName = thMonths[currentMonth];
    const year = currentYear + 543;

    return {
      rooms: sortedRooms,
      totalThisMonth: thisMonthBookings.length,
      mostUsed: sortedRooms.length > 0 ? sortedRooms[0] : null,
      monthName,
      year
    };
  }, [bookings]);

  if (rooms.length === 0) {
    return (
      <div className="w-full rounded-3xl glass-panel p-6 sm:p-8 border border-slate-200/50 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 shadow-sm flex flex-col items-center justify-center gap-3">
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
    <div className="w-full rounded-3xl glass-panel border border-slate-200/50 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
              <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">
                {mostUsed.name}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 sm:p-8">
        <div className="space-y-5">
          {rooms.map((room, index) => {
            const percentage = Math.round((room.count / totalThisMonth) * 100);
            const isFirst = index === 0;
            
            return (
              <div key={room.name} className="group">
                <div className="flex justify-between items-end mb-1.5">
                  <div className="flex items-center gap-2">
                    <DoorOpen className={`w-4 h-4 ${isFirst ? 'text-indigo-500' : 'text-slate-400 dark:text-zinc-500'}`} />
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {room.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                    {room.count} ครั้ง <span className="text-[10px] text-slate-400 font-medium ml-1">({percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      isFirst 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500' 
                        : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 group-hover:from-indigo-400 group-hover:to-indigo-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
