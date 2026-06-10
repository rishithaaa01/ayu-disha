import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useClinicianStore } from '../../store/clinicianStore';
import api from '../../services/api';
import { User, Shield, Activity, Languages, Phone, MapPin, Save, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function SettingsScreen() {
  const { user, login } = useAuthStore();
  const { setDoctor } = useClinicianStore();

  const [name, setName] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [language, setLanguage] = useState('en');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSpeciality(user.speciality || 'General Medicine');
      setLanguage(user.language || 'en');
      setDistrict(user.district || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        role: 'doctor',
        language,
        district: district.trim(),
        hospital: user?.hospital,
        speciality: speciality,
      };

      const res = await api.post('/auth/complete-profile', payload);
      
      // Update both stores
      login(res.data, localStorage.getItem('token') || '');
      setDoctor(res.data);

      toast.success('Profile updated successfully!', {
        icon: '✨',
        style: {
          borderRadius: '12px',
          background: '#333',
          color: '#fff',
        },
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to update profile.', {
        style: {
          borderRadius: '12px',
          background: '#333',
          color: '#fff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E2DDD8] shadow-sm overflow-hidden animate-fadeIn">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="p-8 border-b border-[#E2DDD8] bg-gradient-to-r from-white to-[#F7F3EE]">
        <h2 className="text-2xl font-bold text-[#333] font-mukta flex items-center gap-3">
          <Shield className="text-[#1B6CA8]" size={28} />
          Profile Settings
        </h2>
        <p className="text-sm text-[#666] mt-1">
          Manage your clinician profile, hospital credentials, and preferences.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="p-8 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <User size={14} className="text-[#1B6CA8]" />
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] outline-none text-sm text-[#333] font-medium"
            required
            placeholder="Dr. Ramesh Kumar"
          />
        </div>

        {/* Speciality */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Activity size={14} className="text-[#1B6CA8]" />
            Medical Speciality
          </label>
          <select
            value={speciality}
            onChange={(e) => setSpeciality(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] outline-none text-sm text-[#333] font-medium bg-white"
          >
            <option value="General Medicine">General Medicine</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="General Surgery">General Surgery</option>
          </select>
        </div>

        {/* Hospital (Read-only) */}
        <div className="space-y-2 bg-[#F7F3EE]/50 p-4 rounded-xl border border-[#E2DDD8]">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
            Assigned Hospital (Managed by Admin)
          </label>
          <p className="text-sm font-bold text-[#555] mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {user?.hospital || 'Govt General Hospital Chennai'}
          </p>
        </div>

        {/* Contact Info Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Mobile (Read-only) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Phone size={14} />
              Mobile Number
            </label>
            <input
              type="text"
              value={user?.mobile || ''}
              disabled
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none text-sm text-gray-500 font-semibold cursor-not-allowed"
            />
          </div>

          {/* District */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <MapPin size={14} className="text-[#1B6CA8]" />
              District
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] outline-none text-sm text-[#333] font-medium"
              placeholder="e.g. Chennai"
            />
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Languages size={14} className="text-[#1B6CA8]" />
            Preferred Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] outline-none text-sm text-[#333] font-medium bg-white"
          >
            <option value="en">English</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="hi">Hindi (हिन्दी)</option>
          </select>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 mt-8"
        >
          {loading ? (
            'Saving Settings...'
          ) : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
