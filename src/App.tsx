import React, { useState, useEffect } from 'react';
import {
  Doctor,
  DoctorSchedule,
  HospitalBranch,
  BranchId,
  Parent,
  Appointment,
  GalleryItem,
  HospitalReview,
  SystemConfiguration,
  DoctorAccount,
  Hospital,
  HospitalAdminUser,
} from './types/index.js';
import { SimulationBar } from './components/SimulationBar.js';
import { ParentLoginModal } from './components/ParentLoginModal.js';
import { ReceptionLoginModal } from './components/ReceptionLoginModal.js';
import { DoctorLoginModal } from './components/DoctorLoginModal.js';
import { BookAppointmentModal } from './components/BookAppointmentModal.js';
import { RescheduleModal } from './components/RescheduleModal.js';
import { ParentDashboard } from './components/ParentDashboard.js';
import { ReceptionDashboard } from './components/ReceptionDashboard.js';
import { DoctorDashboard } from './components/DoctorDashboard.js';
import { AnalyticsModal } from './components/AnalyticsModal.js';
import { TrackAppointmentModal } from './components/TrackAppointmentModal.js';

// Doctormate SaaS Phase 1 Components
import { DoctormateHome } from './components/DoctormateHome.js';
import { PublicHospitalBooking } from './components/PublicHospitalBooking.js';
import { SecureTrackerView } from './components/SecureTrackerView.js';
import { HospitalRegistrationModal } from './components/HospitalRegistrationModal.js';
import { HospitalOnboardingWizard } from './components/HospitalOnboardingWizard.js';
import { HospitalAdminDashboard } from './components/HospitalAdminDashboard.js';
import { HospitalLoginModal } from './components/HospitalLoginModal.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

function parseLocation(): { tab: string; slug?: string; token?: string } {
  if (typeof window === 'undefined') return { tab: 'saas-home' };
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Direct hospital booking URL: /hospital/:slug
  const hospMatch = path.match(/^\/hospital\/([^/?#]+)/);
  if (hospMatch && hospMatch[1]) {
    return { tab: 'hospital-booking', slug: decodeURIComponent(hospMatch[1]) };
  }

  // 2. Direct live tracking URL: /track or /track?id=...
  if (path.startsWith('/track')) {
    const id = searchParams.get('id') || searchParams.get('token') || undefined;
    return { tab: 'track-appointment', token: id };
  }

  // 3. Direct admin URL
  if (path === '/admin' || path === '/hospital-admin') {
    return { tab: 'hospital-admin' };
  }

  // 4. Direct reception URL
  if (path === '/reception' || path === '/reception-desk') {
    return { tab: 'reception-desk' };
  }

  // 5. Direct doctor URL
  if (path === '/doctor' || path === '/doctor-desk') {
    return { tab: 'doctor-desk' };
  }

  // 6. Direct parent portal URL
  if (path === '/portal' || path === '/parent-portal') {
    return { tab: 'parent-portal' };
  }

  // 7. Saved activeTab if loaded at root or reloaded
  const saved = localStorage.getItem('doctormate_active_tab');
  const validTabs = [
    'doctor-desk',
    'reception-desk',
    'parent-portal',
    'hospital-admin',
    'hospital-booking',
    'track-appointment',
  ];
  if (saved && validTabs.includes(saved) && (path === '/' || path === '')) {
    return { tab: saved };
  }

  return { tab: 'saas-home' };
}

export default function App() {
  const initialRoute = parseLocation();
  const [activeTab, setActiveTab] = useState<string>(initialRoute.tab);

  const [parentUser, setParentUser] = useState<Parent | null>(null);
  const [parentToken, setParentToken] = useState<string | null>(() => {
    return localStorage.getItem('doctormate_parent_token');
  });

  const [receptionUser, setReceptionUser] = useState<{
    username: string;
    branchId: BranchId;
    name: string;
    hospitalId?: string;
    hospitalName?: string;
  } | null>(() => {
    const saved = localStorage.getItem('doctormate_reception_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [doctorUser, setDoctorUser] = useState<{
    doctor: Doctor;
    account: DoctorAccount;
    token: string;
  } | null>(() => {
    const saved = localStorage.getItem('doctormate_doctor_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Hospital Admin session
  const [hospitalAdmin, setHospitalAdmin] = useState<{
    admin: HospitalAdminUser;
    hospital: Hospital;
    token: string;
  } | null>(() => {
    const saved = localStorage.getItem('doctormate_admin_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Active hospital for public booking view
  const [activeHospitalSlug, setActiveHospitalSlug] = useState<string>(initialRoute.slug || 'apex-hospital');
  const [trackingToken, setTrackingToken] = useState<string | undefined>(initialRoute.token);
  const [onboardingHospital, setOnboardingHospital] = useState<Hospital | null>(null);

  // Modals
  const [isHospitalRegOpen, setIsHospitalRegOpen] = useState(false);
  const [isHospitalLoginOpen, setIsHospitalLoginOpen] = useState(false);
  const [isParentLoginOpen, setIsParentLoginOpen] = useState(false);
  const [isReceptionLoginOpen, setIsReceptionLoginOpen] = useState(false);
  const [isDoctorLoginOpen, setIsDoctorLoginOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [rescheduleTargetAppt, setRescheduleTargetAppt] = useState<Appointment | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Booking prep
  const [bookingDoctorId, setBookingDoctorId] = useState<string | undefined>(undefined);
  const [bookingBranchId, setBookingBranchId] = useState<BranchId | undefined>(undefined);

  // Hospital domain data
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [reviews, setReviews] = useState<HospitalReview[]>([]);
  const [config, setConfig] = useState<SystemConfiguration>(() => {
    const cachedDate = typeof window !== 'undefined' ? localStorage.getItem('doctormate_simulated_date') : null;
    const cachedTime = typeof window !== 'undefined' ? localStorage.getItem('doctormate_simulated_time') : null;
    return {
      simulatedTime: cachedTime || '10:30',
      simulatedDate: cachedDate || new Date().toLocaleDateString('en-CA'),
      isSimulating: false,
      slotDurationMinutes: 15,
      bufferFrequencySlots: 4,
      bufferDurationMinutes: 15,
      reportingTimeMinutesBeforeSlot: 15,
      rescheduleCutoffMinutes: 60,
      notificationThresholdMinutes: 30,
      activeScenario: null,
    };
  });

  // Listen for browser Back/Forward popstate events
  useEffect(() => {
    const handlePopState = () => {
      const route = parseLocation();
      setActiveTab(route.tab);
      if (route.slug) setActiveHospitalSlug(route.slug);
      if (route.token) setTrackingToken(route.token);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize activeTab in localStorage, URL bar, and browser document title
  useEffect(() => {
    localStorage.setItem('doctormate_active_tab', activeTab);
    const titles: Record<string, string> = {
      'saas-home': 'Doctormate — Multi-Hospital Smart OPD & Live Queue Platform',
      'hospital-booking': 'Book Hospital Appointment | Doctormate Smart OPD',
      'track-appointment': 'Live Queue Radar | Doctormate Patient Tracking',
      'hospital-admin': 'Hospital Administration Portal | Doctormate',
      'onboarding': 'Hospital Onboarding Wizard | Doctormate',
      'reception-desk': 'Reception Desk Operations Console | Doctormate OPD',
      'parent-portal': 'Patient Health Portal | Doctormate',
      'doctor-desk': 'Doctor Consultation Console | Doctormate',
    };
    document.title = titles[activeTab] || 'Doctormate — Multi-Hospital Smart OPD Platform';

    // Synchronize browser URL bar
    let targetPath = '/';
    if (activeTab === 'hospital-booking' && activeHospitalSlug) {
      targetPath = `/hospital/${encodeURIComponent(activeHospitalSlug)}`;
    } else if (activeTab === 'track-appointment') {
      targetPath = trackingToken ? `/track?id=${encodeURIComponent(trackingToken)}` : '/track';
    } else if (activeTab === 'hospital-admin') {
      targetPath = '/admin';
    } else if (activeTab === 'reception-desk') {
      targetPath = '/reception';
    } else if (activeTab === 'doctor-desk') {
      targetPath = '/doctor';
    } else if (activeTab === 'parent-portal') {
      targetPath = '/portal';
    }

    const currentFull = window.location.pathname + (window.location.search || '');
    if (currentFull !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeTab, activeHospitalSlug, trackingToken]);

  // Auto-open login modal when accessing admin tab without active session
  useEffect(() => {
    if (activeTab === 'hospital-admin' && !hospitalAdmin) {
      setIsHospitalLoginOpen(true);
    }
  }, [activeTab, hospitalAdmin]);

  // Initial data loading
  useEffect(() => {
    loadHospitalData();
    restoreDoctorSession();

    // Cross-dashboard hospital clock synchronization
    const syncHospitalClock = async () => {
      try {
        const res = await fetch('/api/simulation/config');
        if (res.ok) {
          const cfg = await res.json();
          if (cfg && cfg.simulatedTime) {
            if (cfg.simulatedDate) {
              localStorage.setItem('doctormate_simulated_date', cfg.simulatedDate);
            }
            if (cfg.simulatedTime) {
              localStorage.setItem('doctormate_simulated_time', cfg.simulatedTime);
            }
            setConfig((prev) => {
              if (
                prev.simulatedTime !== cfg.simulatedTime ||
                prev.simulatedDate !== cfg.simulatedDate
              ) {
                return { ...prev, ...cfg };
              }
              return prev;
            });
          }
        }
      } catch {
        // Silently ignore background poll errors
      }
    };

    // Execute immediately on mount to prevent initial stale clock display
    syncHospitalClock();
    const syncInterval = setInterval(syncHospitalClock, 4000);
    return () => clearInterval(syncInterval);
  }, []);

  const restoreDoctorSession = async () => {
    const savedToken = localStorage.getItem('sri_devi_doctor_token');
    if (!savedToken) return;
    try {
      const res = await fetch('/api/doctor/me', {
        headers: { 'x-doctor-token': savedToken },
      });
      const data = await res.json();
      if (data.success && data.doctor && data.account) {
        setDoctorUser({ doctor: data.doctor, account: data.account, token: savedToken });
      }
    } catch (err) {
      console.error('Session restore failed:', err);
    }
  };

  const loadHospitalData = async () => {
    try {
      const res = await fetch('/api/public/info');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.doctors)) setDoctors(data.doctors);
        if (Array.isArray(data.branches)) setBranches(data.branches);
        if (Array.isArray(data.schedules)) setSchedules(data.schedules);
        if (Array.isArray(data.gallery)) setGallery(data.gallery);
        if (Array.isArray(data.reviews)) setReviews(data.reviews);
        if (data.config && data.config.simulatedTime) {
          if (data.config.simulatedDate) {
            localStorage.setItem('doctormate_simulated_date', data.config.simulatedDate);
          }
          if (data.config.simulatedTime) {
            localStorage.setItem('doctormate_simulated_time', data.config.simulatedTime);
          }
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.warn('Initial hospital data fetch error:', err);
    }
  };

  const handleNavigate = (view: string) => {
    if (view === 'book') {
      handleOpenBooking();
      return;
    }
    if (view === 'track') {
      setActiveTab('track-appointment');
      return;
    }
    if (view === 'saas-home') {
      setActiveTab('saas-home');
      return;
    }
    if (view === 'parent-dashboard') {
      if (parentUser) {
        setActiveTab('parent-portal');
      } else {
        setIsParentLoginOpen(true);
      }
      return;
    }
    if (view === 'reception-dashboard') {
      if (receptionUser) {
        setActiveTab('reception-desk');
      } else {
        setIsHospitalLoginOpen(true);
      }
      return;
    }
    if (view === 'doctor-desk' || view === 'doctor-dashboard') {
      if (doctorUser) {
        setActiveTab('doctor-desk');
      } else {
        setIsDoctorLoginOpen(true);
      }
      return;
    }

    // Scroll to landing page sections
    if (activeTab !== 'hospital-legacy') {
      setActiveTab('hospital-legacy');
      setTimeout(() => {
        if (view === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(view);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      if (view === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(view);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleConfigUpdate = (newConfig: SystemConfiguration) => {
    if (newConfig.simulatedDate) {
      localStorage.setItem('doctormate_simulated_date', newConfig.simulatedDate);
    }
    if (newConfig.simulatedTime) {
      localStorage.setItem('doctormate_simulated_time', newConfig.simulatedTime);
    }
    setConfig(newConfig);
  };

  const handleAdvanceTime = async (minutes: number) => {
    try {
      const res = await fetch('/api/simulation/advance-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      const data = await res.json();
      if (data.newTime) {
        localStorage.setItem('doctormate_simulated_time', data.newTime);
        setConfig((prev) => ({ ...prev, simulatedTime: data.newTime }));
      }
      if (data.config) {
        if (data.config.simulatedDate) localStorage.setItem('doctormate_simulated_date', data.config.simulatedDate);
        if (data.config.simulatedTime) localStorage.setItem('doctormate_simulated_time', data.config.simulatedTime);
        setConfig(data.config);
      }
      loadHospitalData();
      if (parentUser) handleRefreshParent();
    } catch (err) {
      console.error('Advance time error:', err);
    }
  };

  const handleSetTime = async (time: string) => {
    try {
      const res = await fetch('/api/simulation/advance-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTime: time }),
      });
      const data = await res.json();
      if (data.newTime) {
        localStorage.setItem('doctormate_simulated_time', data.newTime);
        setConfig((prev) => ({ ...prev, simulatedTime: data.newTime }));
      }
      if (data.config) {
        if (data.config.simulatedDate) localStorage.setItem('doctormate_simulated_date', data.config.simulatedDate);
        if (data.config.simulatedTime) localStorage.setItem('doctormate_simulated_time', data.config.simulatedTime);
        setConfig(data.config);
      }
      loadHospitalData();
      if (parentUser) handleRefreshParent();
    } catch (err) {
      console.error('Set time error:', err);
    }
  };

  const handleSetDate = async (date: string) => {
    try {
      localStorage.setItem('doctormate_simulated_date', date);
      const res = await fetch('/api/simulation/set-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (data.newDate) {
        localStorage.setItem('doctormate_simulated_date', data.newDate);
        setConfig((prev) => ({ ...prev, simulatedDate: data.newDate }));
      }
      if (data.config) {
        if (data.config.simulatedDate) localStorage.setItem('doctormate_simulated_date', data.config.simulatedDate);
        if (data.config.simulatedTime) localStorage.setItem('doctormate_simulated_time', data.config.simulatedTime);
        setConfig(data.config);
      }
      loadHospitalData();
      if (parentUser) handleRefreshParent();
    } catch (err) {
      console.error('Set date error:', err);
    }
  };

  const handleTriggerScenario = async (scenarioId: string) => {
    try {
      const res = await fetch('/api/simulation/trigger-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
      loadHospitalData();
      if (parentUser) handleRefreshParent();
    } catch (err) {
      console.error('Trigger scenario error:', err);
    }
  };

  const handleRefreshAll = () => {
    loadHospitalData();
    if (parentUser) handleRefreshParent();
  };

  const handleOpenBooking = (doctorId?: string, branchId?: BranchId) => {
    setBookingDoctorId(doctorId);
    setBookingBranchId(branchId);
    setIsBookModalOpen(true);
  };

  const handleOpenReschedule = (appointment: Appointment) => {
    setRescheduleTargetAppt(appointment);
    setIsRescheduleModalOpen(true);
  };

  const handleParentLoginSuccess = (parent: Parent, token?: string) => {
    setParentUser(parent);
    if (token) {
      setParentToken(token);
      localStorage.setItem('doctormate_parent_token', token);
    }
    setActiveTab('parent-portal');
  };

  const handleReceptionLoginSuccess = (user: {
    username: string;
    branchId: BranchId;
    name: string;
    hospitalId?: string;
    hospitalName?: string;
  }) => {
    setReceptionUser(user);
    localStorage.setItem('doctormate_reception_user', JSON.stringify(user));
    loadHospitalData();
    setActiveTab('reception-desk');
  };

  const handleAdminLoginSuccess = (admin: HospitalAdminUser, hospital: Hospital, token: string) => {
    const session = { admin, hospital, token };
    setHospitalAdmin(session);
    localStorage.setItem('doctormate_admin_session', JSON.stringify(session));
    setActiveTab('hospital-admin');
  };

  const handleLogoutAdmin = () => {
    localStorage.removeItem('doctormate_admin_session');
    setHospitalAdmin(null);
    setActiveTab('saas-home');
  };

  const handleLogoutReception = () => {
    localStorage.removeItem('doctormate_reception_user');
    localStorage.removeItem('doctormate_active_tab');
    setReceptionUser(null);
    setActiveTab('saas-home');
  };

  const handleLogoutParent = async () => {
    if (parentToken) {
      try {
        await fetch('/api/auth/parent-logout', {
          method: 'POST',
          headers: { 'x-parent-token': parentToken },
        });
      } catch (err) {}
    }
    localStorage.removeItem('doctormate_parent_token');
    localStorage.removeItem('doctormate_active_tab');
    setParentToken(null);
    setParentUser(null);
    setActiveTab('saas-home');
  };

  const handleLogoutDoctor = async () => {
    if (doctorUser?.token) {
      try {
        await fetch('/api/auth/doctor-logout', {
          method: 'POST',
          headers: { 'x-doctor-token': doctorUser.token },
        });
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.removeItem('sri_devi_doctor_token');
    localStorage.removeItem('sri_devi_active_tab');
    localStorage.removeItem('doctormate_doctor_session');
    setDoctorUser(null);
    setActiveTab('saas-home');
  };

  const handleRefreshParent = async () => {
    if (!parentUser) return;
    try {
      const res = await fetch(`/api/parents/search?mobile=${parentUser.mobile}`);
      const data = await res.json();
      if (data && data.id) {
        setParentUser(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick switch navigation bar when viewing sub-pages
  const isSaasHome = activeTab === 'saas-home';

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Dev Simulation Bar for testing real-world operational scenarios */}
      <SimulationBar
        config={config}
        simulatedTime={config.simulatedTime}
        simulatedDate={config.simulatedDate}
        onAdvanceTime={handleAdvanceTime}
        onSetTime={handleSetTime}
        onSetDate={handleSetDate}
        onTriggerScenario={handleTriggerScenario}
        onRefresh={handleRefreshAll}
        onConfigUpdate={handleConfigUpdate}
      />

      {/* Global Context Bar when navigating away from SaaS Home */}
      {!isSaasHome && (
        <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('saas-home')}
                className="font-bold text-teal-400 hover:text-white transition flex items-center gap-1"
              >
                ← Doctormate Platform
              </button>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 font-medium capitalize">
                {activeTab.replace('-', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('track-appointment')}
                className="text-teal-200 hover:text-white font-medium"
              >
                Track Live Queue
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setIsHospitalLoginOpen(true)}
                className="text-slate-300 hover:text-white font-medium"
              >
                Hospital Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Switcher */}
      <main className="flex-1">
        <ErrorBoundary fallbackTitle="Unable to load this dashboard view">
        {activeTab === 'saas-home' ? (
          <DoctormateHome
            onOpenRegister={() => setIsHospitalRegOpen(true)}
            onOpenLogin={() => setIsHospitalLoginOpen(true)}
            onOpenTracker={(tok) => {
              setTrackingToken(tok);
              setActiveTab('track-appointment');
            }}
            onSelectHospital={(slug) => {
              setActiveHospitalSlug(slug);
              setActiveTab('hospital-booking');
            }}
            onGoToReceptionDemo={() => {
              setReceptionUser({
                username: 'reception.apex',
                branchId: 'kakinada',
                name: 'Apex Hospital Reception Desk',
                hospitalId: 'hosp_sdch',
                hospitalName: 'Apex Multi-Specialty Hospital',
              });
              setActiveTab('reception-desk');
            }}
            onGoToAdminDemo={() => {
              handleAdminLoginSuccess(
                {
                  id: 'admin_sdch',
                  hospitalId: 'hosp_sdch',
                  name: 'Dr. Vivek Sharma',
                  email: 'admin@apexhealth.com',
                  mobile: '9888877777',
                  role: 'HOSPITAL_ADMIN',
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'hosp_sdch',
                  slug: 'apex-hospital',
                  name: 'Apex Multi-Specialty Hospital',
                  address: '77 Healthcare Boulevard, Beach Road',
                  city: 'Visakhapatnam',
                  state: 'Andhra Pradesh',
                  pincode: '530002',
                  phone: '+91 891 223 4455',
                  adminName: 'Dr. Vivek Sharma',
                  adminEmail: 'admin@apexhealth.com',
                  adminMobile: '9888877777',
                  hospitalType: 'Super Speciality Hospital & Trauma Center',
                  status: 'ACTIVE',
                  onboardingStep: 6,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                'demo-token'
              );
            }}
          />
        ) : activeTab === 'hospital-booking' ? (
          <PublicHospitalBooking
            hospitalSlug={activeHospitalSlug}
            onBackToHome={() => setActiveTab('saas-home')}
            onOpenTracker={(token) => {
              setTrackingToken(token);
              setActiveTab('track-appointment');
            }}
          />
        ) : activeTab === 'track-appointment' ? (
          <SecureTrackerView
            initialToken={trackingToken}
            onBack={() => setActiveTab('saas-home')}
            onBookNew={() => setActiveTab('hospital-booking')}
          />
        ) : activeTab === 'hospital-admin' ? (
          hospitalAdmin ? (
            <HospitalAdminDashboard
              hospitalId={hospitalAdmin.hospital.id}
              adminUser={hospitalAdmin.admin}
              adminName={hospitalAdmin.admin.name}
              onLogout={handleLogoutAdmin}
              onNavigateToBooking={(slug) => {
                setActiveHospitalSlug(slug);
                setActiveTab('hospital-booking');
              }}
              onLaunchOnboarding={(hosp) => {
                setOnboardingHospital(hosp);
                setActiveTab('onboarding');
              }}
            />
          ) : (
            <div className="py-20 text-center">
              <p className="text-slate-600 mb-4">Please log in to access the Hospital Admin Portal.</p>
              <button
                onClick={() => setIsHospitalLoginOpen(true)}
                className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold"
              >
                Admin Sign In
              </button>
            </div>
          )
        ) : activeTab === 'onboarding' && onboardingHospital ? (
          <HospitalOnboardingWizard
            hospital={onboardingHospital}
            onFinish={(updatedHosp) => {
              const updatedAdmin: HospitalAdminUser = (hospitalAdmin && hospitalAdmin.admin) || {
                id: `admin_${updatedHosp.id}`,
                hospitalId: updatedHosp.id,
                name: updatedHosp.adminName,
                email: updatedHosp.adminEmail,
                mobile: updatedHosp.adminMobile,
                role: 'HOSPITAL_ADMIN',
                createdAt: new Date().toISOString(),
              };
              const session = {
                admin: updatedAdmin,
                hospital: updatedHosp,
                token: hospitalAdmin?.token || `hosp_admin_tok_${Date.now()}`,
              };
              setHospitalAdmin(session);
              localStorage.setItem('doctormate_admin_session', JSON.stringify(session));
              setActiveTab('hospital-admin');
            }}
            onCompleted={(updatedHosp) => {
              const updatedAdmin: HospitalAdminUser = (hospitalAdmin && hospitalAdmin.admin) || {
                id: `admin_${updatedHosp.id}`,
                hospitalId: updatedHosp.id,
                name: updatedHosp.adminName,
                email: updatedHosp.adminEmail,
                mobile: updatedHosp.adminMobile,
                role: 'HOSPITAL_ADMIN',
                createdAt: new Date().toISOString(),
              };
              const session = {
                admin: updatedAdmin,
                hospital: updatedHosp,
                token: hospitalAdmin?.token || `hosp_admin_tok_${Date.now()}`,
              };
              setHospitalAdmin(session);
              localStorage.setItem('doctormate_admin_session', JSON.stringify(session));
              setActiveTab('hospital-admin');
            }}
            onCancel={() => setActiveTab('hospital-admin')}
          />
        ) : activeTab === 'parent-portal' && parentUser ? (
          <ParentDashboard
            parentUser={parentUser}
            parentToken={parentToken}
            config={config}
            onOpenBookAppointment={() => handleOpenBooking()}
            onRescheduleAppointment={handleOpenReschedule}
            onLogout={handleLogoutParent}
            onRefreshParent={handleRefreshParent}
          />
        ) : activeTab === 'reception-desk' && receptionUser ? (
          <ReceptionDashboard
            receptionUser={receptionUser}
            doctors={
              receptionUser.hospitalId
                ? doctors.filter((d) => (d.hospitalId || 'hosp_sdch') === receptionUser.hospitalId)
                : doctors
            }
            branches={
              receptionUser.hospitalId
                ? branches.filter((b) => (b.hospitalId || 'hosp_sdch') === receptionUser.hospitalId)
                : branches
            }
            config={config}
            onLogout={handleLogoutReception}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            onConfigUpdate={handleConfigUpdate}
          />
        ) : activeTab === 'doctor-desk' && doctorUser ? (
          <DoctorDashboard
            doctorUser={doctorUser}
            config={config}
            onLogout={handleLogoutDoctor}
          />
        ) : (
          <div className="py-20 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Welcome to Doctormate</h3>
            <p className="text-sm text-slate-500 mb-6">Explore registered hospitals or access your OPD portal.</p>
            <button
              onClick={() => setActiveTab('saas-home')}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              Back to Doctormate Home
            </button>
          </div>
        )}
        </ErrorBoundary>
      </main>

      {/* Hospital Registration Modal */}
      <HospitalRegistrationModal
        isOpen={isHospitalRegOpen}
        onClose={() => setIsHospitalRegOpen(false)}
        onRegistrationSuccess={(newHosp, tok) => {
          setIsHospitalRegOpen(false);
          setOnboardingHospital(newHosp);
          setHospitalAdmin({
            admin: {
              id: `admin_${Date.now()}`,
              hospitalId: newHosp.id,
              name: newHosp.adminName,
              email: newHosp.adminEmail,
              mobile: newHosp.adminMobile,
              role: 'HOSPITAL_ADMIN',
              createdAt: new Date().toISOString(),
            },
            hospital: newHosp,
            token: tok,
          });
          setActiveTab('onboarding');
        }}
      />

      {/* Hospital Login Modal (Admin & Reception) */}
      <HospitalLoginModal
        isOpen={isHospitalLoginOpen}
        onClose={() => setIsHospitalLoginOpen(false)}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onReceptionLoginSuccess={handleReceptionLoginSuccess}
        onOpenRegister={() => setIsHospitalRegOpen(true)}
      />

      {/* Legacy Modals */}
      <ParentLoginModal
        isOpen={isParentLoginOpen}
        onClose={() => setIsParentLoginOpen(false)}
        onLoginSuccess={handleParentLoginSuccess}
      />

      <ReceptionLoginModal
        isOpen={isReceptionLoginOpen}
        onClose={() => setIsReceptionLoginOpen(false)}
        onLoginSuccess={handleReceptionLoginSuccess}
      />

      <DoctorLoginModal
        isOpen={isDoctorLoginOpen}
        onClose={() => setIsDoctorLoginOpen(false)}
        onLoginSuccess={(doctor, account, token) => {
          const session = { doctor, account, token };
          setDoctorUser(session);
          localStorage.setItem('doctormate_doctor_session', JSON.stringify(session));
          setActiveTab('doctor-desk');
        }}
      />

      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        parentUser={parentUser}
        onOpenParentLogin={() => setIsParentLoginOpen(true)}
        doctors={doctors}
        branches={branches}
        initialDoctorId={bookingDoctorId}
        initialBranchId={bookingBranchId}
        simulatedDate={config.simulatedDate}
        onBookingSuccess={() => {
          if (parentUser) handleRefreshParent();
        }}
        onViewDashboard={() => {
          setActiveTab('parent-portal');
        }}
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setRescheduleTargetAppt(null);
        }}
        appointment={rescheduleTargetAppt}
        onRescheduleSuccess={() => {
          if (parentUser) handleRefreshParent();
        }}
      />

      <TrackAppointmentModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        config={config}
        initialMobile={parentUser?.mobile || ''}
        onOpenBooking={() => {
          setIsTrackModalOpen(false);
          handleOpenBooking();
        }}
        onNavigateToParentPortal={() => {
          setIsTrackModalOpen(false);
          if (parentUser) {
            setActiveTab('parent-portal');
          } else {
            setIsParentLoginOpen(true);
          }
        }}
      />

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />
    </div>
  );
}
