import React, { useState } from 'react';
import {
  X,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Hospital } from '../types/index.js';

interface HospitalRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrationSuccess: (hospital: Hospital, token: string) => void;
}

export const HospitalRegistrationModal: React.FC<HospitalRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistrationSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: 'Andhra Pradesh',
    pincode: '',
    phone: '',
    hospitalType: 'Multispeciality Hospital',
    logoUrl: '',
    adminName: '',
    adminEmail: '',
    adminMobile: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeSuccessMsg, setPincodeSuccessMsg] = useState<string | null>(null);
  const [availablePlaces, setAvailablePlaces] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePincodeChange = async (pinInput: string) => {
    const cleanPin = pinInput.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length < 6) {
      setPincodeSuccessMsg(null);
      setAvailablePlaces([]);
      return;
    }

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      setPincodeSuccessMsg(null);
      try {
        const res = await fetch(`/api/pincode/${cleanPin}`);
        const data = await res.json();
        if (data.success) {
          const autoCity = data.city || data.place || data.district || '';
          const autoState = data.state || '';
          setFormData((prev) => ({
            ...prev,
            city: autoCity || prev.city,
            state: autoState || prev.state,
          }));
          if (Array.isArray(data.places) && data.places.length > 0) {
            setAvailablePlaces(data.places);
          }
          setPincodeSuccessMsg(`✓ Auto-detected: ${autoCity ? `${autoCity}, ` : ''}${autoState}`);
        }
      } catch (err) {
        console.warn('Pincode lookup failed:', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const cleanedAdminMobile = formData.adminMobile.replace(/\D/g, '');
    if (!cleanedAdminMobile || cleanedAdminMobile.length !== 10) {
      setError('Please enter a valid 10-digit administrator mobile number.');
      return;
    }

    if (formData.phone) {
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      if (cleanedPhone.length < 10) {
        setError('Please enter a valid 10-digit hospital contact phone.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/hospitals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.phone,
          hospitalType: formData.hospitalType,
          logoUrl: formData.logoUrl || undefined,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminMobile: formData.adminMobile,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register hospital.');
      }

      onRegistrationSuccess(data.hospital, data.token);
    } catch (err: any) {
      setError(err.message || 'Error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner">
              <Building className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Register Your Hospital</h3>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                Join Doctormate Multi-Hospital SaaS • Instant OPD Activation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hospital Particulars */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
                <Building className="w-4 h-4 text-teal-600" />
                <span>Hospital & Facility Information</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. City Care Hospital & Research Center"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hospital Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="hospitalType"
                    value={formData.hospitalType}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white"
                  >
                    <option value="Multispeciality Hospital">Multispeciality Hospital</option>
                    <option value="Pediatric / Children Hospital">Pediatric / Children Hospital</option>
                    <option value="Maternity & Child Health Center">Maternity & Child Health Center</option>
                    <option value="General Clinic">General Clinic</option>
                    <option value="Daycare & Diagnostic Center">Daycare & Diagnostic Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hospital Phone / Landline <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 40 2345 6789"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. Plot 14, Main Road, Banjara Hills"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. PIN Code with live auto-detection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      PIN Code <span className="text-rose-500">*</span>
                    </label>
                    {pincodeLoading && (
                      <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3 animate-spin" /> Detecting...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="pincode"
                      id="hospital-reg-pincode"
                      value={formData.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="e.g. 533001"
                      maxLength={6}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-semibold tracking-wider font-mono bg-white"
                      required
                    />
                    {pincodeLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. City / Place (Auto-populated) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      City / Place <span className="text-rose-500">*</span>
                    </label>
                    {formData.city && formData.pincode.length === 6 && (
                      <span className="text-[10px] text-emerald-600 font-bold">Auto-filled</span>
                    )}
                  </div>
                  <input
                    type="text"
                    name="city"
                    id="hospital-reg-city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Kakinada / Hyderabad"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white"
                    required
                  />
                </div>

                {/* 3. State (Auto-populated) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      State <span className="text-rose-500">*</span>
                    </label>
                    {formData.state && formData.pincode.length === 6 && (
                      <span className="text-[10px] text-emerald-600 font-bold">Auto-filled</span>
                    )}
                  </div>
                  <input
                    type="text"
                    name="state"
                    id="hospital-reg-state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Andhra Pradesh"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white"
                    required
                  />
                </div>
              </div>

              {/* Success Badge & Locality Selection (if multiple places in this PIN code) */}
              {pincodeSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{pincodeSuccessMsg}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                    Postal Verified
                  </span>
                </div>
              )}

              {availablePlaces.length > 1 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Choose specific locality / area under PIN {formData.pincode}:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {availablePlaces.map((pl) => (
                      <button
                        key={pl}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, city: pl }))}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                          formData.city === pl
                            ? 'bg-teal-700 text-white font-bold shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
                        }`}
                      >
                        {pl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Administrator Account Details */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
                <User className="w-4 h-4 text-teal-600" />
                <span>Administrator Account Credentials</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Rajesh Varma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Admin Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="admin@hospital.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="adminMobile"
                    value={formData.adminMobile}
                    onChange={handleChange}
                    placeholder="e.g. 9848012345 (10 digits)"
                    maxLength={10}
                    minLength={10}
                    pattern="[0-9]{10}"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <span>Proceed to Onboarding</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
