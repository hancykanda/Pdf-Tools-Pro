'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, User, Bell, Shield } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton, Alert } from '@/components/layout/PageShell';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/premium/settings');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load settings');
        if (!active) return;
        setName(data.name ?? '');
        setEmail(data.email ?? '');
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch('/api/premium/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Settings" description="Manage your account preferences." icon={Settings} />

        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-600" />
            <h3 className="font-display font-semibold text-brand-dark">Profile</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={name}
                disabled={loading}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={email}
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent disabled:bg-gray-50"
              />
            </div>
          </div>
          {error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <ActionButton onClick={handleSave} loading={saving} disabled={loading} className="!w-auto">
              <Save className="w-4 h-4" />
              Save Changes
            </ActionButton>
            {saved && <span className="text-sm text-green-600">Saved</span>}
          </div>
        </Card>

        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="font-display font-semibold text-brand-dark">Notifications</h3>
          </div>
          <p className="text-sm text-gray-600">Notification preferences will be available here.</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="font-display font-semibold text-brand-dark">Security</h3>
          </div>
          <p className="text-sm text-gray-600">Password and security settings will be available here.</p>
        </Card>
      </Section>
    </PageContainer>
  );
}