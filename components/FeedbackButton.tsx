'use client';

import React, { useState } from 'react';
import { MessageSquareWarning, X, Send, Loader2 } from 'lucide-react';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;

    try {
      setLoading(true);
      setStatus('idle');
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all duration-300"
        aria-label="รายงานปัญหา"
      >
        <MessageSquareWarning className="h-6 w-6" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="relative p-6 sm:p-8">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                  <MessageSquareWarning className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">รายงานปัญหา</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">พบปัญหาการใช้งาน แจ้งให้เราทราบได้เลย</p>
                </div>
              </div>

              {status === 'success' ? (
                <div className="py-8 text-center animate-fade-in">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
                    <Send className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">ขอบคุณสำหรับรายงาน!</h4>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">เราจะรีบตรวจสอบและแก้ไขโดยเร็วที่สุด</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      ชื่อ (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ชื่อของคุณ"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      อีเมล (ถ้ามี)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      รายละเอียดปัญหา <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="อธิบายปัญหาที่คุณพบ..."
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 outline-none transition resize-none"
                    />
                  </div>

                  {status === 'error' && (
                    <p className="text-xs font-bold text-rose-500 text-center animate-shake">
                      เกิดข้อผิดพลาดในการส่ง กรุณาลองใหม่อีกครั้ง
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold hover:opacity-90 active:scale-[0.98] transition cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ส่งรายงานปัญหา'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
