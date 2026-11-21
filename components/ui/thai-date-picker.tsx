'use client';

import React, { useRef } from 'react';
import { CalendarDays } from 'lucide-react';

interface ThaiDatePickerProps {
  id?: string;
  name?: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  required?: boolean;
  min?: string;
  className?: string;
}

export function ThaiDatePicker({
  id,
  name,
  value,
  onChange,
  required,
  min,
  className = '',
}: ThaiDatePickerProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // แปลง YYYY-MM-DD เป็น "วัน / เดือน / ปี"
  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day} / ${month} / ${year}`;
  };

  const handleClick = () => {
    if (hiddenInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          hiddenInputRef.current.showPicker();
        } catch {
          hiddenInputRef.current.focus();
        }
      } else {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative w-full">
      {/* Input จำลองที่แสดงผล วัน / เดือน / ปี เสมอทุกเครื่อง */}
      <div
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 text-slate-900 dark:text-white focus-within:ring-2 focus-within:ring-pink-500/40 focus-within:border-pink-500 transition-all text-sm cursor-pointer select-none ${className}`}
      >
        <span className={value ? 'font-medium' : 'text-slate-400 dark:text-zinc-500'}>
          {value ? formatDisplay(value) : 'วว / ดด / ปปปป'}
        </span>
        <CalendarDays className="h-4.5 w-4.5 text-slate-400 dark:text-zinc-500 shrink-0" />
      </div>

      {/* Real Input ที่ซ่อนอยู่หลังปุ่มเพื่อรองรับ Browser Native Date Picker */}
      <input
        ref={hiddenInputRef}
        id={id}
        name={name}
        type="date"
        required={required}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
      />
    </div>
  );
}
