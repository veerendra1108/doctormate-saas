import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  PhoneCall,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Activity,
  Layers,
  Database,
  Smartphone,
  ExternalLink,
  Sliders,
  Menu,
  X,
  Lock,
  Zap,
  Rocket,
  Globe,
  Stethoscope,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  HeartPulse,
  Share2,
  Bell,
  RefreshCw,
  QrCode,
  HelpCircle,
  ChevronDown,
  UserCheck,
  Award,
  CheckCircle,
  Cpu,
  Monitor,
  Phone,
  ArrowUpRight,
  Radio,
  Play,
  Pause,
  Gauge,
  Timer,
  Navigation,
} from 'lucide-react';
import { Hospital } from '../types/index.js';

interface DoctormateHomeProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onOpenTracker: (token?: string) => void;
  onSelectHospital: (slug: string) => void;
  onGoToReceptionDemo: () => void;
  onGoToAdminDemo: () => void;
}

interface DemoState {
  patientName: string;
  patientMobile: string;
  selectedDoctor: string;
  selectedSlot: string;
  bookingStatus: 'UNBOOKED' | 'BOOKED' | 'ARRIVED' | 'WITH_DOCTOR';
  doctorDelayMinutes: number;
  tokenNumber: string;
  patientsAhead: number;
  estimatedTime: string;
  lastActionNotification: string | null;
}

const INITIAL_DEMO_STATE: DemoState = {
  patientName: 'Kavya Sharma',
  patientMobile: '98765 43210',
  selectedDoctor: 'Dr. Rajesh Varma, MD (Pediatrics & Cardiology)',
  selectedSlot: '10:30 AM',
  bookingStatus: 'UNBOOKED',
  doctorDelayMinutes: 0,
  tokenNumber: 'DM-APO-2610-1030',
  patientsAhead: 2,
  estimatedTime: '10:30 AM',
  lastActionNotification: null,
};

export const DoctormateHome: React.FC<DoctormateHomeProps> = ({
  onOpenRegister,
  onOpenLogin,
  onOpenTracker,
  onSelectHospital,
  onGoToReceptionDemo,
  onGoToAdminDemo,
}) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackTokenInput, setTrackTokenInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Signature Interactive Demo State
  const [demoState, setDemoState] = useState<DemoState>(INITIAL_DEMO_STATE);
  const [demoActiveView, setDemoActiveView] = useState<'booking' | 'reception' | 'tracker'>('booking');

  // Showcase Tab State
  const [showcaseTab, setShowcaseTab] = useState<'reception' | 'doctor' | 'patient'>('reception');

  // Patient Journey Active Step
  const [journeyStep, setJourneyStep] = useState<number>(1);

  // Pricing Interval Toggle
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Scrolling Showcase for 5-10 Partner Hospitals (Minimal Webpage Mode)
  const hospitalScrollRef = useRef<HTMLDivElement>(null);

  // Hero Interactive Motion Graphics State
  const [heroSelectedSlot, setHeroSelectedSlot] = useState('10:30 AM');
  const [heroDelayActive, setHeroDelayActive] = useState(true);
  const [heroSlotRipple, setHeroSlotRipple] = useState(false);

  // Dedicated Motion Graphics Engine Section State
  const [motionEngineTab, setMotionEngineTab] = useState<'slots' | 'delay'>('slots');
  const [engineSelectedSlot, setEngineSelectedSlot] = useState('10:30 AM');
  const [engineDelayMinutes, setEngineDelayMinutes] = useState(15);
  const [engineSlotBurst, setEngineSlotBurst] = useState(false);

  const scrollHospitals = (direction: 'left' | 'right') => {
    if (hospitalScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      hospitalScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const res = await fetch('/api/hospitals');
      const data = await res.json();
      if (Array.isArray(data)) {
        setHospitals(data);
      }
    } catch (err) {
      console.error('Failed to fetch hospitals:', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    const q = searchQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      (h.hospitalType && h.hospitalType.toLowerCase().includes(q))
    );
  });

  // Curate 6 to 10 hospitals maximum for a clean, minimal scrolling layout
  const curatedHospitals = filteredHospitals.length > 0
    ? filteredHospitals.slice(0, 8)
    : [
        { id: 'h1', name: 'Solstice Multi-Specialty Hospital', slug: 'solstice-hospital', city: 'Visakhapatnam', state: 'AP', hospitalType: 'Tertiary Care Hospital' },
        { id: 'h2', name: 'Apollo Apex Health Center', slug: 'apollo-apex', city: 'Vijayawada', state: 'AP', hospitalType: 'Super Specialty Hospital' },
        { id: 'h3', name: 'Sri Devi Children Hospital', slug: 'sri-devi-children', city: 'Kakinada', state: 'AP', hospitalType: 'Pediatric Care Center' },
        { id: 'h4', name: 'Apex Heart & Maternity Institute', slug: 'apex-heart', city: 'Guntur', state: 'AP', hospitalType: 'Cardiac & Maternity' },
        { id: 'h5', name: 'Sunrise Orthopedic & Trauma Care', slug: 'sunrise-ortho', city: 'Rajahmundry', state: 'AP', hospitalType: 'Orthopedic Specialty' },
        { id: 'h6', name: 'Medanta Wellness & Diagnostic OPD', slug: 'medanta-opd', city: 'Hyderabad', state: 'TS', hospitalType: 'Multi-Specialty Clinic' },
        { id: 'h7', name: 'LifeLine Metro Polyclinic', slug: 'lifeline-metro', city: 'Tirupati', state: 'AP', hospitalType: 'Family Health Center' },
        { id: 'h8', name: 'CarePoint Neonatal & Pediatric Center', slug: 'carepoint-pediatric', city: 'Vizianagaram', state: 'AP', hospitalType: 'Pediatric & Neonatal' },
      ];

  const marqueeHospitals = [...curatedHospitals, ...curatedHospitals];

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackTokenInput.trim()) {
      onOpenTracker(trackTokenInput.trim());
    } else {
      onOpenTracker();
    }
  };

  const handleNavClick = (anchorId: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleCopySampleLink = () => {
    const sampleUrl = `${window.location.origin}/hospital/apex-hospital`;
    navigator.clipboard.writeText(sampleUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Demo Action Handlers
  const handleDemoBookSlot = (slot: string) => {
    setDemoState((prev) => ({
      ...prev,
      selectedSlot: slot,
      bookingStatus: 'BOOKED',
      tokenNumber: `DM-APO-2610-${slot.replace(/[^0-9]/g, '')}`,
      estimatedTime: slot,
      patientsAhead: 2,
      lastActionNotification: `Slot confirmed for ${slot}! Booking synchronized with reception OPD queue.`,
    }));
    setDemoActiveView('reception');
  };

  const handleDemoMarkArrived = () => {
    setDemoState((prev) => ({
      ...prev,
      bookingStatus: 'ARRIVED',
      lastActionNotification: 'Reception verified patient arrival. Token status transitioned to WAITING in queue.',
    }));
  };

  const handleDemoAddDelay = (mins: number) => {
    setDemoState((prev) => {
      const newDelay = prev.doctorDelayMinutes + mins;
      // Calculate new time: 10:30 + 15 mins -> 10:45 AM
      const newTime = newDelay === 15 ? '10:45 AM' : newDelay === 30 ? '11:00 AM' : '11:15 AM';
      return {
        ...prev,
        doctorDelayMinutes: newDelay,
        estimatedTime: newTime,
        lastActionNotification: `Reception added +${mins}m doctor transit delay. Downstream queue ETAs dynamically recalculated to ${newTime}!`,
      };
    });
  };

  const handleDemoSendIn = () => {
    setDemoState((prev) => ({
      ...prev,
      bookingStatus: 'WITH_DOCTOR',
      patientsAhead: 0,
      lastActionNotification: 'Patient called into Consultation Chamber 1 with Dr. Rajesh Varma.',
    }));
    setDemoActiveView('tracker');
  };

  const handleResetDemo = () => {
    setDemoState(INITIAL_DEMO_STATE);
    setDemoActiveView('booking');
  };

  return (
    <div className="min-h-screen bg-[#F8FBFC] text-[#172B4D] flex flex-col overflow-x-hidden w-full selection:bg-[#0F766E] selection:text-white font-sans antialiased">
      {/* SaaS B2B Top Announcement Bar */}
      <div className="bg-[#102A43] text-white text-xs py-2 px-3 sm:px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14B8A6]"></span>
            </span>
            <span className="font-bold tracking-wider text-[#14B8A6] uppercase text-[10px]">
              Healthcare SaaS
            </span>
            <span className="text-slate-300 font-medium">
              Multi-Tenant OPD &amp; Live Queue Infrastructure for Hospitals &amp; Clinics
            </span>
            <span className="text-slate-500 hidden md:inline">•</span>
            <span className="text-teal-300 font-semibold hidden md:inline">
              Powered by eazy learnings
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs justify-center shrink-0">
            <button
              onClick={onGoToAdminDemo}
              className="text-slate-300 hover:text-white transition flex items-center gap-1 font-medium px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Demo</span>
            </button>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <button
              onClick={onGoToReceptionDemo}
              className="text-slate-300 hover:text-white transition flex items-center gap-1 font-medium px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
              <span>Reception Console</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Header and Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] flex items-center justify-center text-white shadow-md shadow-teal-900/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-[#102A43]">
                  DoctorMate<span className="text-[#0F766E]">.</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E7F7F3] text-[#0F766E] px-2 py-0.5 rounded-full border border-teal-200/60">
                  B2B SaaS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Powered by <span className="font-semibold text-slate-700">eazy learnings</span>
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <button
              onClick={() => handleNavClick('features')}
              className="hover:text-[#0F766E] transition cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="hover:text-[#0F766E] transition cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => handleNavClick('live-demo')}
              className="text-[#0F766E] font-bold hover:text-teal-800 transition flex items-center gap-1.5 cursor-pointer bg-teal-50/70 px-2.5 py-1 rounded-lg border border-teal-200/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Interactive Demo</span>
            </button>
            <button
              onClick={() => handleNavClick('for-hospitals')}
              className="hover:text-[#0F766E] transition cursor-pointer"
            >
              For Hospitals
            </button>
            <button
              onClick={() => handleNavClick('pricing')}
              className="hover:text-[#0F766E] transition cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => handleNavClick('faqs')}
              className="hover:text-[#0F766E] transition cursor-pointer"
            >
              FAQs
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <button
              onClick={() => onOpenTracker()}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-[#0F766E] bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Track Token</span>
            </button>

            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F766E] hover:text-teal-800 bg-[#E7F7F3] hover:bg-teal-100/70 border border-teal-200/80 rounded-xl transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Hospital Login</span>
            </button>

            <button
              onClick={onOpenRegister}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-teal-800 hover:to-teal-600 rounded-xl shadow-md shadow-teal-900/15 transition transform active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onOpenRegister}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#0F766E] rounded-lg shadow-xs"
            >
              Get Started
            </button>
            <button
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-[#0F766E] rounded-xl hover:bg-slate-100 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-xl">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
              <button
                onClick={() => handleNavClick('features')}
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-[#0F766E] rounded-xl text-left transition flex items-center justify-between"
              >
                <span>Features</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavClick('how-it-works')}
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-[#0F766E] rounded-xl text-left transition flex items-center justify-between"
              >
                <span>How It Works</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavClick('live-demo')}
                className="p-3 bg-teal-50/70 text-[#0F766E] font-bold rounded-xl text-left transition flex items-center justify-between border border-teal-200/60"
              >
                <span>Interactive Demo</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleNavClick('for-hospitals')}
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-[#0F766E] rounded-xl text-left transition flex items-center justify-between"
              >
                <span>For Hospitals</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavClick('pricing')}
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-[#0F766E] rounded-xl text-left transition flex items-center justify-between"
              >
                <span>Pricing</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavClick('faqs')}
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-[#0F766E] rounded-xl text-left transition flex items-center justify-between"
              >
                <span>FAQs</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTracker();
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Search className="w-4 h-4 text-[#0F766E]" />
                Track Patient Token Live
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 px-4 bg-[#E7F7F3] text-[#0F766E] border border-teal-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Lock className="w-4 h-4" />
                Hospital Login (Admin / Reception)
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegister();
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition"
              >
                <Rocket className="w-4 h-4" />
                Register Your Hospital
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section — Core SaaS Product Presentation */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#E7F7F3]/30 to-[#F8FBFC] pt-12 sm:pt-16 pb-16 sm:pb-24 border-b border-slate-200/80">
        {/* Glow ambient background elements */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-teal-400/15 via-emerald-300/10 to-sky-400/15 blur-3xl rounded-full pointer-events-none -z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7F7F3] border border-teal-200 text-[#0F766E] text-xs font-extrabold tracking-wider uppercase mb-6 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Smart Hospital Management</span>
              <span className="text-teal-400">•</span>
              <span className="text-slate-600 font-medium lowercase">powered by eazy learnings</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#102A43] tracking-tight leading-[1.12] mb-6">
              Your Hospital.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F766E] via-teal-600 to-[#14B8A6]">
                Smarter Appointments.
              </span>{' '}
              Happier Patients.
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg lg:text-xl text-[#64748B] leading-relaxed font-normal mb-8 max-w-2xl mx-auto">
              Let patients book appointments online, track their queue live, and receive delay updates — while your reception team manages everything from one simple dashboard.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
              <button
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-teal-800 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-900/20 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Register Your Hospital</span>
              </button>

              <button
                onClick={() => handleNavClick('live-demo')}
                className="w-full sm:w-auto px-7 py-4 rounded-xl bg-white hover:bg-slate-50 text-[#102A43] border border-slate-300 font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#0F766E]" />
                <span>Try Interactive Demo</span>
              </button>
            </div>

            {/* Benefit Statement */}
            <p className="text-xs text-[#64748B] font-medium flex items-center justify-center gap-2 mb-12">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Set up your hospital in minutes. No dedicated hardware or IT installation required.</span>
            </p>
          </div>

          {/* Hero Visual: Layered Product Visualization */}
          <div className="relative max-w-5xl mx-auto mt-4">
            {/* Main Desktop Reception Dashboard Mockup */}
            <div className="bg-[#102A43] p-2.5 sm:p-4 rounded-3xl shadow-2xl border border-slate-700/60 ring-1 ring-white/10">
              {/* Window Controls */}
              <div className="flex items-center justify-between pb-3 px-3 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] ml-2 hidden sm:inline">
                    doctormate.in/reception-desk — Solstice General Hospital
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live OPD Stream
                  </span>
                  <span className="text-slate-400 text-[11px]">Today: 20 Oct 2026</span>
                </div>
              </div>

              {/* Dashboard Content Mockup */}
              <div className="bg-[#F8FBFC] rounded-2xl p-4 sm:p-6 text-slate-800 space-y-4">
                {/* Stats Header Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Queue</div>
                    <div className="text-xl font-black text-[#102A43] mt-0.5">8 Patients</div>
                    <div className="text-[10px] text-teal-600 font-medium">3 In Waiting Area</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Consultation</div>
                    <div className="text-xl font-black text-emerald-700 mt-0.5">Chamber 1</div>
                    <div className="text-[10px] text-slate-500 font-medium">Dr. Rajesh Varma</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor Delay</div>
                    <div className="text-xl font-black text-amber-700 mt-0.5">+15 Mins</div>
                    <div className="text-[10px] text-amber-600 font-medium">Downstream sync active</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Today</div>
                    <div className="text-xl font-black text-[#0F766E] mt-0.5">14 Consults</div>
                    <div className="text-[10px] text-slate-500 font-medium">Avg duration 15m</div>
                  </div>
                </div>

                {/* Queue Table Preview */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Live OPD Queue — Dr. Rajesh Varma (Pediatrics)</span>
                    <span className="text-[11px] text-teal-700 font-medium">Rolling Train-ETA Active</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="p-3 flex items-center justify-between bg-emerald-50/50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                          #DM-1001
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">Aarav Patel (4y)</div>
                          <div className="text-[10px] text-slate-500">Scheduled: 10:00 • Arrived: 09:50</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> With Doctor
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between bg-amber-50/40">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                          #DM-1002
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">Baby Ananya (18m)</div>
                          <div className="text-[10px] text-slate-500">Scheduled: 10:15 • Arrived • Paid Cash</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-right">
                          <span className="text-[10px] text-slate-400 block">Expected:</span>
                          <span className="font-bold text-amber-900 font-mono">10:30 AM</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Next in Queue
                        </span>
                      </div>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          #DM-1003
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">Rohan Reddy (7y)</div>
                          <div className="text-[10px] text-slate-500">Scheduled: 10:30 • Online Booking • Advised Arrival 10:30</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-right">
                          <span className="text-[10px] text-slate-400 block">Revised ETA:</span>
                          <span className="font-bold text-teal-900 font-mono">10:45 AM</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-bold text-[10px]">
                          Waiting (Pos #2)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Card 1: Interactive Slot Booking Motion Graphic */}
            <div className="hidden md:block absolute -bottom-10 -left-6 lg:-left-12 w-72 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-teal-200/90 animate-float-slow z-20 overflow-hidden">
              {/* Laser scan beam */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-teal-400/20 to-transparent skew-x-12 animate-slot-scan" />
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 mb-2.5">
                <span className="flex items-center gap-1.5 text-[#0F766E]">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Slot Booking Engine</span>
                </span>
                <span className="text-[9px] bg-teal-50 text-[#0F766E] border border-teal-200 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  0ms Lock
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-slate-700">Select Consultation Slot:</div>
                <span className="text-[10px] text-teal-700 font-mono">Live Radar Active</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-2.5 relative">
                {['10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM'].map((slot, sIdx) => {
                  const isBooked = slot === '10:00 AM' || slot === '10:15 AM';
                  const isSelected = heroSelectedSlot === slot;
                  return (
                    <button
                      key={sIdx}
                      disabled={isBooked}
                      onClick={() => {
                        setHeroSelectedSlot(slot);
                        setHeroSlotRipple(true);
                        setTimeout(() => setHeroSlotRipple(false), 800);
                      }}
                      className={`relative px-2 py-1.5 rounded-xl text-center text-[10px] font-bold transition-all cursor-pointer overflow-hidden ${
                        isBooked
                          ? 'bg-slate-100 text-slate-400 line-through cursor-not-allowed border border-slate-200'
                          : isSelected
                          ? 'bg-[#0F766E] text-white shadow-md ring-2 ring-teal-300'
                          : 'bg-teal-50/60 text-[#0F766E] border border-teal-200/80 hover:bg-teal-100/70'
                      }`}
                    >
                      {isSelected && heroSlotRipple && (
                        <span className="absolute inset-0 rounded-xl bg-teal-400/50 animate-ripple-pulse pointer-events-none" />
                      )}
                      <div>{slot} {isSelected ? '✓' : ''}</div>
                      <div className="text-[8px] font-normal opacity-90">
                        {isBooked ? 'Locked' : isSelected ? 'Selected' : 'Available'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Anti-collision Shield
                </span>
                <span className="font-mono text-emerald-700 font-bold">12ms sync</span>
              </div>
            </div>

            {/* Floating Card 2: Interactive Live Tracking & Delay Shockwave Motion Graphic */}
            <div
              className={`hidden md:block absolute -top-8 -right-6 lg:-right-10 w-80 bg-[#102A43]/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-float-slow z-20 transition-all ${
                heroDelayActive ? 'animate-delay-shockwave ring-1 ring-amber-400/40' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <span className="absolute -inset-1 rounded-full bg-amber-400/20 animate-radar-wave pointer-events-none" />
                    <span className="absolute -inset-1 rounded-full bg-amber-400/10 animate-radar-wave-delayed pointer-events-none" />
                    <Radio className="w-4 h-4 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                      <span>Live Queue Radar</span>
                      {heroDelayActive && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400/40 font-mono">
                          +15m DELAY
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400">Rolling Train-ETA Dispatch</div>
                  </div>
                </div>

                {/* Interactive Delay Toggle */}
                <button
                  onClick={() => setHeroDelayActive(!heroDelayActive)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                    heroDelayActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="Click to toggle delay simulation"
                >
                  {heroDelayActive ? '⚡ Delay On' : 'Simulate Delay'}
                </button>
              </div>

              {/* Animated Queue Train Track */}
              <div className="py-1 px-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Chamber (Dr. Varma)</span>
                  <span className="font-mono text-emerald-400">Aarav Patel</span>
                  <span className={`font-mono font-bold ${heroDelayActive ? 'text-amber-400' : 'text-teal-400'}`}>
                    {heroDelayActive ? 'ETA: 10:45 AM' : 'ETA: 10:30 AM'}
                  </span>
                </div>

                {/* SVG Animated Dash Connector */}
                <div className="relative h-2 w-full my-1.5">
                  <svg className="w-full h-2 overflow-visible">
                    <line
                      x1="0"
                      y1="4"
                      x2="100%"
                      y2="4"
                      stroke={heroDelayActive ? '#f59e0b' : '#14b8a6'}
                      strokeWidth="3"
                      className="animate-track-dash"
                    />
                  </svg>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] space-y-1 mt-2">
                <div className="text-slate-300 flex items-center justify-between">
                  <span>Consultation Status:</span>
                  <span className="font-bold text-emerald-400">In Chamber</span>
                </div>
                <div className="text-slate-400 leading-tight">
                  {heroDelayActive
                    ? '⚠️ Doctor delayed by 15m. Downstream buffer absorbing gap. Advised arrival: 10:30 AM.'
                    : '✓ Doctor on exact schedule. Please arrive 15 minutes before your time.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hospital Problems & Solutions — Before & After Section */}
      <section id="for-hospitals" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Transforming Hospital Operations
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              Your Doctors Should Focus on Patients. Not Appointment Chaos.
            </h2>
            <p className="text-base text-[#64748B] mt-4 leading-relaxed">
              Every day, hospital reception desks are overwhelmed with phone calls, crowded waiting lobbies, and angry patients asking "When is my turn?". DoctorMate replaces manual friction with systematic digital flow.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Traditional OPD Card */}
            <div className="p-8 rounded-3xl bg-rose-50/40 border-2 border-rose-200/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
                    ✕
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-rose-950">Traditional Hospital OPD</h3>
                    <p className="text-xs text-rose-700 font-medium">Manual, noisy, and high-stress reception</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3 p-3.5 bg-white/80 rounded-2xl border border-rose-100">
                    <Phone className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">Continuous phone interruptions</strong>
                      <span className="text-xs text-slate-600">Receptionists spend hours answering repeated calls for doctor availability and booking slots instead of attending arriving patients.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white/80 rounded-2xl border border-rose-100">
                    <Users className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">Crowded, anxious waiting lobbies</strong>
                      <span className="text-xs text-slate-600">Patients arrive hours early out of fear of losing their turn, creating unhygienic and stressful overcrowding.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white/80 rounded-2xl border border-rose-100">
                    <Clock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">Unannounced doctor delays</strong>
                      <span className="text-xs text-slate-600">When surgeries or emergency visits delay the doctor, downstream patients receive zero proactive notice, leading to anger.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white/80 rounded-2xl border border-rose-100">
                    <HelpCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">"How many patients ahead?" fatigue</strong>
                      <span className="text-xs text-slate-600">Constant desk interruptions from anxious families asking about queue numbers and estimated chamber entry.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-rose-200/60 text-xs text-rose-800 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Result: Reception staff burnout, lost bookings, and lower patient satisfaction scores.</span>
              </div>
            </div>

            {/* DoctorMate Smart OPD Card */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#E7F7F3]/80 to-white border-2 border-teal-300 shadow-xl shadow-teal-900/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#102A43]">DoctorMate Smart OPD</h3>
                      <p className="text-xs text-[#0F766E] font-semibold">Organized, predictable, and stress-free</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    Modern Standard
                  </span>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-teal-100 shadow-2xs">
                    <Globe className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">24/7 Self-Service Hospital Booking</strong>
                      <span className="text-xs text-slate-600">Patients pick exact 15-minute consultation slots online through your branded hospital link, reducing phone workload by 80%.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-teal-100 shadow-2xs">
                    <Activity className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">Live Queue Radar with 15-Min Buffer</strong>
                      <span className="text-xs text-slate-600">Patients track their token position live from home and arrive exactly 15 minutes before their turn, eliminating lobby chaos.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-teal-100 shadow-2xs">
                    <Bell className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">One-Click Doctor Delay Broadcasts</strong>
                      <span className="text-xs text-slate-600">Receptionist sets a +15m or +30m delay; our rolling algorithm automatically recalculates all patient arrival times instantly.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-teal-100 shadow-2xs">
                    <Monitor className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-semibold">Unified Operations Console</strong>
                      <span className="text-xs text-slate-600">Single screen handles walk-ins, cash/PhonePe triage payment, no-show slot re-release, and doctor chamber calls seamlessly.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-teal-200 text-xs text-[#0F766E] font-bold flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Happier patients, punctual consultations, and calm front desk.</span>
                </span>
                <button
                  onClick={onOpenRegister}
                  className="text-xs font-bold text-teal-800 hover:text-teal-950 underline flex items-center gap-1"
                >
                  <span>Onboard in 5 mins</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Section: Interactive Product Demo */}
      <section id="live-demo" className="py-20 bg-[#F8FBFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Signature Sandbox
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              Don't Just Read About DoctorMate. Experience It.
            </h2>
            <p className="text-base text-[#64748B] mt-3 leading-relaxed">
              Interact with this synchronized live simulation. Pick an appointment slot in View A, see it appear on the Reception Dashboard in View B, apply a doctor delay, and watch the Patient Tracker update in View C in real-time.
            </p>

            {/* Sandbox Notice Banner */}
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Interactive Sandbox — No login required • Safe demonstration state</span>
              <button
                onClick={handleResetDemo}
                className="ml-2 font-bold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset Demo
              </button>
            </div>
          </div>

          {/* Action Notification Toast Bar */}
          {demoState.lastActionNotification && (
            <div className="max-w-3xl mx-auto mb-6 p-3 bg-teal-900 text-white rounded-xl shadow-lg flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{demoState.lastActionNotification}</span>
              </div>
              <button
                onClick={() => setDemoState((prev) => ({ ...prev, lastActionNotification: null }))}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* View Selector Tabs for Mobile and Desktop Viewport */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex p-1 bg-slate-200 rounded-2xl gap-1 text-xs font-bold">
              <button
                onClick={() => setDemoActiveView('booking')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  demoActiveView === 'booking'
                    ? 'bg-white text-[#102A43] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>View A: Patient Booking</span>
              </button>

              <button
                onClick={() => setDemoActiveView('reception')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  demoActiveView === 'reception'
                    ? 'bg-white text-[#102A43] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>View B: Reception Desk</span>
                {demoState.bookingStatus !== 'UNBOOKED' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>

              <button
                onClick={() => setDemoActiveView('tracker')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  demoActiveView === 'tracker'
                    ? 'bg-white text-[#102A43] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>View C: Patient Queue Tracker</span>
              </button>
            </div>
          </div>

          {/* 3 Synchronized Views Container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* View A — Patient Online Booking */}
            <div
              className={`bg-white rounded-3xl p-6 border-2 transition-all shadow-sm ${
                demoActiveView === 'booking' ? 'border-[#0F766E] ring-4 ring-teal-500/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold text-xs">
                    A
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Patient Booking View</h3>
                    <p className="text-[10px] text-slate-500">Branded hospital URL destination</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  /hospital/apollo-city
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Consultant</div>
                  <div className="font-bold text-slate-900 mt-0.5">Dr. Rajesh Varma</div>
                  <div className="text-[11px] text-[#0F766E]">Senior Pediatrician • 15m Slots</div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-2">
                    Available Consultation Slots (Today):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM'].map((slot, idx) => {
                      const isOccupied = slot === '10:00 AM' || slot === '10:15 AM';
                      const isSelected = demoState.selectedSlot === slot && demoState.bookingStatus !== 'UNBOOKED';
                      return (
                        <button
                          key={idx}
                          disabled={isOccupied}
                          onClick={() => handleDemoBookSlot(slot)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-medium ${
                            isOccupied
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#0F766E] text-white border-[#0F766E] font-bold shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-[#0F766E] hover:bg-teal-50/50'
                          }`}
                        >
                          <div>{slot}</div>
                          <div className="text-[9px] mt-0.5">
                            {isOccupied ? 'Occupied' : isSelected ? 'Confirmed ✓' : 'Available'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-[11px] text-slate-500 mb-2">
                    Patient: <strong>{demoState.patientName}</strong> ({demoState.patientMobile})
                  </div>
                  <button
                    onClick={() => handleDemoBookSlot('10:30 AM')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white font-bold text-xs shadow-sm hover:from-teal-800 hover:to-teal-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Click to Simulate 10:30 AM Booking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* View B — Reception Dashboard Live Operations */}
            <div
              className={`bg-white rounded-3xl p-6 border-2 transition-all shadow-sm ${
                demoActiveView === 'reception' ? 'border-[#0F766E] ring-4 ring-teal-500/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold text-xs">
                    B
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Reception Operations</h3>
                    <p className="text-[10px] text-slate-500">Live OPD staff queue console</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Delay: +{demoState.doctorDelayMinutes}m
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Active Patient Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                        {demoState.tokenNumber}
                      </span>
                      <div className="font-bold text-slate-900 text-xs mt-1">{demoState.patientName}</div>
                      <div className="text-[10px] text-slate-500">Scheduled: {demoState.selectedSlot}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        demoState.bookingStatus === 'WITH_DOCTOR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : demoState.bookingStatus === 'ARRIVED'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {demoState.bookingStatus === 'WITH_DOCTOR'
                        ? 'In Chamber'
                        : demoState.bookingStatus === 'ARRIVED'
                        ? 'Arrived (Waiting)'
                        : 'Booked (Online)'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-200">
                    <span>Expected Entry:</span>
                    <strong className="text-teal-900 font-mono">{demoState.estimatedTime}</strong>
                  </div>
                </div>

                {/* Reception Controls */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-slate-700">Staff Quick Actions:</div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDemoMarkArrived}
                      disabled={demoState.bookingStatus === 'ARRIVED' || demoState.bookingStatus === 'WITH_DOCTOR'}
                      className="p-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#0F766E] font-bold text-[11px] transition disabled:opacity-50 cursor-pointer text-center"
                    >
                      ✓ Check In Patient
                    </button>

                    <button
                      onClick={handleDemoSendIn}
                      disabled={demoState.bookingStatus === 'WITH_DOCTOR'}
                      className="p-2 rounded-xl bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-[11px] transition disabled:opacity-50 cursor-pointer text-center"
                    >
                      🚪 Call To Chamber
                    </button>
                  </div>

                  {/* Delay Injector */}
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                      <span>Doctor Late Arrival / Delay:</span>
                      <span className="font-mono text-[10px]">+{demoState.doctorDelayMinutes}m Total</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDemoAddDelay(15)}
                        className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition cursor-pointer"
                      >
                        Apply +15m Delay
                      </button>
                      <button
                        onClick={() => handleDemoAddDelay(30)}
                        className="flex-1 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] transition cursor-pointer"
                      >
                        Apply +30m Delay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* View C — Patient Queue Radar Tracker with Live Motion Graphics */}
            <div
              className={`bg-white rounded-3xl p-6 border-2 transition-all shadow-sm relative overflow-hidden ${
                demoActiveView === 'tracker' ? 'border-[#0F766E] ring-4 ring-teal-500/10' : 'border-slate-200'
              } ${demoState.doctorDelayMinutes > 0 ? 'animate-delay-shockwave ring-2 ring-amber-400/40' : ''}`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold text-xs">
                    C
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Patient Live Tracker</h3>
                    <p className="text-[10px] text-slate-500">Accessible on any smartphone</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Radar Active
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Live Radar Graphic Pulse */}
                <div className="relative py-1 flex items-center justify-center">
                  <div className="relative w-11 h-11 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                    <span className="absolute -inset-2 rounded-full bg-teal-400/20 animate-radar-wave pointer-events-none" />
                    <span className="absolute -inset-2 rounded-full bg-teal-400/10 animate-radar-wave-delayed pointer-events-none" />
                    <Radio className="w-5 h-5 text-[#0F766E] animate-pulse" />
                  </div>
                </div>

                {/* Token Box */}
                <div className="p-4 rounded-2xl bg-[#E7F7F3] border border-teal-200 text-center">
                  <div className="text-[10px] font-bold text-[#0F766E] uppercase tracking-wider">Your Token Number</div>
                  <div className="text-2xl font-black text-[#102A43] mt-0.5">{demoState.tokenNumber}</div>
                  <div className="text-[11px] font-semibold text-[#0F766E] mt-1">
                    {demoState.bookingStatus === 'WITH_DOCTOR'
                      ? 'Inside Consultation Chamber 1'
                      : `Position #${demoState.patientsAhead + 1} in queue • ${demoState.patientsAhead} Patients Ahead`}
                  </div>
                </div>

                {/* Delay Shockwave Alert Banner if delay active */}
                {demoState.doctorDelayMinutes > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Doctor Delayed by +{demoState.doctorDelayMinutes}m • Live rolling ETA adjusted</span>
                  </div>
                )}

                {/* Animated Queue Train Track Line */}
                <div className="py-0.5 px-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>Chamber</span>
                    <span className="font-mono text-emerald-600 font-bold">Waiting Room</span>
                    <span className={`font-mono font-bold ${demoState.doctorDelayMinutes > 0 ? 'text-amber-600' : 'text-teal-700'}`}>
                      {demoState.estimatedTime}
                    </span>
                  </div>
                  <div className="relative h-2 w-full">
                    <svg className="w-full h-2 overflow-visible">
                      <line
                        x1="0"
                        y1="4"
                        x2="100%"
                        y2="4"
                        stroke={demoState.doctorDelayMinutes > 0 ? '#f59e0b' : '#0F766E'}
                        strokeWidth="2.5"
                        className="animate-track-dash"
                      />
                    </svg>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated Time</span>
                    <strong className="text-base font-black text-[#102A43] font-mono block">
                      {demoState.estimatedTime}
                    </strong>
                    <span className="text-[9px] text-amber-700">
                      {demoState.doctorDelayMinutes > 0 ? `+${demoState.doctorDelayMinutes}m Doctor Delay` : 'On Schedule'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Reach Hospital By</span>
                    <strong className="text-base font-black text-emerald-700 font-mono block">
                      {demoState.bookingStatus === 'WITH_DOCTOR' ? 'In Progress' : '10:15 AM'}
                    </strong>
                    <span className="text-[9px] text-slate-500">15m arrival buffer</span>
                  </div>
                </div>

                {/* Patient status advice card */}
                <div className="p-3 rounded-xl bg-slate-900 text-white text-[11px] space-y-1">
                  <div className="text-teal-300 font-bold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Real-Time Travel Guidance</span>
                  </div>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    {demoState.bookingStatus === 'WITH_DOCTOR'
                      ? 'Your turn is actively in progress with Dr. Rajesh Varma. Arrival instructions have concluded.'
                      : demoState.doctorDelayMinutes > 0
                      ? 'Doctor is delayed by 15 mins. Please relax at home or in transit; proceed to hospital by 10:15 AM.'
                      : 'Doctor is running on schedule. Please proceed to the clinic 15 minutes before your consultation.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time OPD Motion Engine Showcase */}
      <section className="py-20 bg-gradient-to-b from-[#102A43] via-[#0d2135] to-[#102A43] text-white border-b border-slate-800 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>Real-Time Healthcare Motion Engine</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Watch The Architecture In Motion.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
              Explore how DoctorMate dynamically orchestrates instantaneous slot validation and rolling doctor delay absorption with zero waiting room congestion.
            </p>

            {/* Motion Engine Mode Switcher */}
            <div className="mt-8 inline-flex p-1 bg-slate-900/90 rounded-2xl border border-slate-700/80 gap-1 text-xs font-bold">
              <button
                onClick={() => setMotionEngineTab('slots')}
                className={`px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                  motionEngineTab === 'slots'
                    ? 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Motion Graphic: Smart Slot Engine</span>
              </button>

              <button
                onClick={() => setMotionEngineTab('delay')}
                className={`px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                  motionEngineTab === 'delay'
                    ? 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Motion Graphic: Live Queue Radar &amp; Delay Engine</span>
              </button>
            </div>
          </div>

          {/* MOTION GRAPHIC A: Smart Slot Engine */}
          {motionEngineTab === 'slots' && (
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
              {/* Laser scan line across the engine */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-1/4 h-full bg-gradient-to-r from-transparent via-teal-400/10 to-transparent skew-x-12 animate-slot-scan" />
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                {/* Left: Patient Slot Picker */}
                <div className="w-full lg:w-5/12 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-teal-400" />
                      Step 1: Patient Selects Slot
                    </span>
                    <span className="text-[10px] text-teal-400 font-mono bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
                      Laser Scan Active
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Click any slot below to watch real-time reservation, anti-collision verification, and token generation:
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'].map((slot, sIdx) => {
                      const isOccupied = slot === '09:30 AM' || slot === '11:30 AM';
                      const isSelected = engineSelectedSlot === slot;
                      return (
                        <button
                          key={sIdx}
                          disabled={isOccupied}
                          onClick={() => {
                            setEngineSelectedSlot(slot);
                            setEngineSlotBurst(true);
                            setTimeout(() => setEngineSlotBurst(false), 900);
                          }}
                          className={`relative p-2.5 rounded-xl text-center text-xs font-bold transition-all cursor-pointer overflow-hidden ${
                            isOccupied
                              ? 'bg-slate-900/40 text-slate-600 line-through border border-slate-800/60 cursor-not-allowed'
                              : isSelected
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-slate-900 text-teal-300 border border-teal-800/50 hover:bg-teal-950/80'
                          }`}
                        >
                          {isSelected && engineSlotBurst && (
                            <span className="absolute inset-0 rounded-xl bg-teal-300/40 animate-ripple-pulse pointer-events-none" />
                          )}
                          <div>{slot}</div>
                          <div className="text-[9px] mt-0.5 opacity-80">
                            {isOccupied ? 'Occupied' : isSelected ? 'Selected ✓' : 'Available'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                    <span>Target Doctor:</span>
                    <span className="font-bold text-slate-200">Dr. Rajesh Varma (Pediatrics)</span>
                  </div>
                </div>

                {/* Middle: SVG Motion Transmission Pipeline */}
                <div className="w-full lg:w-2/12 flex flex-col items-center justify-center py-2">
                  <div className="relative w-full h-12 flex items-center justify-center">
                    <svg className="w-full h-8 overflow-visible">
                      <line
                        x1="10%"
                        y1="16"
                        x2="90%"
                        y2="16"
                        stroke="#14b8a6"
                        strokeWidth="3"
                        className="animate-track-dash"
                      />
                    </svg>
                    <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50 animate-particle-stream flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-slate-950" />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                    12ms Token Pipeline
                  </span>
                </div>

                {/* Right: Hospital Database & Anti-Collision Shield */}
                <div className="w-full lg:w-5/12 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Step 2: Instant Lock &amp; Token Dispatch
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      Shield Confirmed
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-teal-800/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Locked Slot:</span>
                      <span className="font-mono font-black text-teal-300 text-sm">{engineSelectedSlot} Today</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Generated Token:</span>
                      <span className="font-mono font-bold text-emerald-300 text-xs">DM-APO-2610-{engineSelectedSlot.replace(/[^0-9]/g, '')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Double-Booking Risk:</span>
                      <span className="font-bold text-emerald-400 text-xs">0% (Mathematically Shielded)</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    DoctorMate's slot duration engine serializes parallel booking attempts at the millisecond level. The slot is locked instantly, guaranteeing zero double bookings and zero reception confusion.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MOTION GRAPHIC B: Live Queue Radar & Dynamic Delay Engine */}
          {motionEngineTab === 'delay' && (
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
              <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8">
                {/* Left Panel: Doctor Delay Controller */}
                <div className="w-full lg:w-4/12 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs mb-3">
                      <span className="font-bold text-slate-200 flex items-center gap-2">
                        <Timer className="w-4 h-4 text-amber-400" />
                        Inject Doctor Late Arrival / Delay
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        engineDelayMinutes > 0
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        +{engineDelayMinutes}m Delay
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-3">
                      Select a simulated delay to see how DoctorMate's train-ETA shockwave propagates to patients and gets absorbed downstream:
                    </p>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[0, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setEngineDelayMinutes(mins)}
                          className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer ${
                            engineDelayMinutes === mins
                              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                          }`}
                        >
                          {mins === 0 ? '0m (On Time)' : `+${mins}m Delay`}
                        </button>
                      ))}
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                      <div className="text-slate-300 font-semibold flex items-center justify-between">
                        <span>ETA Dynamic Shift:</span>
                        <span className={`font-mono font-bold ${engineDelayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {engineDelayMinutes === 0 ? '10:30 AM' : engineDelayMinutes === 15 ? '10:45 AM' : '11:00 AM'}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        {engineDelayMinutes > 0
                          ? 'Emergency delay broadcasted. Patient advised to arrive later, completely avoiding waiting room crowds!'
                          : 'Doctor running on schedule. Standard 15-minute arrival buffer active.'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400">
                    ⚡ Broadcast channel: SMS + Live Mobile Radar WebApp
                  </div>
                </div>

                {/* Right Panel: Live Radar & Queue Train Visualizer */}
                <div className="w-full lg:w-8/12 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
                      Live Queue Radar &amp; Train-ETA Track
                    </span>
                    <span className="text-[10px] text-teal-400 font-mono bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
                      Concentric Radar Active
                    </span>
                  </div>

                  {/* Visual Queue Rail Track */}
                  <div className="py-4 px-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
                      {/* Node 1: Chamber */}
                      <div className="relative bg-slate-900 p-3.5 rounded-xl border border-emerald-500/50 text-center space-y-1 overflow-hidden">
                        <div className="relative w-8 h-8 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-radar-wave pointer-events-none" />
                          <Activity className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-[11px] font-bold text-emerald-300">Chamber 1</div>
                        <div className="text-[10px] text-slate-400">Dr. Rajesh Varma</div>
                        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          In Session
                        </span>
                      </div>

                      {/* Node 2: Patient Ahead */}
                      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-center space-y-1">
                        <div className="w-8 h-8 mx-auto rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                          #1
                        </div>
                        <div className="text-[11px] font-bold text-slate-200">Aarav Patel</div>
                        <div className="text-[10px] text-slate-400">In Waiting Area</div>
                        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          Next Turn
                        </span>
                      </div>

                      {/* Node 3: Current Patient (You) with Delay Shift */}
                      <div className={`p-3.5 rounded-xl text-center space-y-1 transition-all ${
                        engineDelayMinutes > 0
                          ? 'bg-amber-950/60 border border-amber-500/80 animate-delay-shockwave'
                          : 'bg-teal-950/60 border border-teal-500/80 ring-2 ring-teal-400/40'
                      }`}>
                        <div className="relative w-8 h-8 mx-auto rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                          {engineDelayMinutes > 0 && (
                            <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-radar-wave pointer-events-none" />
                          )}
                          You
                        </div>
                        <div className="text-[11px] font-bold text-white">Kavya Sharma</div>
                        <div className="text-[10px] font-mono font-bold text-teal-300">
                          {engineDelayMinutes === 0 ? 'ETA: 10:30 AM' : engineDelayMinutes === 15 ? 'ETA: 10:45 AM' : 'ETA: 11:00 AM'}
                        </div>
                        <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          engineDelayMinutes > 0
                            ? 'bg-amber-900/60 text-amber-200 border-amber-600'
                            : 'bg-teal-900/60 text-teal-200 border-teal-600'
                        }`}>
                          {engineDelayMinutes > 0 ? `+${engineDelayMinutes}m Shockwave` : 'On Track'}
                        </span>
                      </div>

                      {/* Node 4: Downstream Buffer Absorption Zone */}
                      <div className="bg-slate-900 p-3.5 rounded-xl border border-teal-800/40 text-center space-y-1">
                        <div className="w-8 h-8 mx-auto rounded-full bg-teal-950 text-teal-400 flex items-center justify-center font-bold text-xs border border-teal-800">
                          <Gauge className="w-4 h-4" />
                        </div>
                        <div className="text-[11px] font-bold text-teal-300">Buffer Zone</div>
                        <div className="text-[10px] text-slate-400">20 min/hr Buffer</div>
                        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {engineDelayMinutes > 0 ? 'Absorbing Delay' : 'Clear Reserve'}
                        </span>
                      </div>
                    </div>

                    {/* SVG Connector Line */}
                    <div className="relative h-2 w-full my-3">
                      <svg className="w-full h-2 overflow-visible">
                        <line
                          x1="5%"
                          y1="4"
                          x2="95%"
                          y2="4"
                          stroke={engineDelayMinutes > 0 ? '#f59e0b' : '#14b8a6'}
                          strokeWidth="3"
                          className="animate-track-dash"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Mathematical Benefit Explanation */}
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                      <span className="text-slate-300">
                        <strong>Downstream Cascade Prevention:</strong> Buffer absorption eliminates 100% of afternoon delay spillover.
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-teal-400 shrink-0 font-bold">
                      Zero Waiting Room Congestion ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Doctor & Reception Dashboard Showcase — Tabbed Product Interface */}
      <section id="features" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Role-Specific Consoles
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              One Dashboard. Complete Control of Your OPD.
            </h2>
            <p className="text-base text-[#64748B] mt-4 leading-relaxed">
              Every hospital role gets a purpose-built workspace: receptionists manage daily queue flow, doctors view triage vitals &amp; consultations, and hospital owners oversee multi-doctor schedules.
            </p>

            {/* Showcase Role Switcher */}
            <div className="mt-8 inline-flex p-1 bg-slate-100 rounded-2xl gap-1 border border-slate-200">
              <button
                onClick={() => setShowcaseTab('reception')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                  showcaseTab === 'reception'
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Reception Desk View</span>
              </button>

              <button
                onClick={() => setShowcaseTab('doctor')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                  showcaseTab === 'doctor'
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor Chamber View</span>
              </button>

              <button
                onClick={() => setShowcaseTab('patient')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                  showcaseTab === 'patient'
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Hospital Admin View</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="bg-[#102A43] p-4 sm:p-7 rounded-3xl shadow-2xl border border-slate-800 text-white">
            {showcaseTab === 'reception' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-teal-400" />
                      <span>Reception Desk Console — Live OPD Workflow</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      One screen replaces all physical registers, phone appointment notebooks, and paper queue tokens.
                    </p>
                  </div>
                  <button
                    onClick={onGoToReceptionDemo}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch Live Reception Demo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-teal-400" />
                      <span>15-Second Phone Booking</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Enter caller mobile, patient name, and desired doctor. The system automatically reserves the next available slot and sends a unique SMS tracker link.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-teal-400" />
                      <span>Arrival Triage &amp; Payment</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      One-click arrival check-in records Cash or PhonePe/UPI payment, optional triage height/weight/temperature vitals, and unlocks queue progression.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-400" />
                      <span>No-Show Slot Auto-Release</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      If an online patient fails to arrive within the grace period, reception can release the slot with one click to accommodate walk-in patients immediately.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showcaseTab === 'doctor' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-teal-400" />
                      <span>Doctor Chamber Console — Focused Consultations</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Designed for fast clinical flow: view waiting patients, caller tokens, and triage parameters without desk clutter.
                    </p>
                  </div>
                  <span className="px-3 py-1.5 bg-slate-800 rounded-xl text-teal-300 text-xs font-mono font-bold">
                    Doctor Chamber Mode Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-400" />
                      <span>Single-Click Patient Call</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Call the next arrived patient into the chamber. DoctorMate prevents concurrent consultations and updates waiting lobby screens instantly.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-teal-400" />
                      <span>Triage Vitals at a Glance</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Review blood pressure, temperature, pulse rate, pediatric BMI, and growth parameters pre-entered by nursing staff during arrival.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-400" />
                      <span>Overrun Delay Recalculation</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      When a complicated consultation extends past the expected duration, downstream waiting patient ETAs adjust dynamically without manual math.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showcaseTab === 'patient' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-teal-400" />
                      <span>Hospital Administrator Dashboard — Multi-Doctor Scheduling</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure your hospital profile, manage department rosters, set slot durations, and access multi-tenant analytics.
                    </p>
                  </div>
                  <button
                    onClick={onGoToAdminDemo}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch Admin Demo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-teal-400" />
                      <span>Custom Hospital Booking Slug</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Instant dedicated link (e.g. <code>/hospital/apex-hospital</code>) to share on Google Maps, social media, and WhatsApp for patient bookings.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-400" />
                      <span>Doctor Rosters &amp; Timing Slots</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Easily configure available days of the week, consultation start and end times, and custom slot durations (10m, 15m, 20m, 30m) per doctor.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span>Reception Staff Access Control</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Issue secure staff credentials for receptionists with role-based restrictions, protecting sensitive patient history and billing summaries.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Patient Journey Section — 4 Interactive Steps */}
      <section id="how-it-works" className="py-20 bg-[#F8FBFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Seamless Patient Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              Better Appointments for Patients. Less Pressure on Your Team.
            </h2>
            <p className="text-base text-[#64748B] mt-4 leading-relaxed">
              When patients know their exact token number, position in line, and proactive delay updates, waiting rooms stay empty and consultations run on time.
            </p>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
            {[
              { num: 1, title: 'Find Doctor', desc: 'Choose hospital specialty' },
              { num: 2, title: 'Select Slot', desc: 'Pick 15-minute slot' },
              { num: 3, title: 'Track Live', desc: 'Monitor queue from home' },
              { num: 4, title: 'Arrive Punctual', desc: '15m buffer consultation' },
            ].map((step) => {
              const isActive = journeyStep === step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setJourneyStep(step.num)}
                  className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white border-[#0F766E] shadow-md ring-2 ring-teal-500/10'
                      : 'bg-white/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-[#0F766E] text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {step.num}
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{step.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">{step.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Active Step Visual Showcase */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm max-w-4xl mx-auto">
            {journeyStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">Step 1 — Discovery</span>
                  <h3 className="text-2xl font-black text-[#102A43]">
                    Find the Hospital and Choose a Doctor
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Patients open your hospital's direct booking link on their smartphone or computer. They browse available doctors, qualifications, consultation fees, and schedule timings with zero app download required.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Works instantly on WhatsApp, Instagram Bio, Google Maps &amp; Web</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                      DR
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Dr. Vivek Sharma</div>
                      <div className="text-[11px] text-teal-700">Senior Consultant • Pediatrics</div>
                      <div className="text-[10px] text-slate-400">Available: Mon - Sat (09:00 - 17:00)</div>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">Consultation Particulars</div>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Consultation Fee:</span>
                      <strong className="text-slate-900 font-mono">₹500</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {journeyStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">Step 2 — Slot Booking</span>
                  <h3 className="text-2xl font-black text-[#102A43]">
                    Select an Available Appointment Slot
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Patients view live, real-time availability. Occupied slots are strictly disabled to prevent double-booking. Once selected, an instant structured booking token is created with clear instructions.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Strict double-booking lock across online, phone, and walk-in</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
                  <div className="font-bold text-slate-800">Select Consultation Time:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="p-2 rounded bg-slate-100 text-slate-400 line-through text-center">10:00</span>
                    <span className="p-2 rounded bg-slate-100 text-slate-400 line-through text-center">10:15</span>
                    <span className="p-2 rounded bg-teal-600 text-white font-bold text-center shadow-xs">10:30 ✓</span>
                    <span className="p-2 rounded bg-white border border-slate-300 text-slate-700 text-center">10:45</span>
                    <span className="p-2 rounded bg-white border border-slate-300 text-slate-700 text-center">11:00</span>
                    <span className="p-2 rounded bg-white border border-slate-300 text-slate-700 text-center">11:15</span>
                  </div>
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
                    ✓ Confirmed Token: <strong>DM-APO-2610-1030</strong>
                  </div>
                </div>
              </div>
            )}

            {journeyStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">Step 3 — Queue Radar</span>
                  <h3 className="text-2xl font-black text-[#102A43]">
                    Track Appointment &amp; Queue Status
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Patients don't need to guess where the doctor is. With our Live Radar, they check their exact position in queue from home, office, or in transit with two-factor privacy protection.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Real-time rolling train-ETA model adapts as consultations conclude</span>
                  </div>
                </div>

                <div className="p-4 bg-[#102A43] text-white rounded-2xl text-xs space-y-3">
                  <div className="flex justify-between items-center text-teal-300 font-mono text-[11px]">
                    <span>TOKEN #DM-APO-1030</span>
                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">2 Patients Ahead</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl space-y-1">
                    <div className="text-slate-400 text-[10px]">CURRENT CONSULTATION CHAMBER</div>
                    <div className="font-bold text-emerald-400 text-sm">Chamber 1 Active — Token #DM-1001</div>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Estimated Consultation Time:</span>
                    <strong className="text-white font-mono">10:30 AM</strong>
                  </div>
                </div>
              </div>
            )}

            {journeyStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">Step 4 — Punctual Arrival</span>
                  <h3 className="text-2xl font-black text-[#102A43]">
                    Receive Delay Updates and Arrive on Time
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    If doctor is delayed, the system sends an automated delay broadcast and recalculates the arrival advice. Patients arrive right on time, preventing crowded lobbies and anxious waiting.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Zero crowding: patients walk in 15 mins before chamber call</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Seamless Consultation Call</span>
                  </div>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    Patient arrives at the hospital, presents their token QR/ID to reception, completes triage check-in in 10 seconds, and enters the consultation chamber directly.
                  </p>
                  <div className="p-2 bg-white rounded-lg border border-emerald-200 font-mono text-[10px] text-center font-bold text-emerald-900">
                    Status: Inside Consultation Chamber ✓
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Hospital Setup Section — 4 Onboarding Stages */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Rapid Deployment
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              Your Hospital Can Go Digital in Just a Few Steps.
            </h2>
            <p className="text-base text-[#64748B] mt-4 leading-relaxed">
              No software engineers, no database servers, and no lengthy training. Complete our step-by-step onboarding wizard and start accepting appointments today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-black text-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Register Your Hospital</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your hospital or clinic name, city, specialty, and choose your unique web address slug.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Add Doctors &amp; Timings</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add consultant profiles, consultation fees, working days, and slot duration (e.g. 15 or 30 mins).
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-black text-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Configure Reception Access</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Set up username &amp; password for your front desk staff to operate the live queue and phone bookings.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#14B8A6] text-white flex items-center justify-center font-black text-sm">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base">Share Your Booking Link</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add your link to your website, Google Maps profile, and WhatsApp. Patients begin booking immediately!
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={onOpenRegister}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-teal-800 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-900/15 transition transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Start Free Hospital Setup Wizard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Hospital-Specific Booking Links Section */}
      <section className="py-20 bg-[#F8FBFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
                Custom Branded Destination
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] tracking-tight leading-tight">
                Your Hospital. Your Own Booking Experience.
              </h2>
              <p className="text-base text-[#64748B] leading-relaxed">
                Every registered clinic and hospital receives an exclusive, branded online booking page. Share this single URL across all patient touchpoints:
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                  <Globe className="w-4 h-4 text-[#0F766E]" />
                  <span>Hospital Website Button</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                  <Share2 className="w-4 h-4 text-[#0F766E]" />
                  <span>Instagram &amp; Social Bio</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                  <Phone className="w-4 h-4 text-[#0F766E]" />
                  <span>WhatsApp Greeting &amp; QR</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                  <MapPin className="w-4 h-4 text-[#0F766E]" />
                  <span>Google Business Profile</span>
                </div>
              </div>

              {/* Interactive Copy Link Widget */}
              <div className="p-4 bg-white rounded-2xl border border-slate-300 space-y-2 shadow-xs">
                <div className="text-[11px] font-bold text-slate-600">Sample Hospital Booking URL:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://doctormate.in'}/hospital/apex-hospital`}
                    className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
                  />
                  <button
                    onClick={handleCopySampleLink}
                    className="px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Mockup Preview */}
            <div className="bg-[#102A43] p-6 rounded-3xl shadow-xl border border-slate-800 max-w-sm mx-auto w-full text-white space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span className="font-bold text-teal-400">Apex Multi-Specialty Hospital</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">Live View</span>
              </div>

              <div className="bg-white rounded-2xl p-4 text-slate-800 space-y-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                    🏥
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Apex Multi-Specialty Hospital</div>
                    <div className="text-[10px] text-slate-500">Beach Road, Visakhapatnam</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200/80">
                  <div className="text-[10px] font-bold text-[#0F766E] uppercase">Select Specialization</div>
                  <div className="font-bold text-slate-900 mt-0.5">Pediatric Care &amp; General OPD</div>
                </div>

                <button
                  onClick={() => onSelectHospital('apex-hospital')}
                  className="w-full py-2.5 bg-[#0F766E] hover:bg-teal-800 text-white font-bold rounded-xl text-center shadow-xs transition cursor-pointer"
                >
                  Book Appointment Now →
                </button>
              </div>

              <div className="text-center text-[11px] text-slate-400">
                Patients book in 3 clicks with zero account friction.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase — Commercial Highlights */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Enterprise Grade
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              Engineered for Modern Healthcare Reliability
            </h2>
            <p className="text-base text-[#64748B] mt-4 leading-relaxed">
              Every detail is designed to solve real-world OPD edge cases: doctor overruns, emergency interruptions, walk-in priority, and strict patient privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Dynamic Rolling Train-ETA</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Near-term appointments absorb delay dynamically; downstream consultations beyond 90 minutes gradually catch up through configured buffer absorption.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Emergency Buffer Priority</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Insert critical trauma cases immediately without disrupting scheduled appointments. Built-in 20m buffer capacity protects scheduled slot timings.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No-Show Capacity Release</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatic detection of unattended slots releases booking capacity for same-day walk-ins while tracking repeat offenders to prevent slot hoarding.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                <Database className="w-5 h-5 text-sky-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Strict Tenant Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each hospital's patient records, schedules, revenue summaries, and staff logins are strictly isolated and protected from cross-tenant access.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Two-Factor Tracker Security</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live queue status requires token and matching patient mobile digits, protecting patient identity and health information from unauthorized access.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FBFC] border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Telephone Booking Sync</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reception desk takes phone bookings while preventing double-bookings with online visitors simultaneously in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Directory of Live Hospitals on Network — Minimal Scrolling Showcase */}
      <section id="hospitals-directory" className="py-14 bg-gradient-to-b from-[#F8FBFC] via-white to-[#F8FBFC] border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7F7F3] border border-teal-200 text-[#0F766E] text-xs font-extrabold uppercase tracking-wider mb-2">
                <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Active Medical Centers</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#102A43] tracking-tight">
                Hospitals Powered by DoctorMate
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Premier healthcare centers running DoctorMate smart OPD scheduling &amp; zero-wait queue radar.
              </p>
            </div>

            {/* Scrolling Showcase Controls */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-[11px] font-medium text-slate-500 hidden md:inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hover to pause • Smooth auto-scroll
              </span>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => scrollHospitals('left')}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs border border-slate-200 transition cursor-pointer"
                  title="Scroll Left"
                  aria-label="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollHospitals('right')}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs border border-slate-200 transition cursor-pointer"
                  title="Scroll Right"
                  aria-label="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Scrolling Marquee / Carousel Container */}
        <div
          ref={hospitalScrollRef}
          className="relative w-full overflow-x-auto scrollbar-none py-2 px-4 select-none"
          style={{ scrollBehavior: 'smooth' }}
        >
          {loadingHospitals ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F766E]" />
              <span>Loading partner hospitals...</span>
            </div>
          ) : (
            <div className="animate-marquee-scroll flex gap-4 w-max items-center">
              {marqueeHospitals.map((hosp, idx) => (
                <div
                  key={`${hosp.id}-${idx}`}
                  className="w-[280px] sm:w-[320px] shrink-0 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#0F766E] hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition">
                      🏥
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Smart OPD
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm truncate" title={hosp.name}>
                      {hosp.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{hosp.city}, {hosp.state}</span>
                    </p>
                    <p className="text-[11px] text-[#0F766E] font-medium mt-1 truncate">
                      {hosp.hospitalType || 'Specialty Medical Center'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      /hospital/{hosp.slug}
                    </span>
                    <button
                      onClick={() => onSelectHospital(hosp.slug)}
                      className="px-3 py-1 rounded-lg bg-teal-50 hover:bg-[#0F766E] text-[#0F766E] hover:text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      Book OPD →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section — Simple Plans for Clinics & Hospitals */}
      <section id="pricing" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Clear &amp; Predictable
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              Simple Plans for Clinics and Hospitals.
            </h2>
            <p className="text-base text-[#64748B] mt-4 leading-relaxed">
              Every plan includes turnkey cloud hosting, receptionist dashboard, doctor delay broadcasts, and live queue radar with zero hardware setup.
            </p>

            {/* Billing Interval Switcher */}
            <div className="mt-8 inline-flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                  billingInterval === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  billingInterval === 'annual' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded font-black">
                  2 Months Free
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
            {/* Plan 1: Single Doctor Clinic */}
            <div className="p-8 rounded-3xl bg-[#F8FBFC] border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Single Clinic</h3>
                  <p className="text-xs text-slate-500 mt-1">For independent pediatricians and specialist clinics</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#102A43]">
                    {billingInterval === 'monthly' ? '₹1,499' : '₹1,249'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 2 Doctor Schedules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited Online Patient Bookings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reception Console (Walk-in &amp; Phone)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Live Queue Radar for Patients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated Hospital Booking Link</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenRegister}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Register Clinic
              </button>
            </div>

            {/* Plan 2: Multi-Specialty Hospital (Featured) */}
            <div className="p-8 rounded-3xl bg-[#102A43] text-white border-2 border-teal-400 shadow-xl flex flex-col justify-between space-y-6 relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                Most Popular for Hospitals
              </span>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-white text-lg">Multi-Specialty Hospital</h3>
                  <p className="text-xs text-slate-300 mt-1">Full OPD automation for hospitals and nursing homes</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">
                    {billingInterval === 'monthly' ? '₹3,999' : '₹3,299'}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">/ month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 10 Doctor Schedules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Consultations &amp; Patients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Triage Vitals Check-in (Height/Weight/BMI)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>One-Click Doctor Delay Broadcasts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Emergency Priority Buffer Capacity</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-Staff Reception Logins</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenRegister}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-teal-600 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-900/40 transition cursor-pointer"
              >
                Register Your Hospital Now
              </button>
            </div>

            {/* Plan 3: Hospital Network / Enterprise */}
            <div className="p-8 rounded-3xl bg-[#F8FBFC] border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Hospital Network</h3>
                  <p className="text-xs text-slate-500 mt-1">Multi-branch hospital chains and medical centers</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#102A43]">Custom</span>
                  <span className="text-xs text-slate-500 font-medium">/ enterprise quote</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited Doctors &amp; Branches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom EHR &amp; Pharmacy Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated Account Success Manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>99.9% Uptime SLA Guarantee</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>On-Premise or Private Cloud Option</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenRegister}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Request Enterprise Quote
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust, Security & Frequently Asked Questions */}
      <section id="faqs" className="py-20 bg-[#F8FBFC] border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#E7F7F3] px-3 py-1 rounded-full border border-teal-200">
              Clear &amp; Transparent
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A43] mt-3 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-[#64748B] mt-3">
              Everything hospital owners and doctors ask when adopting DoctorMate.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How long does it take to onboard our hospital or clinic?',
                a: 'Less than 5 minutes. You register your hospital name, add your doctors with their daily consultation hours, create your reception desk credentials, and your branded booking page is live immediately. No technical expertise or coding is required.',
              },
              {
                q: 'Do patients need to download an application from the app store?',
                a: 'No app download is required. DoctorMate runs as an ultra-fast web application that opens instantly on any smartphone (iOS or Android), tablet, or desktop computer via your hospital’s direct link.',
              },
              {
                q: 'Can our reception team still take in-person walk-ins and phone bookings?',
                a: 'Yes! DoctorMate includes a dedicated Reception Console. Front-desk staff can book phone callers in 15 seconds, register walk-in patients, collect Cash or PhonePe/UPI payments, record triage vitals, and issue token numbers effortlessly.',
              },
              {
                q: 'What happens when a doctor gets delayed by emergency or traffic?',
                a: 'The receptionist selects "+15 Mins" or "+30 Mins" delay on the dashboard. Our rolling train-ETA algorithm immediately recalculates the expected consultation time for all downstream patients and updates their live mobile radar.',
              },
              {
                q: 'Is patient data kept isolated and secure?',
                a: 'Yes. DoctorMate is built on enterprise multi-tenant architecture. Every hospital has strict tenant isolation. Patients can only access queue tracking via two-factor verification with their registered mobile number.',
              },
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left font-bold text-slate-900 text-sm flex items-center justify-between gap-4 cursor-pointer hover:text-[#0F766E]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-[#0F766E]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Conversion Section */}
      <section className="py-20 bg-gradient-to-br from-[#102A43] via-[#0F766E] to-[#102A43] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.15),transparent_70%)] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest bg-teal-400/20 text-teal-300 px-3 py-1 rounded-full border border-teal-400/30 mb-6 inline-block">
            Modernize Your OPD Today
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto mb-6">
            Your Hospital Deserves a Smarter Way to Manage Appointments.
          </h2>

          <p className="text-base sm:text-lg text-teal-100/90 font-normal max-w-2xl mx-auto mb-10 leading-relaxed">
            Bring appointment booking, patient queue tracking, and reception operations together with DoctorMate. Set up your hospital in under five minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-[#102A43] font-black text-sm shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-[#0F766E]" />
              <span>Register Your Hospital</span>
            </button>

            <button
              onClick={() => handleNavClick('live-demo')}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-teal-800/60 hover:bg-teal-800 text-white border border-teal-400/40 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-300" />
              <span>Experience Live Demo</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-teal-200/80 font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No setup fee
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ready in 5 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Powered by eazy learnings
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#102A43] text-slate-300 border-t border-slate-800 text-xs py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-white">DoctorMate.</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart Hospital Appointment &amp; Patient Queue Management Platform. Powered by eazy learnings.
              </p>
              <div className="text-[11px] text-teal-400 font-semibold">
                Multi-Tenant Healthcare SaaS
              </div>
            </div>

            {/* Product Links */}
            <div className="space-y-2">
              <div className="font-bold text-white text-xs uppercase tracking-wider">Product</div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>
                  <button onClick={() => handleNavClick('features')} className="hover:text-teal-400 cursor-pointer">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavClick('how-it-works')} className="hover:text-teal-400 cursor-pointer">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavClick('live-demo')} className="hover:text-teal-400 cursor-pointer">
                    Interactive Demo
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavClick('pricing')} className="hover:text-teal-400 cursor-pointer">
                    Pricing Plans
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavClick('hospitals-directory')} className="hover:text-teal-400 cursor-pointer">
                    Hospital Directory
                  </button>
                </li>
              </ul>
            </div>

            {/* Portal Access */}
            <div className="space-y-2">
              <div className="font-bold text-white text-xs uppercase tracking-wider">Hospital Access</div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>
                  <button onClick={onOpenRegister} className="hover:text-teal-400 cursor-pointer">
                    Hospital Registration
                  </button>
                </li>
                <li>
                  <button onClick={onOpenLogin} className="hover:text-teal-400 cursor-pointer">
                    Hospital Admin Login
                  </button>
                </li>
                <li>
                  <button onClick={onGoToReceptionDemo} className="hover:text-teal-400 cursor-pointer">
                    Reception Console Demo
                  </button>
                </li>
                <li>
                  <button onClick={() => onOpenTracker()} className="hover:text-teal-400 cursor-pointer">
                    Patient Live Radar
                  </button>
                </li>
              </ul>
            </div>

            {/* Trust & Company */}
            <div className="space-y-2">
              <div className="font-bold text-white text-xs uppercase tracking-wider">Security &amp; Legal</div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tenant Data Isolation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-400" />
                  <span>2FA Queue Verification</span>
                </li>
                <li>
                  <span className="text-slate-500">Privacy Policy (Compliant)</span>
                </li>
                <li>
                  <span className="text-slate-500">Terms of Service</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <div>
              © 2026 DoctorMate. All rights reserved. Powered by <strong className="text-slate-300">eazy learnings</strong>.
            </div>
            <div className="flex items-center gap-4">
              <span>Smart Hospital Appointment &amp; Queue Management</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
