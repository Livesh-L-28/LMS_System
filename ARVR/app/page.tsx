'use client';

import React, { useState, useEffect } from 'react';
import StudentPortal from '@/components/StudentPortal';
import StaffPortal from '@/components/StaffPortal';
import { PageLoadingScreen } from '@/components/LoadingSkeletons';
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

    // Check hash for direct navigation to staff portal
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (
        hash.includes('staff') ||
        hash.includes('admin') ||
        hash.includes('settings') ||
        hash.includes('batches') ||
        hash.includes('tasks') ||
        hash.includes('curriculum') ||
        hash.includes('evaluations') ||
        hash.includes('students') ||
        hash.includes('certificates')
      ) {
        setActiveTab('staff');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);

    const handleBrandingUpdate = (e: any) => {
      if (e.detail) {
        setBranding((prev: any) => ({ ...prev, ...e.detail }));
        if (e.detail.browserTitle) {
          document.title = e.detail.browserTitle;
        }
      }
    };
    window.addEventListener('branding-updated', handleBrandingUpdate);
    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate);
      window.removeEventListener('hashchange', handleHash);
    };
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
        const hash = window.location.hash.toLowerCase();
        if (hash.includes('staff') || hash.includes('admin')) {
          setActiveTab('staff');
        } else {
          setActiveTab('student');
        }
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
      setActiveTab('student');
      window.location.hash = '';
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
      <PageLoadingScreen
        title={branding?.pageTitle || 'AR/VR ACADEMY'}
        subtitle={branding?.pageSubtitle || 'Spatial Computing & Immersive Training Hub'}
        stage="Verifying secure session & enterprise services..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3f8] text-slate-900 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Main Content Area */}
      <main id="portal-content" className="flex-1">
        {activeTab === 'student' && (
          <StudentPortal
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            onSwitchToStaff={() => {
              setActiveTab('staff');
              window.location.hash = 'staff';
            }}
          />
        )}

        {activeTab === 'staff' && (
          <StaffPortal 
            user={user} 
            onLoginSuccess={handleLoginSuccess}
            branding={branding}
            onUpdateBranding={setBranding}
            onSwitchToStudent={() => {
              setActiveTab('student');
              window.location.hash = '';
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-200/80 bg-white/80 backdrop-blur-md py-6 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              window.location.hash = 'staff';
            }}
            title="Admin & Staff Portal Login"
            className="flex items-center gap-2 text-left cursor-pointer group hover:opacity-80 transition-all select-none"
          >
            <Box className="w-4 h-4 text-purple-600 group-hover:text-purple-800 transition-colors" />
            <span className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
              {branding?.footerText || 'AR/VR Spatial Computing Academy © 2026'}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
