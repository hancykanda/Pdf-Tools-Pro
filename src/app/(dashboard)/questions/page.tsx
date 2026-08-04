'use client';

import { useState } from 'react';
import { FileQuestion, Plus, Trash2, Edit3, Eye } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

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

const sampleQuestions: Question[] = [
  {
    id: '1',
    text: 'What is the capital of France?',
    subject: 'Geography',
    topic: 'Europe',
    classLevel: 'Grade 5',
    questionType: 'Multiple Choice',
    points: 5,
    visibility: 'PUBLIC',
  },
  {
    id: '2',
    text: 'Explain the water cycle.',
    subject: 'Science',
    topic: 'Earth Science',
    classLevel: 'Grade 6',
    questionType: 'Essay',
    points: 10,
    visibility: 'PRIVATE',
  },
];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>(sampleQuestions);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    subject: '',
    topic: '',
    classLevel: '',
    questionType: 'Multiple Choice',
    points: '5',
    visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
  });

  const handleAdd = () => {
    if (!formData.text.trim() || !formData.subject.trim() || !formData.topic.trim() || !formData.classLevel.trim()) return;
    const newQuestion: Question = {
      id: Date.now().toString(),
      ...formData,
      points: Number(formData.points),
    };
    setQuestions([newQuestion, ...questions]);
    setFormData({
      text: '',
      subject: '',
      topic: '',
      classLevel: '',
      questionType: 'Multiple Choice',
      points: '5',
      visibility: 'PRIVATE',
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const toggleVisibility = (id: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === id ? { ...q, visibility: q.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' } : q
      )
    );
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Question Bank" description="Create and organize exam questions." icon={FileQuestion} />

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Questions ({questions.length})</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

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
                <ActionButton onClick={handleAdd} className="flex-1">
                  <Plus className="w-5 h-5" />
                  Save Question
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
            {questions.map((question) => (
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
                      onClick={() => toggleVisibility(question.id)}
                      className="p-2 text-gray-500 hover:text-brand-red hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                      title="Toggle visibility"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-brand-red hover:bg-white rounded-lg border border-transparent hover:border-gray-200">
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
            ))}
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
