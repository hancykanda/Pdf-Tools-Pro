'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileQuestion, Plus, Trash2, Edit3, Eye, Loader2 } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton, Alert } from '@/components/layout/PageShell';

type Question = {
  id: string;
  text: string;
  subject: string;
  topic: string;
  classLevel: string;
  questionType: string;
  points: number;
  visibility: 'PUBLIC' | 'PRIVATE';
};

const emptyForm = {
  text: '',
  subject: '',
  topic: '',
  classLevel: '',
  questionType: 'Multiple Choice',
  points: '5',
  visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/premium/questions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load questions');
      setQuestions(Array.isArray(data.items) ? data.items : []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadQuestions();
    };
    run();
  }, [loadQuestions]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formData.text.trim() || !formData.subject.trim() || !formData.topic.trim() || !formData.classLevel.trim()) {
      setError('Question text, subject, topic and class level are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...formData,
        points: Number(formData.points) || 5,
      };

      const url = editingId
        ? `/api/premium/questions?id=${encodeURIComponent(editingId)}`
        : '/api/premium/questions';

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save question');

      const saved = data.question as Question;
      setQuestions((prev) => (editingId ? prev.map((q) => (q.id === saved.id ? saved : q)) : [saved, ...prev]));
      resetForm();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setFormData({
      text: question.text,
      subject: question.subject,
      topic: question.topic,
      classLevel: question.classLevel,
      questionType: question.questionType,
      points: String(question.points),
      visibility: question.visibility,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/premium/questions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete question');
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (editingId === id) {
        resetForm();
        setShowForm(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  const toggleVisibility = async (question: Question) => {
    const visibility: 'PUBLIC' | 'PRIVATE' = question.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    setError('');
    try {
      const res = await fetch(`/api/premium/questions?id=${encodeURIComponent(question.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update visibility');

      const updated = (data.question as Question) ?? { ...question, visibility };
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? updated : q)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Question Bank" description="Create and organize exam questions." icon={FileQuestion} />

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Questions ({questions.length})</h3>
            <button
              onClick={() => {
                if (showForm) resetForm();
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Question
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <textarea
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                    rows={3}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    value={formData.questionType}
                    onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  >
                    <option value="Multiple Choice">Multiple Choice</option>
                    <option value="Essay">Essay</option>
                    <option value="True/False">True/False</option>
                    <option value="Short Answer">Short Answer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <ActionButton onClick={handleAdd} disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      {editingId ? 'Update Question' : 'Save Question'}
                    </>
                  )}
                </ActionButton>
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
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
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No questions yet. Add your first question.</p>
            ) : (
              questions.map((question) => (
                <div key={question.id} className="p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">{question.text}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">{question.subject}</span>
                        <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">{question.topic}</span>
                        <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">{question.classLevel}</span>
                        <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">{question.points} pts</span>
                        <span
                          className={`px-2 py-0.5 rounded-full border ${
                            question.visibility === 'PUBLIC'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {question.visibility}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleVisibility(question)}
                        className="p-2 text-gray-500 hover:text-brand-red hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                        title="Toggle visibility"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(question)}
                        title="Edit question"
                        className="p-2 text-gray-500 hover:text-brand-red hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
