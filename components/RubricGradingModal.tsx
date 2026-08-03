import React, { useState } from 'react';
import { Award, CheckCircle2, X, Sliders, MessageSquare, AlertCircle } from 'lucide-react';

interface RubricCriterion {
  id: string;
  name: string;
  maxScore: number;
  description: string;
  levels: {
    points: number;
    title: string;
    description: string;
  }[];
}

interface RubricGradingModalProps {
  isOpen: boolean;
  submission: any;
  onClose: () => void;
  onSubmitGrade: (totalScore: number, feedback: string, rubricScores: Record<string, number>) => void;
}

const DEFAULT_RUBRICS: RubricCriterion[] = [
  {
    id: 'crit-1',
    name: 'Technical Implementation & Architecture',
    maxScore: 40,
    description: 'Evaluates code structure, design patterns, modularity, and error handling.',
    levels: [
      { points: 40, title: 'Mastery (40 pts)', description: 'Flawless architectural separation, zero syntax/logic bugs, production ready.' },
      { points: 30, title: 'Proficient (30 pts)', description: 'Clean implementation, minor optimization or formatting scope.' },
      { points: 20, title: 'Developing (20 pts)', description: 'Functional solution with noticeable code duplication or missing error checks.' },
      { points: 10, title: 'Unsatisfactory (10 pts)', description: 'Incomplete implementation or fails core functional requirements.' }
    ]
  },
  {
    id: 'crit-2',
    name: 'Documentation & Code Comments',
    maxScore: 30,
    description: 'Assesses inline documentation, docstrings, and setup instructions.',
    levels: [
      { points: 30, title: 'Exemplary (30 pts)', description: 'Comprehensive inline comments, docstrings, and clear API spec.' },
      { points: 20, title: 'Sufficient (20 pts)', description: 'Basic setup documentation provided with adequate comments.' },
      { points: 10, title: 'Minimal (10 pts)', description: 'Sparse comments with no clear documentation or setup steps.' }
    ]
  },
  {
    id: 'crit-3',
    name: 'Verification & Testing Coverage',
    maxScore: 30,
    description: 'Evaluates unit test coverage and runtime edge case handling.',
    levels: [
      { points: 30, title: 'Full Coverage (30 pts)', description: 'Includes unit tests covering positive and negative edge cases.' },
      { points: 20, title: 'Partial Coverage (20 pts)', description: 'Covers main execution flow with missing edge case tests.' },
      { points: 10, title: 'No Tests (10 pts)', description: 'Zero automated tests or manual test script included.' }
    ]
  }
];

export const RubricGradingModal: React.FC<RubricGradingModalProps> = ({
  isOpen,
  submission,
  onClose,
  onSubmitGrade
}) => {
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({
    'crit-1': 40,
    'crit-2': 30,
    'crit-3': 30
  });
  const [feedback, setFeedback] = useState('Excellent work! Strong architectural separation and clean documentation.');

  if (!isOpen || !submission) return null;

  const totalCalculatedScore = Object.values(rubricScores).reduce((sum, val) => sum + val, 0);

  const handleSelectLevel = (critId: string, pts: number) => {
    setRubricScores((prev) => ({ ...prev, [critId]: pts }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitGrade(totalCalculatedScore, feedback, rubricScores);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <form onSubmit={handleFormSubmit} className="bg-slate-900 border border-indigo-500/30 w-full max-w-3xl rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Canvas LMS Rubric Evaluator</span>
            <h3 className="text-lg font-black text-white">Grading Submission: {submission.student_name || 'Student'}</h3>
            <p className="text-xs text-slate-400">Assignment: {submission.assignment_title || 'Technical Report'}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Rubrics Criteria List */}
        <div className="flex-1 my-4 space-y-6 overflow-y-auto pr-2">
          {DEFAULT_RUBRICS.map((criterion) => (
            <div key={criterion.id} className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{criterion.name}</h4>
                  <p className="text-xs text-slate-400">{criterion.description}</p>
                </div>
                <span className="text-xs font-black text-indigo-400 px-3 py-1 bg-indigo-500/20 rounded-lg">
                  {rubricScores[criterion.id] || 0} / {criterion.maxScore} pts
                </span>
              </div>

              {/* Levels Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {criterion.levels.map((lvl, lIdx) => {
                  const isSelected = rubricScores[criterion.id] === lvl.points;

                  return (
                    <button
                      key={lIdx}
                      type="button"
                      onClick={() => handleSelectLevel(criterion.id, lvl.points)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-md'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <p className="text-xs font-bold">{lvl.title}</p>
                      <p className="text-[10px] opacity-80 mt-1">{lvl.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Feedback Area */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Faculty Reviewer Remarks & Feedback</label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full glass-input px-4 py-3 rounded-xl text-xs text-white"
              placeholder="Provide constructive feedback..."
            />
          </div>
        </div>

        {/* Footer Score & Submit */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Calculated Total Grade</p>
            <p className="text-2xl font-black text-emerald-400">{totalCalculatedScore} / 100 Marks</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} /> Finalize Rubric Grade
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
