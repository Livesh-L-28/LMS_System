'use client';

import React from 'react';
import { Box, ShieldCheck, GraduationCap, LogOut } from 'lucide-react';

interface NavbarProps {
  activeTab: 'student' | 'staff';
  setActiveTab: (tab: 'student' | 'staff') => void;
  user: any;
  onLogout: () => void;
  branding?: {
    pageTitle?: string;
    pageSubtitle?: string;
    pageBadge?: string;
  };
}

export default function Navbar({ activeTab, setActiveTab, user, onLogout, branding }: NavbarProps) {
  const [eventBranding, setEventBranding] = React.useState<{
    pageTitle?: string;
    pageSubtitle?: string;
    pageBadge?: string;
  }>({});

  const liveBranding = {
    pageTitle: eventBranding.pageTitle ?? branding?.pageTitle ?? 'AR/VR ACADEMY',
    pageSubtitle: eventBranding.pageSubtitle ?? branding?.pageSubtitle ?? 'Spatial Computing & Immersive Training Hub',
    pageBadge: eventBranding.pageBadge ?? branding?.pageBadge ?? 'ENTERPRISE',
  };

  React.useEffect(() => {
    const handleBrandingUpdate = (e: any) => {
      if (e.detail) {
        setEventBranding((prev) => ({
          ...prev,
          pageTitle: e.detail.pageTitle ?? prev.pageTitle,
          pageSubtitle: e.detail.pageSubtitle ?? prev.pageSubtitle,
          pageBadge: e.detail.pageBadge ?? prev.pageBadge,
        }));
      }
    };
    window.addEventListener('branding-updated', handleBrandingUpdate);
    return () => window.removeEventListener('branding-updated', handleBrandingUpdate);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-purple-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 p-0.5 shadow-md shadow-purple-500/20">
              <div className="w-full h-full bg-purple-600 rounded-[10px] flex items-center justify-center">
                <Box className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-sans">
                  {liveBranding.pageTitle}
                </span>
                {liveBranding.pageBadge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-md">
                    {liveBranding.pageBadge}
                  </span>
                )}
              </div>
              {liveBranding.pageSubtitle && (
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">{liveBranding.pageSubtitle}</p>
              )}
            </div>
          </div>

          {/* Segmented Control Navigation Tabs */}
          <nav role="tablist" aria-label="Portal Selection" className="flex items-center bg-purple-50/80 p-1 rounded-xl border border-purple-200/80">
            <button
              id="tab-student"
              role="tab"
              aria-selected={activeTab === 'student'}
              aria-controls="portal-content"
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'student'
                  ? 'pro-button-primary shadow-sm'
                  : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Portal</span>
            </button>

            <button
              id="tab-staff"
              role="tab"
              aria-selected={activeTab === 'staff'}
              aria-controls="portal-content"
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'staff'
                  ? 'pro-button-primary shadow-sm'
                  : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Staff / Admin Portal</span>
            </button>
          </nav>

          {/* User Session & Quick Status */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-purple-50/80 px-3.5 py-1.5 rounded-xl border border-purple-200">
                <div className="w-7 h-7 rounded-lg bg-purple-200/60 border border-purple-300 flex items-center justify-center text-xs font-bold text-purple-800">
                  {user.name ? user.name[0] : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                  <p className="text-[10px] font-bold text-purple-700 tracking-wider uppercase">{user.role}</p>
                </div>
                <div className="h-4 w-px bg-purple-200 mx-1 hidden md:block" />
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1 text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-purple-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-purple-900 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700">System Ready</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
