'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, ArrowUpRight, Copy, CheckCircle2 } from 'lucide-react';

export default function InAppBrowserWarning() {
  const [isInApp, setIsInApp] = useState(false);
  const [appType, setAppType] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Detect in-app browsers
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Check if URL already has the override parameter (some apps respect this, though usually it redirects before loading)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openExternalBrowser') === '1') {
      return; // Force allowed
    }
    
    if (ua.indexOf('Line') > -1) {
      setIsInApp(true);
      setAppType('LINE');
    } else if (ua.indexOf('FBAV') > -1 || ua.indexOf('FBAN') > -1) {
      setIsInApp(true);
      setAppType('Facebook');
    } else if (ua.indexOf('Instagram') > -1) {
      setIsInApp(true);
      setAppType('Instagram');
    }
  }, []);

  const copyLink = async () => {
    try {
      // Append ?openExternalBrowser=1 for LINE
      const url = new URL(window.location.href);
      url.searchParams.set('openExternalBrowser', '1');
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (!isInApp) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-rose-200 dark:border-rose-900/50 flex flex-col items-center gap-4 relative z-10">
        <div className="h-16 w-16 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-1">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
          คุณกำลังเปิดเว็บผ่านแอป<br/>{appType}
        </h2>
        <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
          ระบบจะไม่สามารถส่ง <strong className="text-rose-500">"การแจ้งเตือนจองห้อง"</strong> ได้เมื่อใช้งานผ่านแอปนี้
        </p>
        
        <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 w-full mt-2 border border-slate-200 dark:border-zinc-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-3 flex items-center justify-center gap-2">
            <ExternalLink className="h-4 w-4 text-indigo-500" /> แนะนำวิธีแก้ไข
          </p>
          <ul className="text-xs text-slate-600 dark:text-zinc-400 text-left space-y-2 list-disc list-inside">
            <li>กดที่ปุ่ม <strong>เมนู (3 จุด)</strong> มุมขวาบนหรือล่าง</li>
            <li>เลือก <strong>เปิดในเบราว์เซอร์เริ่มต้น</strong> หรือ <strong>Open in Safari/Chrome</strong></li>
          </ul>
        </div>

        <div className="w-full mt-2 space-y-3">
          <button 
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-semibold transition text-sm border border-indigo-200 dark:border-indigo-800/50"
          >
            {copied ? (
              <><CheckCircle2 className="h-4 w-4" /> คัดลอกลิงก์แล้ว ไปเปิดใน Chrome เลย!</>
            ) : (
              <><Copy className="h-4 w-4" /> คัดลอกลิงก์เพื่อไปเปิดเอง</>
            )}
          </button>
          
          <button 
            onClick={() => setIsInApp(false)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 underline transition"
          >
            หรือใช้งานต่อโดยไม่รับการแจ้งเตือน
          </button>
        </div>
      </div>
      
      {/* Decorative arrow pointing roughly to where the menu is on most apps */}
      <div className="absolute top-12 right-6 sm:right-12 text-white opacity-80 animate-bounce pointer-events-none flex flex-col items-end">
        <ArrowUpRight className="h-10 w-10 sm:h-12 sm:w-12" />
        <p className="font-bold mt-2 text-sm sm:text-base mr-2">กดเมนูตรงนี้!</p>
      </div>
    </div>
  );
}
