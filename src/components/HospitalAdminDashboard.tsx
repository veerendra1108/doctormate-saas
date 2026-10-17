import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  Calendar,
  Clock,
  Shield,
  Plus,
  Copy,
  ExternalLink,
  RefreshCw,
  LogOut,
  AlertCircle,
  TrendingUp,
  UserCheck,
  CheckCircle,
  PhoneCall,
  Search,
  Pencil,
  Coffee,
} from 'lucide-react';
import { Hospital, Doctor, HospitalAdminUser, Appointment, DoctorSchedule } from '../types/index.js';

interface HospitalAdminDashboardProps {
  hospitalId: string;
  adminUser?: HospitalAdminUser;
  adminName?: string;
  onLogout: () => void;
  onNavigateToBooking?: (slug: string) => void;
  onOpenBookingPreview?: (slug: string) => void;
  onLaunchOnboarding?: (hosp: Hospital) => void;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export const HospitalAdminDashboard: React.FC<HospitalAdminDashboardProps> = ({
  hospitalId,
  adminUser,
  adminName,
  onLogout,
  onNavigateToBooking,
  onOpenBookingPreview,
  onLaunchOnboarding,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    hospital: Hospital;
    bookingUrl: string;
    doctors: (Doctor & { schedule?: DoctorSchedule })[];
    receptionists: any[];
    stats: {
      totalDoctors: number;
      totalAppointmentsToday: number;
      onlineBookingsToday: number;
      phoneBookingsToday: number;
      completedToday: number;
      waitingToday: number;
    };
    todayAppointments: Appointment[];
  } | null>(null);

  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<(Doctor & { schedule?: DoctorSchedule }) | null>(null);
  const [isAddReceptionistOpen, setIsAddReceptionistOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // New Doctor Form State with schedule
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: 'Specialist',
    qualifications: 'MBBS, MD',
    experienceYears: 5,
    slotDurationMinutes: 15,
    consultationFee: 500,
    startTime: '09:00',
    endTime: '17:00',
    availableDays: [1, 2, 3, 4, 5, 6],
    bufferMinutesPerHour: 10,
    mobile: '',
    email: '',
  });

  // Edit Doctor Form State
  const [editDoctorForm, setEditDoctorForm] = useState({
    name: '',
    specialty: '',
    qualifications: '',
    experienceYears: 5,
    slotDurationMinutes: 15,
    consultationFee: 500,
    startTime: '09:00',
    endTime: '17:00',
    availableDays: [1, 2, 3, 4, 5, 6],
    bufferMinutesPerHour: 10,
  });

  // New Receptionist Form State
  const [newReceptionist, setNewReceptionist] = useState({
    name: '',
    username: '',
    password: '',
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hospital-admin/${hospitalId}/dashboard`);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to load dashboard.');
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Error loading hospital dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [hospitalId]);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDoctor.startTime >= newDoctor.endTime) {
      alert('OPD start time must be earlier than end time.');
      return;
    }
    try {
      const res = await fetch(`/api/hospital-admin/${hospitalId}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoctor),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to add doctor.');
      setIsAddDoctorOpen(false);
      setNewDoctor({
        name: '',
        specialty: 'Specialist',
        qualifications: 'MBBS, MD',
        experienceYears: 5,
        slotDurationMinutes: 15,
        consultationFee: 500,
        startTime: '09:00',
        endTime: '17:00',
        availableDays: [1, 2, 3, 4, 5, 6],
        bufferMinutesPerHour: 10,
        mobile: '',
        email: '',
      });
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEditDoctor = (doc: Doctor & { schedule?: DoctorSchedule }) => {
    setEditingDoctor(doc);
    const sch = doc.schedule;
    setEditDoctorForm({
      name: doc.name,
      specialty: doc.specialty || '',
      qualifications: doc.qualifications || '',
      experienceYears: doc.experienceYears || 5,
      slotDurationMinutes: doc.slotDurationMinutes || sch?.slotDurationMinutes || 15,
      consultationFee: doc.consultationFee || 500,
      startTime: sch?.startTime || '09:00',
      endTime: sch?.endTime || '17:00',
      availableDays: doc.availableDays || sch?.daysOfWeek || [1, 2, 3, 4, 5, 6],
      bufferMinutesPerHour: sch?.bufferMinutesPerHour !== undefined ? sch.bufferMinutesPerHour : 10,
    });
    setIsEditDoctorOpen(true);
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    if (editDoctorForm.startTime >= editDoctorForm.endTime) {
      alert('OPD start time must be earlier than end time.');
      return;
    }
    try {
      const res = await fetch(`/api/hospital-admin/${hospitalId}/doctors/${editingDoctor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDoctorForm),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update doctor.');
      setIsEditDoctorOpen(false);
      setEditingDoctor(null);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateReceptionist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/hospital-admin/${hospitalId}/receptionists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceptionist),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to add receptionist.');
      setIsAddReceptionistOpen(false);
      setNewReceptionist({ name: '', username: '', password: '' });
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleDay = (
    currentDays: number[],
    dayId: number,
    setter: (days: number[]) => void
  ) => {
    if (currentDays.includes(dayId)) {
      if (currentDays.length === 1) return; // Must have at least 1 day
      setter(currentDays.filter((d) => d !== dayId));
    } else {
      setter([...currentDays, dayId].sort((a, b) => a - b));
    }
  };

  const formatDays = (days?: number[]) => {
    if (!days || days.length === 0) return 'All Days';
    if (days.length === 7) return 'All 7 Days (Mon-Sun)';
    if (days.length === 6 && !days.includes(0)) return 'Mon - Sat';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Mon - Fri';
    const dayNames: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    return days.map((d) => dayNames[d] || `${d}`).join(', ');
  };

  const fullBookingUrl = data ? `${window.location.origin}/hospital/${data.hospital.slug}` : '';

  const copyBookingLink = () => {
    if (fullBookingUrl) {
      navigator.clipboard.writeText(fullBookingUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading hospital administrative console...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-3xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-900">Failed to Load Hospital Admin</h3>
        <p className="text-sm text-red-700">{error || 'Could not retrieve hospital information.'}</p>
        <button
          onClick={fetchDashboardData}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Top Banner / Hospital Identity Header */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-teal-500/20 text-teal-200 rounded-full text-xs font-bold uppercase tracking-wider border border-teal-400/30">
              Hospital Portal
            </span>
            <span className="text-xs text-teal-300">
              ID: <span className="font-mono text-white font-bold">{data.hospital.id}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {data.hospital.name}
          </h1>
          <p className="text-sm text-teal-100/80 flex items-center gap-2">
            <span>{data.hospital.city}, {data.hospital.state}</span>
            <span>•</span>
            <span>Administrator: <strong>{adminUser?.name || adminName || data.hospital.adminName || 'Hospital Admin'}</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyBookingLink}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-all text-white backdrop-blur-sm"
          >
            {copiedUrl ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedUrl ? 'Copied Link!' : 'Copy Booking Link'}</span>
          </button>

          {onOpenBookingPreview && (
            <button
              onClick={() => onOpenBookingPreview(data.hospital.slug)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Preview Public Page</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Quick Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Today's Patients
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {data.stats.totalAppointmentsToday}
          </div>
          <span className="text-xs text-slate-500 font-medium">All OPD bookings</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            Online Bookings
          </span>
          <div className="text-3xl font-black text-teal-700 mt-1">
            {data.stats.onlineBookingsToday}
          </div>
          <span className="text-xs text-teal-600 font-medium">Patient portal / mobile</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Phone / Desk
          </span>
          <div className="text-3xl font-black text-indigo-700 mt-1">
            {data.stats.phoneBookingsToday}
          </div>
          <span className="text-xs text-indigo-600 font-medium">Reception telephone</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Active Doctors
          </span>
          <div className="text-3xl font-black text-emerald-700 mt-1">{data.doctors.length}</div>
          <span className="text-xs text-emerald-600 font-medium">Configured OPD schedules</span>
        </div>
      </div>

      {/* Doctors & Schedule Administration Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Hospital Consultation Doctors</h3>
            <p className="text-xs text-slate-500">
              Manage doctor profiles, OPD working hours, working days, break buffers, and slot duration intervals.
            </p>
          </div>
          <button
            id="admin-add-doctor-btn"
            onClick={() => setIsAddDoctorOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.doctors.map((doc) => {
            const sch = doc.schedule;
            const startTime = sch?.startTime || '09:00';
            const endTime = sch?.endTime || '17:00';
            const buffer = sch?.bufferMinutesPerHour !== undefined ? sch.bufferMinutesPerHour : 10;
            const days = doc.availableDays || sch?.daysOfWeek || [1, 2, 3, 4, 5, 6];

            return (
              <div
                key={doc.id}
                id={`doc-card-${doc.id}`}
                className="p-5 rounded-2xl border border-slate-200 hover:border-teal-400 transition-all bg-slate-50/50 space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4
                        onClick={() => handleOpenEditDoctor(doc)}
                        className="font-bold text-slate-900 text-base cursor-pointer hover:text-teal-700 transition flex items-center gap-1.5 group"
                        title="Click to edit doctor and schedule"
                      >
                        <span>{doc.name}</span>
                        <Pencil className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition" />
                      </h4>
                      <p className="text-xs text-teal-700 font-semibold">{doc.specialty}</p>
                      <p className="text-xs text-slate-400">{doc.qualifications}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-100 whitespace-nowrap">
                      ₹{doc.consultationFee || 500}
                    </span>
                  </div>

                  {/* Schedule Details */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>
                        OPD Hours: <strong className="text-slate-800">{startTime} - {endTime}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">
                        Days: <strong className="text-slate-800">{formatDays(days)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Break / Buffer: <strong className="text-slate-800">{buffer} mins / hr</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Slot Duration:</span>
                    <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 text-xs">
                      {doc.slotDurationMinutes || sch?.slotDurationMinutes || 15} Minutes / Slot
                    </span>
                  </div>

                  <button
                    id={`edit-doctor-${doc.id}`}
                    onClick={() => handleOpenEditDoctor(doc)}
                    className="w-full py-2 px-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Doctor &amp; Schedule</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reception Staff Accounts Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Receptionist Accounts</h3>
            <p className="text-xs text-slate-500">
              Staff authorized to operate telephone booking and live queue check-ins for this hospital.
            </p>
          </div>
          <button
            id="admin-add-receptionist-btn"
            onClick={() => setIsAddReceptionistOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Receptionist</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.receptionists.map((rec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold text-slate-800 text-sm">{rec.name}</p>
                <p className="text-slate-500 mt-0.5">
                  Username: <span className="font-mono text-teal-700 font-bold">{rec.username}</span>
                </p>
              </div>
              <span className="px-2 py-1 bg-teal-100/60 text-teal-800 font-bold rounded text-[11px]">
                Authorized
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add Doctor with Full Schedule Controls (DM-R3-002) */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Add New Doctor to Hospital</h3>
            <form onSubmit={handleCreateDoctor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Nair"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiologist"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MBBS, DM"
                    value={newDoctor.qualifications}
                    onChange={(e) => setNewDoctor({ ...newDoctor, qualifications: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Consultation Slot Duration */}
              <div>
                <label className="block text-xs font-bold text-teal-800 mb-1">
                  Consultation Slot Duration
                </label>
                <select
                  value={newDoctor.slotDurationMinutes}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, slotDurationMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-teal-300 bg-teal-50 text-sm font-bold text-teal-900"
                >
                  <option value={5}>5 Minutes (Rapid / Triage / ENT)</option>
                  <option value={10}>10 Minutes (Standard Consultation)</option>
                  <option value={15}>15 Minutes (Comprehensive)</option>
                  <option value={20}>20 Minutes (Pediatric / Chronic)</option>
                  <option value={30}>30 Minutes (Detailed Specialist)</option>
                </select>
              </div>

              {/* OPD Hours: Start and End Time */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">Doctor OPD Schedule Configuration</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">OPD Start Time</label>
                    <input
                      type="time"
                      required
                      value={newDoctor.startTime}
                      onChange={(e) => setNewDoctor({ ...newDoctor, startTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">OPD End Time</label>
                    <input
                      type="time"
                      required
                      value={newDoctor.endTime}
                      onChange={(e) => setNewDoctor({ ...newDoctor, endTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Working Days Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Working Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = newDoctor.availableDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() =>
                            toggleDay(newDoctor.availableDays, day.id, (days) =>
                              setNewDoctor({ ...newDoctor, availableDays: days })
                            )
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Break / Buffer per hour */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Break / Buffer Time (per hour)
                  </label>
                  <select
                    value={newDoctor.bufferMinutesPerHour}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, bufferMinutesPerHour: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-slate-800"
                  >
                    <option value={0}>0 Minutes (No break)</option>
                    <option value={5}>5 Minutes / Hour</option>
                    <option value={10}>10 Minutes / Hour (Standard OPD Buffer)</option>
                    <option value={15}>15 Minutes / Hour (Extended Break)</option>
                    <option value={20}>20 Minutes / Hour</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={newDoctor.consultationFee}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, consultationFee: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={newDoctor.experienceYears}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, experienceYears: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Doctor & Schedule (DM-R3-001 & DM-R3-002) */}
      {isEditDoctorOpen && editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-teal-600" />
                <span>Edit Doctor &amp; Schedule</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{editingDoctor.id}</span>
            </div>

            <form onSubmit={handleUpdateDoctor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Nair"
                  value={editDoctorForm.name}
                  onChange={(e) => setEditDoctorForm({ ...editDoctorForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    value={editDoctorForm.specialty}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, specialty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications</label>
                  <input
                    type="text"
                    required
                    value={editDoctorForm.qualifications}
                    onChange={(e) =>
                      setEditDoctorForm({ ...editDoctorForm, qualifications: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Consultation Slot Duration */}
              <div>
                <label className="block text-xs font-bold text-teal-800 mb-1">
                  Consultation Slot Duration
                </label>
                <select
                  value={editDoctorForm.slotDurationMinutes}
                  onChange={(e) =>
                    setEditDoctorForm({
                      ...editDoctorForm,
                      slotDurationMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-teal-300 bg-teal-50 text-sm font-bold text-teal-900"
                >
                  <option value={5}>5 Minutes (Rapid / Triage / ENT)</option>
                  <option value={10}>10 Minutes (Standard Consultation)</option>
                  <option value={15}>15 Minutes (Comprehensive)</option>
                  <option value={20}>20 Minutes (Pediatric / Chronic)</option>
                  <option value={30}>30 Minutes (Detailed Specialist)</option>
                </select>
              </div>

              {/* OPD Schedule: Hours, Working Days, Break */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">OPD Schedule &amp; Working Hours</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">OPD Start Time</label>
                    <input
                      type="time"
                      required
                      value={editDoctorForm.startTime}
                      onChange={(e) => setEditDoctorForm({ ...editDoctorForm, startTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">OPD End Time</label>
                    <input
                      type="time"
                      required
                      value={editDoctorForm.endTime}
                      onChange={(e) => setEditDoctorForm({ ...editDoctorForm, endTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Working Days Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Working Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = editDoctorForm.availableDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() =>
                            toggleDay(editDoctorForm.availableDays, day.id, (days) =>
                              setEditDoctorForm({ ...editDoctorForm, availableDays: days })
                            )
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Break / Buffer per hour */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Break / Buffer Time (per hour)
                  </label>
                  <select
                    value={editDoctorForm.bufferMinutesPerHour}
                    onChange={(e) =>
                      setEditDoctorForm({
                        ...editDoctorForm,
                        bufferMinutesPerHour: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-slate-800"
                  >
                    <option value={0}>0 Minutes (No break)</option>
                    <option value={5}>5 Minutes / Hour</option>
                    <option value={10}>10 Minutes / Hour (Standard Buffer)</option>
                    <option value={15}>15 Minutes / Hour (Extended Break)</option>
                    <option value={20}>20 Minutes / Hour</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={editDoctorForm.consultationFee}
                    onChange={(e) =>
                      setEditDoctorForm({
                        ...editDoctorForm,
                        consultationFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={editDoctorForm.experienceYears}
                    onChange={(e) =>
                      setEditDoctorForm({
                        ...editDoctorForm,
                        experienceYears: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditDoctorOpen(false);
                    setEditingDoctor(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Receptionist */}
      {isAddReceptionistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Receptionist Account</h3>
            <form onSubmit={handleCreateReceptionist} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Staff / Desk Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontdesk Morning"
                  value={newReceptionist.name}
                  onChange={(e) => setNewReceptionist({ ...newReceptionist, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder={`reception.${data.hospital.slug}`}
                  value={newReceptionist.username}
                  onChange={(e) =>
                    setNewReceptionist({ ...newReceptionist, username: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={newReceptionist.password}
                  onChange={(e) =>
                    setNewReceptionist({ ...newReceptionist, password: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddReceptionistOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
