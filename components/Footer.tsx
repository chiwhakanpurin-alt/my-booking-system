import React from 'react';
import { Heart, Mail, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full mt-auto py-6 px-4 border-t border-slate-200/50 dark:border-zinc-800/50 bg-slate-50/30 dark:bg-zinc-950/30">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2">
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium flex items-center justify-center flex-wrap gap-1">
          จัดทำโดย <span className="font-bold text-slate-700 dark:text-zinc-300">Purin Chiwhakan </span> ชั้น ม.6/2
        </p>
        <div className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-500 flex items-center justify-center flex-wrap gap-2 mt-1">
          <span>พบปัญหาการใช้งาน</span>
          <a href="mailto:chiwhakanpurin@gmail.com" className="flex items-center gap-1 hover:text-indigo-500 transition-colors">
            <Mail className="w-3 h-3" />
            chiwhakanpurin@gmail.com
          </a>
          <span className="text-slate-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            Line ID: 8905872243
          </div>
        </div>
      </div>
    </footer>
  );
}
