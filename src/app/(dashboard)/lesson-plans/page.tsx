'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton, Alert } from '@/components/layout/PageShell';

type LessonPlan = {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  topic: string;
  durationMinutes: number;
  aiGenerated: boolean;
};

const emptyForm = {
  title: '',
  subject: '',
  classLevel: '',
  topic: '',
  durationMinutes: '45',
};

export default function LessonPlansPage() {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/premium/lesson-plans');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load lesson plans');
      setPlans(Array.isArray(data.items) ? data.items : []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadPlans();
    };
    run();
  }, [loadPlans]);

  const createPlan = async (aiGenerated: boolean) => {
    if (!formData.title.trim() || !formData.subject.trim() || !formData.topic.trim() || !formData.classLevel.trim()) {
      setError('Title, subject, class level and topic are required.');
      return;
    }
    setError('');
    if (aiGenerated) setGenerating(true);
    else setSaving(true);

    try {
      const res = await fetch('/api/premium/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          durationMinutes: Number(formData.durationMinutes) || 45,
          aiGenerated,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (aiGenerated ? 'Generation failed' : 'Failed to save lesson plan'));

      setPlans((prev) => [data.lessonPlan as LessonPlan, ...prev]);
      setFormData(emptyForm);
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save lesson plan');
    } finally {
      setGenerating(false);
      setSaving(false);
    }
  };

  const handleAdd = () => {
    createPlan(false);
  };

  const handleAIGenerate = () => {
    createPlan(true);
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/premium/lesson-plans?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete lesson plan');
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete lesson plan');
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Lesson Plans Master" description="Create and manage lesson plans." icon={GraduationCap} />

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Lesson Plans ({plans.length})</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>

          {error && (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          )}

          {showForm && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Level</label>
                  <input
                    type="text"
                    value={formData.classLevel}
                    onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <ActionButton onClick={handleAdd} disabled={saving || generating} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Save Plan
                    </>
                  )}
                </ActionButton>
                <ActionButton onClick={handleAIGenerate} disabled={generating || saving} className="flex-1">
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      AI Generate
                    </>
                  )}
                </ActionButton>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading lesson plans...
              </div>
            ) : plans.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No lesson plans yet. Create your first one.</p>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{plan.title}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                      <span>{plan.subject}</span>
                      <span>•</span>
                      <span>{plan.classLevel}</span>
                      <span>•</span>
                      <span>{plan.topic}</span>
                      <span>•</span>
                      <span>{plan.durationMinutes} mins</span>
                      {plan.aiGenerated && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600">AI Generated</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
