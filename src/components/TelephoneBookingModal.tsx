import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  User,
  Calendar,
  Clock,
  CheckCircle,
  Copy,
  AlertCircle,
  Search,
  Sparkles,
  ShieldCheck,
  Building,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { Doctor, SlotAvailability } from '../types/index.js';

interface TelephoneBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId: string;
  hospitalName?: string;
  doctors: Doctor[];
  selectedDoctorId?: string;
  defaultDate?: string;
  availabilityVersion?: number;
  onBookingSuccess: (source?: 'PHONE' | 'WALK_IN' | 'OTHER') => void;
}

export const TelephoneBookingModal: React.FC<TelephoneBookingModalProps> = ({
  isOpen,
  onClose,
  hospitalId,
  hospitalName = 'Doctormate Hospital',
  doctors,
  selectedDoctorId,
  defaultDate,
  availabilityVersion = 0,
  onBookingSuccess,
}) => {
  const [bookingSource, setBookingSource] = useState<'PHONE' | 'WALK_IN' | 'OTHER'>('PHONE');
  const [patientName, setPatientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [doctorId, setDoctorId] = useState(selectedDoctorId || doctors[0]?.id || '');
  const [date, setDate] = useState(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('doctormate_simulated_date') : null;
    return defaultDate || cached || new Date().toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing patient matching state
  const [existingMatch, setExistingMatch] = useState<{ id: string; name: string; age?: number } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Success confirmation state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    appointmentNumber: string;
    patientName: string;
    doctorName: string;
    bookedTime: string;
    date: string;
    trackerUrl: string;
    confirmationText: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const prevIsOpenRef = React.useRef(isOpen);
  const prevVersionRef = React.useRef(availabilityVersion);
  const fetchRequestIdRef = React.useRef(0);

  // Fetch slots with request-sequence guard to prevent stale responses from replacing newer state
  const fetchSlots = React.useCallback(
    async (targetDoctorId?: string, targetDate?: string) => {
      const activeDocId = targetDoctorId || doctorId;
      const activeDate = targetDate || date;
      if (!activeDocId || !activeDate) return;

      const currentRequestId = ++fetchRequestIdRef.current;
      setLoadingSlots(true);
      try {
        const doctor = doctors.find((d) => d.id === activeDocId);
        const branchId = doctor?.branches[0] || 'main';
        const res = await fetch(
          `/api/slots?doctorId=${encodeURIComponent(activeDocId)}&branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(activeDate)}&_t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          // Prevent stale responses from replacing newer state
          if (currentRequestId === fetchRequestIdRef.current) {
            const freshSlots = Array.isArray(data) ? data : [];
            setSlots(freshSlots);
            // Retain selected slot only if still available
            setSelectedSlot((prev) => {
              if (!prev) return '';
              const match = freshSlots.find((s: SlotAvailability) => s.time === prev);
              return match && match.available ? prev : '';
            });
          }
        } else {
          if (currentRequestId === fetchRequestIdRef.current) {
            setSlots([]);
          }
        }
      } catch (err) {
        if (currentRequestId === fetchRequestIdRef.current) {
          console.error('Failed to load slots:', err);
          setSlots([]);
        }
      } finally {
        if (currentRequestId === fetchRequestIdRef.current) {
          setLoadingSlots(false);
        }
      }
    },
    [doctorId, date, doctors]
  );

  // Initialize doctor selection and date, and ALWAYS fetch fresh availability whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const isJustOpened = !prevIsOpenRef.current;
      let effectiveDocId = doctorId;
      let effectiveDate = date;

      if (isJustOpened) {
        effectiveDocId = (selectedDoctorId && doctors.some((d) => d.id === selectedDoctorId))
          ? selectedDoctorId
          : (doctorId || doctors[0]?.id || '');
        const cached = typeof window !== 'undefined' ? localStorage.getItem('doctormate_simulated_date') : null;
        effectiveDate = defaultDate || cached || date || new Date().toISOString().split('T')[0];

        setDoctorId(effectiveDocId);
        setDate(effectiveDate);
        setSelectedSlot('');
        setError(null);
        setConfirmedBooking(null);
      }

      fetchSlots(effectiveDocId, effectiveDate);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, selectedDoctorId, doctors, defaultDate, fetchSlots]);

  // Refetch slots when availabilityVersion changes while modal is open
  useEffect(() => {
    if (isOpen && availabilityVersion !== prevVersionRef.current) {
      prevVersionRef.current = availabilityVersion;
      fetchSlots();
    }
  }, [isOpen, availabilityVersion, fetchSlots]);

  useEffect(() => {
    if (defaultDate && isOpen) {
      setDate(defaultDate);
    }
  }, [defaultDate, isOpen]);

  // Fallback if doctorId is empty but doctors list loads
  useEffect(() => {
    if (!doctorId && doctors.length > 0) {
      const initialDocId = (selectedDoctorId && doctors.some((d) => d.id === selectedDoctorId))
        ? selectedDoctorId
        : doctors[0].id;
      setDoctorId(initialDocId);
    }
  }, [doctors, doctorId, selectedDoctorId]);

  // Check existing patient phone matching (without forced auto-merging)
  useEffect(() => {
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      setCheckingExisting(true);
      fetch(`/api/parents/search?q=${encodeURIComponent(cleanPhone)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const firstParent = data[0];
            const firstChild = firstParent.children?.[0];
            setExistingMatch({
              id: firstChild?.id || firstParent.id,
              name: firstChild?.name || firstParent.name,
              age: firstChild?.ageYears,
            });
          } else {
            setExistingMatch(null);
          }
        })
        .catch(() => setExistingMatch(null))
        .finally(() => setCheckingExisting(false));
    } else {
      setExistingMatch(null);
    }
  }, [mobileNumber]);

  const handleApplyMatch = () => {
    if (existingMatch) {
      setPatientName(existingMatch.name);
      if (existingMatch.age) setPatientAge(String(existingMatch.age));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError('Please enter patient name.');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select an available consultation slot.');
      return;
    }

    setSubmitting(true);
    try {
      const doctor = doctors.find((d) => d.id === doctorId);
      const branchId = doctor?.branches[0] || 'main';

      const res = await fetch('/api/reception/phone-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId,
          patientName: patientName.trim(),
          mobileNumber: mobileNumber.trim(),
          patientAge: patientAge ? Number(patientAge) : undefined,
          guardianName: guardianName.trim() || undefined,
          doctorId,
          branchId,
          date,
          bookedTime: selectedSlot,
          bookingSource,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm booking.');
      }

      const origin = window.location.origin;
      const fullTrackerUrl = data.trackerUrl?.startsWith('http')
        ? data.trackerUrl
        : `${origin}${data.trackerUrl?.startsWith('/') ? '' : '/'}${data.trackerUrl}`;

      let fullConfirmationText = data.confirmationText || '';
      if (!fullConfirmationText.includes('http://') && !fullConfirmationText.includes('https://')) {
        fullConfirmationText = fullConfirmationText.replace(
          /(Live Queue Tracking:\s*)(\/[^\s]+)/,
          `$1${origin}$2`
        );
      }

      const savedAppt = data.appointment;
      const confirmedDoctorName = savedAppt?.doctorName || doctor?.name || 'Assigned Doctor';
      const confirmedToken = savedAppt?.appointmentNumber || data.token || data.appointmentNumber;
      const confirmedTime = savedAppt?.bookedTime || selectedSlot;
      const confirmedDate = savedAppt?.date || date;
      const confirmedPatientName = savedAppt?.childName || patientName.trim();

      setConfirmedBooking({
        appointmentNumber: confirmedToken,
        patientName: confirmedPatientName,
        doctorName: confirmedDoctorName,
        bookedTime: confirmedTime,
        date: confirmedDate,
        trackerUrl: fullTrackerUrl,
        confirmationText: fullConfirmationText,
      });

      onBookingSuccess(bookingSource);
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyConfirmation = () => {
    if (confirmedBooking?.confirmationText) {
      const origin = window.location.origin;
      let textToCopy = confirmedBooking.confirmationText;
      if (!textToCopy.includes('http://') && !textToCopy.includes('https://')) {
        textToCopy = textToCopy.replace(
          /(Live Queue Tracking:\s*)(\/[^\s]+)/,
          `$1${origin}$2`
        );
      }
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    setConfirmedBooking(null);
    setPatientName('');
    setMobileNumber('');
    setPatientAge('');
    setGuardianName('');
    setSelectedSlot('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentDoctor = doctors.find((d) => d.id === doctorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">New Staff-Assisted Booking</h3>
              <p className="text-xs text-teal-100 font-medium">
                {hospitalName} • Live Smart OPD Engine
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {confirmedBooking ? (
            /* Confirmation Screen */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                  Booking Confirmed
                </span>
                <h4 className="text-2xl font-extrabold text-slate-800">
                  Token: {confirmedBooking.appointmentNumber}
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Successfully allocated to {confirmedBooking.doctorName}'s live queue
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-semibold text-slate-800">{confirmedBooking.patientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-semibold text-teal-700">{confirmedBooking.doctorName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-semibold text-slate-800">{confirmedBooking.date} at {confirmedBooking.bookedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Source:</span>
                  <span className="font-semibold text-indigo-600 uppercase">{bookingSource}</span>
                </div>
              </div>

              {/* Share & Copy Tracker Link */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-teal-800 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Secure Patient Tracker Ready</span>
                </div>
                <p className="text-xs text-teal-700">
                  Provide this booking details or tracking link to the patient over call or SMS.
                </p>
                <button
                  type="button"
                  onClick={handleCopyConfirmation}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-all shadow"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Booking Details & Tracker'}</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Booking Source Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Booking Source
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'PHONE', label: 'Telephone Call', icon: Phone },
                    { key: 'WALK_IN', label: 'Walk-In Desk', icon: User },
                    { key: 'OTHER', label: 'Staff Assisted', icon: Building },
                  ].map((src) => {
                    const Icon = src.icon;
                    const active = bookingSource === src.key;
                    return (
                      <button
                        key={src.key}
                        type="button"
                        onClick={() => setBookingSource(src.key as any)}
                        className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          active
                            ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{src.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Patient Phone & Matching Workflow */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                  {checkingExisting && (
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                      Searching records...
                    </span>
                  )}
                </div>

                {/* Match Banner if authorized record found */}
                {existingMatch && (
                  <div className="mt-2 p-2.5 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between text-xs text-sky-800 animate-fadeIn">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <span>
                        Found existing record: <strong>{existingMatch.name}</strong>
                        {existingMatch.age ? ` (${existingMatch.age} yrs)` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyMatch}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium text-[11px] transition-colors"
                    >
                      Use Details
                    </button>
                  </div>
                )}
              </div>

              {/* Patient Name, Age & Guardian Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Patient Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Aarav Kumar"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 5"
                    min={0}
                    max={120}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Parent / Guardian Name (Optional)
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                />
              </div>

              {/* Doctor & Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Doctor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="phone-booking-doctor-select"
                    value={doctorId}
                    onChange={(e) => {
                      const newDoc = e.target.value;
                      setDoctorId(newDoc);
                      setSelectedSlot('');
                      fetchSlots(newDoc, date);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialty} • {d.slotDurationMinutes || 15}m slots)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consultation Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={defaultDate || (typeof window !== 'undefined' ? localStorage.getItem('doctormate_simulated_date') : null) || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setDate(newDate);
                      setSelectedSlot('');
                      fetchSlots(doctorId, newDate);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white"
                    required
                  />
                </div>
              </div>

              {/* Available Slots Grid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Available Slot <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      id="phone-booking-refresh-slots-btn"
                      onClick={() => fetchSlots()}
                      disabled={loadingSlots}
                      title="Refresh slot availability"
                      className="p-1 text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin text-teal-600' : ''}`} />
                    </button>
                    {loadingSlots && slots.length > 0 && (
                      <span className="text-[10px] text-teal-600 animate-pulse font-medium">
                        Syncing live availability...
                      </span>
                    )}
                  </div>
                  {currentDoctor && (
                    <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                      Doctor slot length: {currentDoctor.slotDurationMinutes || 15} mins
                    </span>
                  )}
                </div>

                {loadingSlots && slots.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                    <span>Syncing latest slot availability...</span>
                  </div>
                ) : (() => {
                  const dateParts = date ? date.split('-').map(Number) : [];
                  const selectedDayOfWeek = dateParts.length === 3
                    ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).getDay()
                    : new Date(date).getDay();
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const selectedDayName = dayNames[selectedDayOfWeek] || 'this day';

                  const doctorAvailableDays = currentDoctor?.availableDays || [1, 2, 3, 4, 5, 6];
                  const isDoctorScheduled = Array.isArray(doctorAvailableDays) && doctorAvailableDays.includes(selectedDayOfWeek);

                  if (!isDoctorScheduled) {
                    return (
                      <div className="py-6 px-4 text-center text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="font-semibold">{currentDoctor?.name || 'Doctor'} is not scheduled on {selectedDayName}s.</p>
                        <p className="text-[11px] text-amber-600 mt-1">Please select an alternate date for this doctor.</p>
                      </div>
                    );
                  }

                  if (slots.length === 0) {
                    return (
                      <div className="py-6 text-center text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                        No available consultation slots for this doctor on the selected date.
                      </div>
                    );
                  }

                  return null;
                })() || (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                    {slots.map((slot) => {
                      const isAvailable = slot.available;
                      const isSelected = selectedSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-md'
                              : isAvailable
                              ? 'bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50'
                              : 'bg-slate-100 border border-transparent text-slate-400 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting ? (
                    <span>Allocating Token...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm & Generate Token</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
