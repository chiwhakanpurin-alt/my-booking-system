'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Delete, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Check if already logged in, redirect to /admin directly
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/session');
        if (res.ok) {
          window.location.href = '/admin';
        }
      } catch {
        // Not logged in, stay here
      }
    };
    checkSession();
    
    // Focus input for keyboard entry
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyPress = (num: string) => {
    if (pin.length < 16) {
      setError(null);
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 16) {
        handleLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(null);
    setPin('');
  };

  const handleLogin = async (inputPin = pin) => {
    if (inputPin.length !== 16) {
      setError('กรุณากรอกรหัสผ่านให้ครบ 16 หลัก');
      triggerShake();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: inputPin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/admin';
      } else {
        setError(data.message || 'รหัสผ่านไม่ถูกต้อง');
        triggerShake();
        setPin(''); // Reset on failure
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Enable physical keyboard entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleLogin();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200">
      {/* Hidden input for keyboard focus */}
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={pin}
        className="sr-only"
        aria-hidden="true"
      />
      
      {/* Top Header Controls */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าหลัก
        </Link>
      </div>

      {/* Main Login Card Container */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md rounded-3xl glass-panel shadow-2xl border border-slate-200/50 dark:border-zinc-800/40 p-6 sm:p-8 space-y-6 ${
            shake ? 'animate-bounce border-rose-400!' : ''
          }`}
          style={{
            animation: shake ? 'shake 0.4s ease-in-out' : 'none'
          }}
        >
          {/* Style Inject for shaking animation */}
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
              20%, 40%, 60%, 80% { transform: translateX(6px); }
            }
          `}</style>

          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shadow-inner">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              ระบบผู้ดูแลระบบ (Admin)
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              กรุณาป้อนรหัสความปลอดภัย 16 หลัก เพื่อเข้าใช้งานควบคุมการจอง
            </p>
          </div>

          {/* Masked Password Dots */}
          <div className="space-y-3">
            <div className="flex justify-center gap-2">
              {Array.from({ length: 16 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border transition-all duration-150 ${
                    idx < pin.length
                      ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 scale-110 shadow-sm shadow-indigo-600/20'
                      : 'border-slate-300 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-xs font-bold text-center text-rose-500 animate-pulse">
                {error}
              </p>
            )}
          </div>

          {/* Numeric PIN Pad Grid */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-white/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-lg font-bold border border-slate-200/50 dark:border-zinc-850 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            
            {/* Clear Button */}
            <button
              onClick={handleClear}
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-slate-100/80 dark:bg-zinc-950/40 hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 text-xs font-bold border border-transparent hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              ล้างค่า
            </button>

            {/* 0 Key */}
            <button
              onClick={() => handleKeyPress('0')}
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-white/50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-lg font-bold border border-slate-200/50 dark:border-zinc-850 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              0
            </button>

            {/* Delete / Backspace Key */}
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center justify-center h-12 w-full rounded-2xl bg-slate-100/80 dark:bg-zinc-950/40 hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-transparent hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              aria-label="Delete last digit"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {/* Confirm Button */}
          <div className="pt-2">
            <button
              onClick={() => handleLogin()}
              disabled={loading || pin.length !== 16}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-60 disabled:pointer-events-none disabled:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  กำลังยืนยันตัวตน...
                </>
              ) : (
                <>
                  <Lock className="h-4.5 w-4.5" />
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </div>

          {/* Note */}
          <p className="text-[10px] text-center text-slate-400 dark:text-zinc-500 font-medium">
            หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่านใหม่
          </p>
        </div>
      </main>
    </div>
  );
}
