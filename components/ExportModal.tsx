'use client';

import React, { useState, useMemo } from 'react';
import { X, FileSpreadsheet, Printer, Download, Filter, BarChart3, Building2, Clock, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface Booking {
  id: string;
  activity_name: string;
  booked_by: string;
  room_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  details?: string;
  created_at?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const MEETING_ROOMS = [
  'ห้องประชุมปลายน้ำ',
  'ห้องประชุมพรหมโลก',
  'ห้องประชุมอ้ายเขียว'
];

export default function ExportModal({ isOpen, onClose, bookings }: ExportModalProps) {
  const currentDate = new Date();
  const currentYearStr = currentDate.getFullYear().toString();
  const currentMonthStr = (currentDate.getMonth() + 1).toString().padStart(2, '0');

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr); // '01' - '12' or 'all'
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('อนุมัติแล้ว'); // 'อนุมัติแล้ว' or 'ทั้งหมด'
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  // Extract available years from bookings
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(currentYearStr);
    bookings.forEach((b) => {
      if (b.booking_date) {
        const y = b.booking_date.split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [bookings, currentYearStr]);

  // Helper to parse details
  const parseBooking = (booking: Booking) => {
    let cleanDetails = '';
    let contactInfo = '';
    let department = '';
    if (booking.details) {
      const noPushSub = booking.details.split('---PUSH_SUB---')[0];
      const contactMatch = noPushSub.match(/---CONTACT_INFO---\s*([\s\S]*?)(?:---[A-Z_]+---|$)/);
      if (contactMatch) contactInfo = contactMatch[1].trim();

      const deptMatch = noPushSub.match(/---DEPARTMENT---\s*([\s\S]*?)(?:---[A-Z_]+---|$)/);
      if (deptMatch) department = deptMatch[1].trim();

      cleanDetails = noPushSub.split(/---(?:CONTACT_INFO|DEPARTMENT)---/)[0].replace(/^อีเมลผู้จอง:\s*[^\s]+\s*/, '').trim();
    }
    return { cleanDetails, contactInfo, department };
  };

  const getDurationHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(0, diff / 60);
  };

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]) + 543;
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return `${day} ${THAI_MONTHS[month - 1]} ${year}`;
  };

  const formatTime = (timeStr: string) => {
    return timeStr ? timeStr.substring(0, 5) : '';
  };

  // Filter bookings based on selected criteria
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!b.booking_date) return false;
      const [year, month] = b.booking_date.split('-');

      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      if (selectedRoom !== 'all' && b.room_name !== selectedRoom) return false;

      if (selectedStatus === 'อนุมัติแล้ว') {
        return b.status === 'อนุมัติแล้ว' || b.status === 'approved';
      }
      return true;
    }).sort((a, b) => {
      const cmpDate = a.booking_date.localeCompare(b.booking_date);
      if (cmpDate !== 0) return cmpDate;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [bookings, selectedYear, selectedMonth, selectedRoom, selectedStatus]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCount = filteredBookings.length;
    let totalHours = 0;
    const roomCounts: Record<string, { count: number; hours: number }> = {};
    const deptCounts: Record<string, number> = {};

    MEETING_ROOMS.forEach((r) => {
      roomCounts[r] = { count: 0, hours: 0 };
    });

    filteredBookings.forEach((b) => {
      const hours = getDurationHours(b.start_time, b.end_time);
      totalHours += hours;

      if (!roomCounts[b.room_name]) {
        roomCounts[b.room_name] = { count: 0, hours: 0 };
      }
      roomCounts[b.room_name].count += 1;
      roomCounts[b.room_name].hours += hours;

      const { department } = parseBooking(b);
      const deptKey = department || 'ไม่ระบุกลุ่มสาระ';
      deptCounts[deptKey] = (deptCounts[deptKey] || 0) + 1;
    });

    return { totalCount, totalHours, roomCounts, deptCounts };
  }, [filteredBookings]);

  const reportPeriodText = useMemo(() => {
    const yearTh = selectedYear !== 'all' ? Number(selectedYear) + 543 : 'ทุกปี';
    if (selectedMonth === 'all') {
      return `ประจำปี พ.ศ. ${yearTh}`;
    }
    const monthTh = THAI_MONTHS[parseInt(selectedMonth, 10) - 1];
    return `ประจำเดือน ${monthTh} พ.ศ. ${yearTh}`;
  }, [selectedMonth, selectedYear]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredBookings.length === 0) {
      alert('ไม่พบข้อมูลการจองตามเงื่อนไขที่เลือก');
      return;
    }

    // Sheet 1: Detailed Bookings
    const rows = filteredBookings.map((b, idx) => {
      const { cleanDetails, contactInfo, department } = parseBooking(b);
      return {
        'ลำดับ': idx + 1,
        'วันที่': formatThaiDate(b.booking_date),
        'เวลาเริ่มต้น': formatTime(b.start_time) + ' น.',
        'เวลาสิ้นสุด': formatTime(b.end_time) + ' น.',
        'ระยะเวลา (ชม.)': getDurationHours(b.start_time, b.end_time).toFixed(1),
        'ห้องประชุม': b.room_name,
        'ชื่อกิจกรรม / การประชุม': b.activity_name,
        'ผู้จอง': b.booked_by,
        'กลุ่มสาระ / ฝ่ายงาน': department || '-',
        'เบอร์ติดต่อ': contactInfo || '-',
        'สถานะ': b.status,
        'รายละเอียดเพิ่มเติม': cleanDetails || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 6 },  // ลำดับ
      { wch: 20 }, // วันที่
      { wch: 14 }, // เริ่ม
      { wch: 14 }, // สิ้นสุด
      { wch: 14 }, // ชม.
      { wch: 22 }, // ห้องประชุม
      { wch: 35 }, // กิจกรรม
      { wch: 22 }, // ผู้จอง
      { wch: 26 }, // กลุ่มสาระ
      { wch: 16 }, // เบอร์ติดต่อ
      { wch: 14 }, // สถานะ
      { wch: 30 }  // รายละเอียดเพิ่มเติม
    ];

    // Sheet 2: Monthly Summary
    const summaryRows = [
      { 'หัวข้อสรุป': `รายงานสรุปสถิติการใช้ห้องประชุม (${reportPeriodText})`, 'ข้อมูล / ค่า': '' },
      { 'หัวข้อสรุป': 'จำนวนครั้งการใช้งานรวม', 'ข้อมูล / ค่า': `${stats.totalCount} ครั้ง` },
      { 'หัวข้อสรุป': 'จำนวนชั่วโมงการใช้งานรวม', 'ข้อมูล / ค่า': `${stats.totalHours.toFixed(1)} ชั่วโมง` },
      { 'หัวข้อสรุป': '', 'ข้อมูล / ค่า': '' },
      { 'หัวข้อสรุป': '--- สรุปแยกตามห้องประชุม ---', 'ข้อมูล / ค่า': '' },
      ...Object.entries(stats.roomCounts).map(([room, data]) => ({
        'หัวข้อสรุป': `${room}`,
        'ข้อมูล / ค่า': `${data.count} ครั้ง (${data.hours.toFixed(1)} ชม.)`
      })),
      { 'หัวข้อสรุป': '', 'ข้อมูล / ค่า': '' },
      { 'หัวข้อสรุป': '--- สรุปแยกตามกลุ่มสาระ / ฝ่ายงาน ---', 'ข้อมูล / ค่า': '' },
      ...Object.entries(stats.deptCounts).map(([dept, count]) => ({
        'หัวข้อสรุป': `${dept}`,
        'ข้อมูล / ค่า': `${count} ครั้ง`
      }))
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 35 }, { wch: 30 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายการจองห้องประชุม');
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุปสถิติ');

    const cleanPeriod = reportPeriodText.replace(/[\s\.\/]/g, '_');
    const filename = `รายงานการใช้ห้องประชุม_${cleanPeriod}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Export Dialog */}
      {!showPrintPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-3xl glass-modal shadow-2xl border border-slate-200/50 dark:border-zinc-800/40 p-6 sm:p-7 animate-fade-in text-slate-800 dark:text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    ส่งออกข้อมูลและรายงานสรุปสถิติ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    Export Data (Excel / PDF รายงานสรุปประจำเดือน)
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Form Controls */}
            <div className="py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Month Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    เลือกเดือน
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition cursor-pointer"
                  >
                    <option value="all">ทุกเดือน (ทั้งปี)</option>
                    {THAI_MONTHS.map((m, idx) => {
                      const val = (idx + 1).toString().padStart(2, '0');
                      return (
                        <option key={val} value={val} className="dark:bg-zinc-900">
                          {m}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Year Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    เลือกปี พ.ศ.
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition cursor-pointer"
                  >
                    <option value="all">ทุกปี</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y} className="dark:bg-zinc-900">
                        {Number(y) + 543} ({y})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Room Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    ห้องประชุม
                  </label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition cursor-pointer"
                  >
                    <option value="all">ทุกห้องประชุม</option>
                    {MEETING_ROOMS.map((r) => (
                      <option key={r} value={r} className="dark:bg-zinc-900">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    สถานะการจอง
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition cursor-pointer"
                  >
                    <option value="อนุมัติแล้ว">เฉพาะรายการที่อนุมัติแล้ว (แนะนำ)</option>
                    <option value="ทั้งหมด">รายการทั้งหมด (รวมรออนุมัติ/ยกเลิก)</option>
                  </select>
                </div>
              </div>

              {/* Data Summary Preview Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4" />
                    <span>ข้อมูลตามเงื่อนไข ({reportPeriodText})</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    พบทั้งหมด <strong>{stats.totalCount}</strong> รายการ | รวม <strong>{stats.totalHours.toFixed(1)}</strong> ชั่วโมง
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> พร้อมส่งออก
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredBookings.length === 0}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <FileSpreadsheet className="h-4 w-4" />
                ส่งออก Excel (.xlsx)
              </button>

              {/* PDF Preview / Print Button */}
              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                disabled={filteredBookings.length === 0}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer className="h-4 w-4" />
                พิมพ์ / ดูรายงาน PDF
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Print & PDF Report Preview Modal (A4 Paper Document) */
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-800/80 backdrop-blur-md overflow-y-auto print:bg-white print:overflow-visible">
          {/* Top Control Bar (Hidden when printing) */}
          <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white shadow-lg print:hidden">
            <div className="flex items-center gap-3">
              <Printer className="h-5 w-5 text-pink-400" />
              <div>
                <h4 className="text-sm font-bold">ตัวอย่างรายงานสรุปประจำเดือน (A4 Print Preview)</h4>
                <p className="text-[11px] text-slate-300">กดปุ่ม &quot;พิมพ์หรือบันทึกเป็น PDF&quot; เพื่อเปิดหน้าต่าง Print ของเบราว์เซอร์</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                พิมพ์ / บันทึกเป็น PDF
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <X className="h-4 w-4" />
                ปิด
              </button>
            </div>
          </div>

          {/* Printable A4 Document Sheet */}
          <div className="flex-1 p-4 sm:p-8 flex justify-center print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-report, #printable-report * {
                  visibility: visible !important;
                }
                #printable-report {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 12mm;
                }
              }
            `}} />
            <div id="printable-report" className="w-full max-w-[210mm] bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 print:shadow-none print:p-0 print:rounded-none min-h-[297mm]">
              {/* Document Header */}
              <div className="flex items-center gap-4 pb-5 border-b-2 border-slate-900 mb-6">
                <div className="h-16 w-16 shrink-0 flex items-center justify-center">
                  <img src="/school-logo.png" alt="School Logo" className="h-16 w-16 object-contain" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    โรงเรียนพรหมคีรีพิทยาคม
                  </h2>
                  <h3 className="text-base font-bold text-slate-700">
                    รายงานสรุปสถิติการใช้บริการห้องประชุมออนไลน์
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    {reportPeriodText} | ข้อมูล ณ วันที่ {formatThaiDate(new Date().toISOString().split('T')[0])}
                  </p>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-center">
                  <span className="text-xs text-slate-600 font-medium block">จำนวนการใช้งานทั้งหมด</span>
                  <span className="text-2xl font-black text-indigo-700">{stats.totalCount}</span>
                  <span className="text-[11px] text-slate-500 font-medium block">ครั้ง</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-center">
                  <span className="text-xs text-slate-600 font-medium block">ระยะเวลาการใช้งานรวม</span>
                  <span className="text-2xl font-black text-emerald-700">{stats.totalHours.toFixed(1)}</span>
                  <span className="text-[11px] text-slate-500 font-medium block">ชั่วโมง</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-center">
                  <span className="text-xs text-slate-600 font-medium block">สถานะรายการ</span>
                  <span className="text-sm font-black text-slate-800 mt-2 block">{selectedStatus}</span>
                  <span className="text-[10px] text-slate-500 font-medium block">({selectedRoom === 'all' ? 'ทุกห้อง' : selectedRoom})</span>
                </div>
              </div>

              {/* Room Usage Summary Breakdown */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  สรุปสถิติจำนวนการใช้งานแยกตามห้องประชุม
                </h4>
                <table className="w-full text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-left">ห้องประชุม</th>
                      <th className="border border-slate-300 p-2 text-center w-28">จำนวนครั้ง</th>
                      <th className="border border-slate-300 p-2 text-center w-36">รวมระยะเวลา (ชั่วโมง)</th>
                      <th className="border border-slate-300 p-2 text-center w-28">สัดส่วน (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.roomCounts).map(([room, data], idx) => {
                      const pct = stats.totalCount > 0 ? ((data.count / stats.totalCount) * 100).toFixed(1) : '0';
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-2 font-medium">{room}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-indigo-600">{data.count}</td>
                          <td className="border border-slate-300 p-2 text-center">{data.hours.toFixed(1)} ชม.</td>
                          <td className="border border-slate-300 p-2 text-center">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Department Usage Summary */}
              {Object.keys(stats.deptCounts).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                    สรุปสถิติจำนวนการใช้งานแยกตามกลุ่มสาระ / ฝ่ายงาน
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(stats.deptCounts).map(([dept, count], idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
                        <span className="font-medium text-slate-700 truncate pr-2">{dept}</span>
                        <span className="font-bold text-emerald-700 shrink-0">{count} ครั้ง</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Booking Logs Table */}
              <div className="mb-8">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-700" />
                  รายการบันทึกการใช้ห้องประชุม ({filteredBookings.length} รายการ)
                </h4>
                <table className="w-full text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold">
                      <th className="border border-slate-300 p-1.5 text-center w-8">#</th>
                      <th className="border border-slate-300 p-1.5 text-left w-24">วันที่</th>
                      <th className="border border-slate-300 p-1.5 text-center w-24">เวลา</th>
                      <th className="border border-slate-300 p-1.5 text-left w-28">ห้องประชุม</th>
                      <th className="border border-slate-300 p-1.5 text-left">กิจกรรม / การประชุม</th>
                      <th className="border border-slate-300 p-1.5 text-left w-24">ผู้จอง</th>
                      <th className="border border-slate-300 p-1.5 text-left w-28">กลุ่มสาระ/ฝ่ายงาน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b, idx) => {
                      const { department } = parseBooking(b);
                      return (
                        <tr key={b.id || idx} className="hover:bg-slate-50 leading-tight">
                          <td className="border border-slate-300 p-1.5 text-center text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-medium">{formatThaiDate(b.booking_date)}</td>
                          <td className="border border-slate-300 p-1.5 text-center">{formatTime(b.start_time)}-{formatTime(b.end_time)}</td>
                          <td className="border border-slate-300 p-1.5 font-medium">{b.room_name}</td>
                          <td className="border border-slate-300 p-1.5">{b.activity_name}</td>
                          <td className="border border-slate-300 p-1.5">{b.booked_by}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-600">{department || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 mt-12 text-center text-xs break-inside-avoid">
                <div className="space-y-12">
                  <p className="text-slate-700">ลงชื่อ.......................................................... ผู้จัดทำรายงาน</p>
                  <p className="text-slate-600">(..........................................................)</p>
                  <p className="text-slate-500">ตำแหน่ง..........................................................</p>
                </div>
                <div className="space-y-12">
                  <p className="text-slate-700">ลงชื่อ.......................................................... ผู้รับรองรายงาน</p>
                  <p className="text-slate-600">(..........................................................)</p>
                  <p className="text-slate-500">ผู้อำนวยการโรงเรียนพรหมคีรีพิทยาคม</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
