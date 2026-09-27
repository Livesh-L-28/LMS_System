'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import StudentPortal from '@/components/StudentPortal';
import StaffPortal from '@/components/StaffPortal';
import { Box } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [branding, setBranding] = useState<any>({
    pageTitle: 'AR/VR ACADEMY',
    pageSubtitle: 'Spatial Computing & Immersive Training Hub',
    pageBadge: 'ENTERPRISE',
    browserTitle: 'AR/VR Spatial Computing Academy | Immersive Training Platform',
    pageDescription: 'Enterprise spatial computing academy and immersive training management system with real-time attendance, daily practical tasks, and automated certification.',
    orgName: 'AR/VR COE',
    footerText: 'AR/VR Spatial Computing Academy © 2026',
    supportEmail: 'support@arvr.com',
  });

  useEffect(() => {
    checkSession();
    fetchBranding();

    const handleBrandingUpdate = (e: any) => {
      if (e.detail) {
        setBranding((prev: any) => ({ ...prev, ...e.detail }));
        if (e.detail.browserTitle) {
          document.title = e.detail.browserTitle;
        }
      }
    };
    window.addEventListener('branding-updated', handleBrandingUpdate);
    return () => window.removeEventListener('branding-updated', handleBrandingUpdate);
  }, []);

  useEffect(() => {
    if (branding?.browserTitle && typeof document !== 'undefined') {
      document.title = branding.browserTitle;
    }
  }, [branding?.browserTitle]);

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/admin/settings/page-details');
      const data = await res.json();
      if (res.ok && data.success) {
        setBranding(data);
        if (data.browserTitle && typeof document !== 'undefined') {
          document.title = data.browserTitle;
        }
      }
    } catch (e) {
      console.error('Failed to load branding details', e);
    }
  };

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        if (data.user.role === 'STUDENT') setActiveTab('student');
        else setActiveTab('staff');
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Session check failed', e);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'STUDENT') setActiveTab('student');
    else setActiveTab('staff');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#f4f3f8] text-purple-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-purple-800">
          <Box className="w-6 h-6 text-purple-600 animate-spin" />
          <span>Loading {branding?.pageTitle || 'AR/VR Training Platform'}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3f8] text-slate-900 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        branding={branding}
      />

      {/* Main Content Area */}
      <main id="portal-content" className="flex-1">
        {activeTab === 'student' && (
          <StudentPortal user={user} onLoginSuccess={handleLoginSuccess} />
        )}

        {activeTab === 'staff' && (
          <StaffPortal 
            user={user} 
            onLoginSuccess={handleLoginSuccess}
            branding={branding}
            onUpdateBranding={setBranding}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-200/80 bg-white/80 backdrop-blur-md py-8 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-slate-900">{branding?.footerText || 'AR/VR Spatial Computing Academy © 2026'}</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
