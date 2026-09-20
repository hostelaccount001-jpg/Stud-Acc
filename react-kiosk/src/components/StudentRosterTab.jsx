import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Fingerprint,
  CheckCircle2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { fetchRegisteredStudents } from '../services/supabaseClient';

export const StudentRosterTab = ({ onOpenRegisterFace }) => {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, ENROLLED, PENDING
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const { allStudents } = await fetchRegisteredStudents();
    setStudents(allStudents);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = students.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.suid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.standard || '').toLowerCase().includes(searchQuery.toLowerCase());

    const hasFingerprint = Boolean(s.fingerprintTemplate) && s.fingerprintTemplate.length > 0;
    if (filterType === 'ENROLLED') return matchesSearch && hasFingerprint;
    if (filterType === 'PENDING') return matchesSearch && !hasFingerprint;
    return matchesSearch;
  });

  return (
    <div className="cyber-card p-4 border-slate-800 bg-slate-950 flex flex-col gap-4 flex-1">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <h2 className="font-orbitron font-bold text-sm tracking-wide text-cyan-400">
            STUDENT ROSTER & MANTRA MFS 100 BIOMETRIC STATUS
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search name, roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-700 p-0.5 text-xs font-mono">
            {['ALL', 'ENROLLED', 'PENDING'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === type
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => onOpenRegisterFace()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-orbitron font-bold text-xs rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ENROLL FINGERPRINT</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-orbitron text-[11px]">
              <th className="pb-2">STUDENT</th>
              <th className="pb-2">ROLL NO / SUID</th>
              <th className="pb-2">STANDARD</th>
              <th className="pb-2">NFC CARD</th>
              <th className="pb-2">MANTRA MFS 100 FINGERPRINT</th>
              <th className="pb-2 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                  No student records found matching the filter.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const hasFingerprint =
                  Boolean(s.fingerprintTemplate) && s.fingerprintTemplate.length > 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 font-orbitron font-bold text-slate-200 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold">
                        {s.name ? s.name.charAt(0) : '?'}
                      </div>
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3 text-cyan-300">{s.suid}</td>
                    <td className="py-3 text-slate-400">{s.standard}</td>
                    <td className="py-3 text-slate-400">{s.nfcCode || '—'}</td>
                    <td className="py-3">
                      {hasFingerprint ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          ISO FMR Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px]">
                          Pending Enrollment
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onOpenRegisterFace(s.id)}
                        className="px-2.5 py-1 bg-cyan-600/80 hover:bg-cyan-500 text-black font-orbitron font-bold text-[11px] rounded transition-all inline-flex items-center gap-1"
                      >
                        <Fingerprint className="w-3 h-3" />
                        <span>{hasFingerprint ? 'RE-SCAN' : 'ENROLL'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentRosterTab;
