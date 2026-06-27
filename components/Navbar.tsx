'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, LayoutDashboard, UserCheck, Moon, Sun, LogOut } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy-load the bell — it connects WebSocket only for logged-in admins
const NotificationBell = dynamic(() => import('@/components/NotificationBell'), { ssr: false });

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load and apply dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Check if current route is admin and user is authenticated
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/session');
        setIsAdmin(response.ok);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdminSession();
  }, [pathname]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    const response = await fetch('/api/admin/logout', { method: 'POST' });
    if (response.ok) {
      setIsAdmin(false);
      window.location.href = '/';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/50 dark:border-zinc-800/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center group transition">
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 overflow-hidden rounded-full shadow-sm shadow-slate-200 dark:shadow-zinc-900 group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
              <img 
                src="/school-logo.png" 
                alt="School Logo" 
                className="h-full w-full object-cover"
              />
            </div>
          </Link>

          {/* Navigation & Controls */}
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/'
                    ? 'bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                หน้าหลัก
              </Link>
              <Link
                href="/book"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/book'
                    ? 'bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                จองห้องประชุม
              </Link>
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname.startsWith('/admin')
                    ? 'bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                ผู้ดูแลระบบ
              </Link>
            </nav>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block"></div>

            {/* Dark Mode & Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-slate-500" />}
              </button>

              {/* Notification bell — visible only when admin is logged in */}
              {isAdmin && <NotificationBell />}

              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50/80 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200/50 dark:border-rose-900/25 transition-all shadow-sm cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">ออกจากระบบ</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
