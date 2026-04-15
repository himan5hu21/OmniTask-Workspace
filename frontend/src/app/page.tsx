// src/app/page.tsx
"use client";

import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { getToken } from '@/lib/api';

export default function HomePage() {
  const isAuthenticated = !!getToken();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-50 overflow-hidden text-center px-4">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-200/50 rounded-full blur-[120px]" />
      </div>

      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl mb-8">
        <span className="text-white font-bold text-3xl tracking-tighter">O</span>
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 max-w-4xl">
        The ultimate workspace for <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">your team</span>
      </h1>
      
      <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl">
        OmniTask brings all your projects, tasks, and team communication into one secure, beautiful platform.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        {isAuthenticated ? (
          <Link href="/dashboard" className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] w-full sm:w-auto">
            <LayoutDashboard size={20} />
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] w-full sm:w-auto">
              Get Started
              <ArrowRight size={20} />
            </Link>
            <Link href="/register" className="flex items-center justify-center px-8 py-4 bg-white text-slate-900 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98] w-full sm:w-auto">
              Create Account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}