import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleInput } from '../../components/ui/AppleInput';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Settings, Shield, Sparkles, Database, Save } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.system.getSettings();
      setSettings(res.data?.settings || (res.data as any) || {});
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.system.updateSettings(settings);
      showToast('success', 'Settings Saved', 'System configurations updated immediately.');
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading institutional configuration parameters..." />;
  }

  return (
    <div className="space-y-6 animate-apple-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-neutral-500" />
          System Settings & Policies
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Configure university-wide SLA thresholds, document quotas, and AI OCR processing rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Document Vault & Quota Policy */}
        <AppleCard className="p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-apple-blue" />
            Document Vault Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppleInput
              label="Maximum File Upload Limit (MB)"
              type="number"
              min="5"
              max="200"
              value={settings.max_file_size_mb || '50'}
              onChange={(e) => setSettings({ ...settings, max_file_size_mb: e.target.value })}
            />

            <AppleInput
              label="Default SLA Review Turnaround (Days)"
              type="number"
              min="1"
              max="30"
              value={settings.default_sla_days || '5'}
              onChange={(e) => setSettings({ ...settings, default_sla_days: e.target.value })}
            />
          </div>
        </AppleCard>

        {/* AI & Automation Policies */}
        <AppleCard className="p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-apple-purple" />
            AI Intelligence & OCR Automation
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Automatic AI OCR Text Extraction
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Automatically parse and index text on all uploaded PDFs and images.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.ocr_auto_scan_enabled !== 'false'}
                onChange={(e) => setSettings({ ...settings, ocr_auto_scan_enabled: String(e.target.checked) })}
                className="w-5 h-5 rounded text-apple-blue focus:ring-apple-blue cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Automated Workflow SLA Escalations
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Notify department administrators if approval stages exceed their deadline.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_escalate_sla !== 'false'}
                onChange={(e) => setSettings({ ...settings, auto_escalate_sla: String(e.target.checked) })}
                className="w-5 h-5 rounded text-apple-blue focus:ring-apple-blue cursor-pointer"
              />
            </div>
          </div>
        </AppleCard>

        {/* Security & Maintenance */}
        <AppleCard className="p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-apple-red" />
            Security, Maintenance & Threat Mitigation
          </h3>

          <AppleInput
            label="System Maintenance Banner (Leave empty for normal operation)"
            placeholder="e.g. Scheduled maintenance this Sunday at 02:00 UTC."
            value={settings.maintenance_banner || ''}
            onChange={(e) => setSettings({ ...settings, maintenance_banner: e.target.value })}
          />
        </AppleCard>

        {/* Rate Limiting Policies */}
        <AppleCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-apple-orange" />
              Rate Limiting & DDoS Shield Thresholds
            </h3>
            <AppleBadge variant="purple" size="sm">
              Multi-Tier Enforcement
            </AppleBadge>
          </div>

          <p className="text-xs text-neutral-500">
            Configure threshold limits across endpoint tiers. Authentication routes enforce strict sliding-window IP limits combined with per-account exponential backoff to prevent brute-force attacks.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <AppleInput
              label="Auth IP Limit (Req / 15m)"
              type="number"
              min="5"
              max="200"
              value={settings.rate_auth_ip_max || '20'}
              onChange={(e) => setSettings({ ...settings, rate_auth_ip_max: e.target.value })}
            />

            <AppleInput
              label="Auth Free Attempts Before Backoff"
              type="number"
              min="1"
              max="20"
              value={settings.rate_auth_free_attempts || '5'}
              onChange={(e) => setSettings({ ...settings, rate_auth_free_attempts: e.target.value })}
            />

            <AppleInput
              label="Auth Base Backoff (Seconds)"
              type="number"
              min="1"
              max="60"
              value={settings.rate_auth_backoff_base_sec || '2'}
              onChange={(e) => setSettings({ ...settings, rate_auth_backoff_base_sec: e.target.value })}
            />

            <AppleInput
              label="Public Endpoints Limit (Req / 15m)"
              type="number"
              min="20"
              max="1000"
              value={settings.rate_public_max || '120'}
              onChange={(e) => setSettings({ ...settings, rate_public_max: e.target.value })}
            />

            <AppleInput
              label="Auth User Actions (Req / 15m)"
              type="number"
              min="50"
              max="5000"
              value={settings.rate_auth_user_max || '500'}
              onChange={(e) => setSettings({ ...settings, rate_auth_user_max: e.target.value })}
            />

            <AppleInput
              label="Upload Cap (Files / Hour)"
              type="number"
              min="5"
              max="300"
              value={settings.rate_upload_max || '30'}
              onChange={(e) => setSettings({ ...settings, rate_upload_max: e.target.value })}
            />
          </div>
        </AppleCard>

        <div className="flex justify-end">
          <AppleButton
            type="submit"
            variant="primary"
            size="lg"
            icon={<Save className="w-5 h-5" />}
            loading={saving}
          >
            Save All Settings
          </AppleButton>
        </div>
      </form>
    </div>
  );
};
