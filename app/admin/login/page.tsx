'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

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
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!password.trim()) {
      setError('กรุณากรอกรหัสผ่าน');
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
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/admin';
      } else {
        setError(data.message || 'รหัสผ่านไม่ถูกต้อง');
        triggerShake();
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200">
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
            shake ? 'border-rose-400!' : ''
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
              กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานระบบควบคุมการจอง
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin_password" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                รหัสผ่าน Admin
              </label>
              <div className="relative">
                <input
                  id="admin_password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="กรอกรหัสผ่าน..."
                  required
                  autoFocus
                  disabled={loading}
                  className="w-full px-4 py-3.5 pl-11 pr-11 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm font-medium"
                />
                <Lock className="absolute left-4 top-4 h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition cursor-pointer"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              {error && (
                <p className="text-xs font-bold text-rose-500 pt-1 animate-pulse">
                  {error}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-60 disabled:pointer-events-none disabled:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  กำลังตรวจสอบรหัสผ่าน...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>

          {/* Security Note */}
          <p className="text-[10px] text-center text-slate-400 dark:text-zinc-500 font-medium">
            เฉพาะผู้ดูแลระบบและเจ้าหน้าที่ที่ได้รับมอบหมายเท่านั้น
          </p>
        </div>
      </main>
    </div>
  );
}
