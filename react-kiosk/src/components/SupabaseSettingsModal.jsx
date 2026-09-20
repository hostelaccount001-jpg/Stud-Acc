import React, { useState, useEffect } from 'react';
import { Database, Save, CheckCircle2, AlertCircle, X, Key, Globe, RefreshCw } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, getSupabaseClient } from '../services/supabaseClient';

export const SupabaseSettingsModal = ({ isOpen, onClose, onConfigUpdated }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testStatus, setTestStatus] = useState(null); // testing, success, error
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url || '');
      setAnonKey(config.key || '');
      setTestStatus(null);
      setTestMessage('');
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestStatus('error');
      setTestMessage('Please provide both Supabase Project URL and Anon API Key.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Connecting to Supabase...');

    try {
      saveSupabaseConfig(url.trim(), anonKey.trim());
      const client = getSupabaseClient();
      if (!client) throw new Error('Invalid Supabase configuration parameters.');

      // Try selecting 1 row from students or test rest endpoint
      const { data, error } = await client.from('students').select('id').limit(1);

      if (error) {
        // Table might not exist yet or permissions
        setTestStatus('warning');
        setTestMessage(`Connected to Supabase! Note: ${error.message}. Ensure students table exists.`);
      } else {
        setTestStatus('success');
        setTestMessage('Connected to Supabase database successfully!');
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(`Connection failed: ${err.message}`);
    }
  };

  const handleSave = () => {
    saveSupabaseConfig(url.trim(), anonKey.trim());
    if (onConfigUpdated) onConfigUpdated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0D1322] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-sm text-cyan-300">
                SUPABASE DATABASE CONFIGURATION
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Connect students & attendance tables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 mb-1 font-bold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              SUPABASE PROJECT URL
            </label>
            <input
              type="text"
              placeholder="https://your-project-id.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-bold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              SUPABASE ANON PUBLIC API KEY
            </label>
            <textarea
              rows={3}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none resize-none"
            />
          </div>

          {/* Test Status Feedback */}
          {testStatus && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 ${
                testStatus === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : testStatus === 'warning'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                  : testStatus === 'testing'
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                  : 'bg-red-950/80 border-red-500 text-red-300'
              }`}
            >
              {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />}
              <span>{testMessage}</span>
            </div>
          )}

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
            💡 If Supabase is offline or not configured yet, face encodings & attendance are automatically cached locally so face save and recognition work 100% reliably.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-orbitron text-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>TEST CONNECTION</span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-orbitron text-xs transition-all"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE CONFIG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
