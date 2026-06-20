import React from 'react';
import Navbar from '@/components/Navbar';
import BookingForm from '@/components/BookingForm';

export default function BookPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200">
      <Navbar />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <BookingForm />
      </main>
    </div>
  );
}
