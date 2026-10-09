import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  FileText, Clock, Upload, CheckCircle2, AlertCircle, 
  Download, Send, MessageSquare, ListFilter,
  Calendar, BarChart3, X, Award, Loader2, ExternalLink, RefreshCw
} from 'lucide-react';
import { ROLE_THEMES } from '../constants';
import { FullPageLoader } from '../components/LoadingSkeleton';
import { assignmentsApi, coursesApi, uploadApi } from '../services/api';
import GlassCard from '../components/GlassCard';
import { RubricGradingModal } from '../components/RubricGradingModal';

interface AssignmentItem {
  id: string;
  course_id: string;
  course_name: string;
  title: string;
  description: string;
  due_date: string;
  max_marks: number;
  file_url: string | null;
  status: string; // PENDING | SUBMITTED | GRADED | LATE
  submission_id: string | null;
  marks_obtained: number | null;
  feedback: string | null;
}

interface SubmissionItem {
  id: string;
  assignment_id: string;
  assignment_title: string;
  student_id: string;
  student_name: string;
  file_url: string;
  submitted_at: string;
  marks_obtained: number | null;
  max_marks?: number;
  feedback: string | null;
  status: string;
}

const AssignmentModule: React.FC<{ role: UserRole }> = ({ role }) => {
  const isStudent = role === UserRole.STUDENT;
  const isFacultyOrAdmin = role === UserRole.FACULTY || role === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded' | 'registry'>(
    isStudent ? 'pending' : 'registry'
  );
  
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Assignment Creation Form State (Faculty)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Student Submission Form State
  const [submittingAssignment, setSubmittingAssignment] = useState<AssignmentItem | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);

  // Single Grading Modal State (Faculty)
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionItem | null>(null);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const loadAssignments = async () => {
    try {
      const res = await assignmentsApi.list();
      setAssignments(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setAssignments([]);
    }
  };

  const loadSubmissions = async () => {
    if (!isFacultyOrAdmin) return;
    try {
      const res = await assignmentsApi.listSubmissions();
      setSubmissions(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setSubmissions([]);
    }
  };

  const loadCourses = async () => {
    if (!isFacultyOrAdmin) return;
    try {
      const res = await coursesApi.list();
      const list = Array.isArray(res) ? res : [];
      setCourses(list);
      if (list.length > 0 && !courseId) {
        setCourseId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadAssignments(),
      isFacultyOrAdmin ? loadSubmissions() : Promise.resolve(),
      isFacultyOrAdmin ? loadCourses() : Promise.resolve(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [role, isFacultyOrAdmin]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Faculty Actions
  // ---------------------------------------------------------------------------
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title.trim() || !dueDate) {
      setToast({ message: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    setCreating(true);
    try {
      await assignmentsApi.create({
        course_id: courseId,
        title: title.trim(),
        description: description.trim(),
        due_date: new Date(dueDate).toISOString(),
        max_marks: Number(maxMarks),
      });

      setToast({ message: 'Assignment created and published successfully!', type: 'success' });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      loadAssignments();
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create assignment', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleGradeSubmit = async (totalScore: number, feedbackText: string) => {
    if (!gradingSubmission) return;

    try {
      await assignmentsApi.gradeSubmission(gradingSubmission.id, {
        marks_obtained: totalScore,
        feedback: feedbackText,
      });

      setToast({ message: `Submission graded successfully (${totalScore} marks)!`, type: 'success' });
      setGradingSubmission(null);
      loadSubmissions();
      loadAssignments();
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to grade submission', type: 'error' });
    }
  };

  // ---------------------------------------------------------------------------
  // Student Actions
  // ---------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const res = await uploadApi.uploadFile(file);
      setSubmissionUrl(res.file_url);
      setToast({ message: 'File uploaded successfully!', type: 'success' });
    } catch (err: any) {
      setToast({ message: 'File upload failed: ' + (err.message || 'Upload error'), type: 'error' });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || !submissionUrl.trim()) {
      setToast({ message: 'Please upload a file or provide a valid submission URL.', type: 'error' });
      return;
    }

    setSubmittingWork(true);
    try {
      await assignmentsApi.submit(submittingAssignment.id, submissionUrl.trim());
      setToast({ message: 'Assignment submitted successfully!', type: 'success' });
      setSubmittingAssignment(null);
      setSubmissionUrl('');
      loadAssignments();
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to submit work', type: 'error' });
    } finally {
      setSubmittingWork(false);
    }
  };

  if (loading) return <FullPageLoader />;

  const tabs = isStudent 
    ? (['pending', 'submitted', 'graded'] as const) 
    : (['registry', 'pending', 'submitted', 'graded'] as const);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <GlassCard className="p-6 md:p-8 rounded-[2rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">
              <ListFilter size={14} /> Coursework & Assessment Hub
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Assignment Portal</h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Submit assignments, track evaluation feedback, and record verified course marks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFacultyOrAdmin && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 glass-btn-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30"
              >
                Create Assignment
              </button>
            )}
            <button 
              onClick={loadAllData} 
              className="p-2.5 glass-btn rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh Assignments"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs */}
          <div className="flex glass p-1.5 rounded-2xl">
            {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === tab ? 'glass-btn-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'registry' ? 'Grading Registry' : tab}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* ---------------------------------------------------------------- */}
            {/* TAB: FACULTY GRADING REGISTRY */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === 'registry' && isFacultyOrAdmin ? (
              submissions.length === 0 ? (
                <GlassCard className="p-12 rounded-[2rem] text-center" hover={false}>
                  <AlertCircle size={36} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="text-base font-bold text-slate-300">No Student Submissions</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Students have not submitted any files for your coursework yet.
                  </p>
                </GlassCard>
              ) : (
                submissions.map((sub) => (
                  <GlassCard key={sub.id} className="p-6 rounded-[2rem]" hover={false}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono font-bold text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {sub.assignment_title}
                          </span>
                          <span className="text-xs font-bold text-slate-300 ml-1">
                            {sub.student_name}
                          </span>
                        </div>

                        <div className="space-y-1.5 mt-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submission File</p>
                          <a 
                            href={sub.file_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 break-all"
                          >
                            <span>{sub.file_url}</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        </div>

                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3">
                          Submitted: {new Date(sub.submitted_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between items-end shrink-0">
                        {sub.status === 'SUBMITTED' ? (
                          <button 
                            onClick={() => setGradingSubmission(sub)}
                            className="px-5 py-2.5 glass-btn-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                          >
                            <Award size={14} /> Grade Work
                          </button>
                        ) : (
                          <div className="text-right">
                            <p className="text-2xl font-black text-slate-100 font-mono leading-none">
                              {sub.marks_obtained} <span className="text-xs text-slate-500">/ {sub.max_marks || 100}</span>
                            </p>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider badge-emerald text-emerald-300 mt-2">
                              <CheckCircle2 size={12} /> Graded
                            </span>
                            <div className="mt-2">
                              <button
                                onClick={() => setGradingSubmission(sub)}
                                className="text-[10px] text-indigo-400 hover:underline font-bold uppercase"
                              >
                                Edit Grade
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {sub.feedback && (
                      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex gap-3">
                        <div className="p-2 glass rounded-lg text-indigo-400 h-fit shrink-0">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Faculty Feedback</p>
                          <p className="text-xs text-slate-300 font-medium italic leading-relaxed">"{sub.feedback}"</p>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                ))
              )
            ) : (
              /* ---------------------------------------------------------------- */
              /* TABS: PENDING / SUBMITTED / GRADED */
              /* ---------------------------------------------------------------- */
              assignments.filter((a) => a.status.toLowerCase() === activeTab).length === 0 ? (
                <GlassCard className="p-12 rounded-[2rem] text-center" hover={false}>
                  <AlertCircle size={36} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="text-base font-bold text-slate-300">No Assignments in this Section</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    There are currently no coursework items with status <span className="uppercase font-bold">{activeTab}</span>.
                  </p>
                </GlassCard>
              ) : (
                assignments.filter((a) => a.status.toLowerCase() === activeTab).map((a) => (
                  <GlassCard key={a.id} className="p-6 md:p-8 rounded-[2rem]" hover={false}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono font-bold text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {a.course_name}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-100 tracking-tight mb-1.5">{a.title}</h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-2xl">
                          {a.description || 'Complete the assigned coursework according to the syllabus requirements.'}
                        </p>
                        
                        <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/[0.06]">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar size={14} className="text-indigo-400" />
                            <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <BarChart3 size={14} className="text-indigo-400" />
                            <span>Max Marks: {a.max_marks}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end shrink-0">
                        {a.status === 'PENDING' || a.status === 'LATE' ? (
                          isStudent ? (
                            <button 
                              onClick={() => {
                                setSubmittingAssignment(a);
                                setSubmissionUrl('');
                              }} 
                              className="px-6 py-3 glass-btn-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                              <Upload size={16} /> Submit Work
                            </button>
                          ) : (
                            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-300 uppercase">
                              Active
                            </span>
                          )
                        ) : a.status === 'SUBMITTED' ? (
                          <div className="flex flex-col items-end">
                            <span className="px-3 py-1.5 badge-emerald text-emerald-300 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5">
                              <CheckCircle2 size={14} /> Submitted
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 font-medium">Awaiting Evaluation</span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-3xl font-black text-slate-100 font-mono leading-none">
                              {a.marks_obtained} <span className="text-sm text-slate-500">/{a.max_marks}</span>
                            </p>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider badge-emerald text-emerald-300 mt-2">
                              <CheckCircle2 size={12} /> Graded
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Student Feedback Display */}
                    {a.feedback && (
                      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex gap-3">
                        <div className="p-2 glass rounded-lg text-indigo-400 h-fit shrink-0">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Faculty Feedback</p>
                          <p className="text-xs text-slate-300 font-medium italic leading-relaxed">"{a.feedback}"</p>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                ))
              )
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <GlassCard className="p-6 rounded-[2rem]" hover={false}>
            <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400" /> Submission Guidelines
            </h4>
            <ul className="space-y-3">
              {[
                'Direct file upload (.pdf, .zip, .docx)',
                'Or provide external repository link (GitHub/GitLab)',
                'Max file size: 25MB per submission',
                'Late submissions subject to institutional review',
              ].map((rule, i) => (
                <li key={i} className="flex items-center gap-2.5 text-xs text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* FACULTY: CREATE ASSIGNMENT MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><FileText size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Create Assignment</h3>
                <p className="text-xs text-slate-400 font-medium">Publish a new coursework requirement</p>
              </div>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Target Course Cohort *
                </label>
                <select 
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white bg-slate-900 cursor-pointer"
                  required
                >
                  {courses.length === 0 && <option value="">No courses found</option>}
                  {courses.map((course) => (
                    <option key={course.id} className="bg-slate-900" value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Assignment Title *
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Distributed Cache & Key-Value Store"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Description & Requirements
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide specifications, repository links, or grading criteria..."
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Max Marks *
                  </label>
                  <input 
                    type="number" 
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white"
                    min={1}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Due Date *
                  </label>
                  <input 
                    type="datetime-local" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-6 py-2.5 glass-btn-primary rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg disabled:opacity-50"
                >
                  {creating ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* STUDENT: SUBMIT WORK MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {submittingAssignment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl relative">
            <button 
              onClick={() => setSubmittingAssignment(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><Upload size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Submit Assignment</h3>
                <p className="text-xs text-slate-400 font-medium">{submittingAssignment.title}</p>
              </div>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              {/* Direct File Upload */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Upload File
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                {uploadingFile && (
                  <p className="text-[10px] text-indigo-300 flex items-center gap-1.5 mt-1.5">
                    <Loader2 size={12} className="animate-spin" /> Uploading file securely...
                  </p>
                )}
              </div>

              {/* Or Work URL */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Work File URL or Repository Link *
                </label>
                <input 
                  type="text" 
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="e.g. /api/upload/file/... or https://github.com/my-repo"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingWork || uploadingFile || !submissionUrl.trim()}
                  className="px-6 py-2.5 glass-btn-primary rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingWork ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {submittingWork ? 'Submitting...' : 'Submit Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SINGLE UNIFIED RUBRIC / GRADING MODAL */}
      {/* ---------------------------------------------------------------------- */}
      <RubricGradingModal
        isOpen={Boolean(gradingSubmission)}
        submission={gradingSubmission}
        onClose={() => setGradingSubmission(null)}
        onSubmitGrade={handleGradeSubmit}
      />

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div 
            className={`px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border ${
              toast.type === 'success' 
                ? 'bg-slate-900 border-emerald-500/30 text-emerald-300' 
                : 'bg-slate-900 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="text-rose-400" />
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentModule;
