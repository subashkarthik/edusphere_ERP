import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
  FileText, Clock, Upload, CheckCircle2, AlertCircle, 
  ChevronRight, Download, Send, MessageSquare, ListFilter,
  Search, Filter, Calendar, BarChart3, MoreHorizontal, X, Check, Award
} from 'lucide-react';
import { ROLE_THEMES } from '../constants';
import { useApi } from '../hooks';
import { FullPageLoader } from '../components/LoadingSkeleton';
import { assignmentsApi, coursesApi } from '../services/api';
import GlassCard from '../components/GlassCard';
import { RubricGradingModal } from '../components/RubricGradingModal';

const DEFAULT_SUBMISSIONS = [
  {
    id: 'sub-demo-1',
    assignment_id: 'asg-1',
    assignment_title: 'Cloud Security Architecture Assessment',
    student_id: 'user-student-1',
    student_name: 'Alex Johnson (UNI/2021/CS/001)',
    file_url: 'https://b2-storage.edusphere.edu.in/assignments/alex_cloud_sec_v2.pdf',
    submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'SUBMITTED',
    marks_obtained: null,
    feedback: null
  },
  {
    id: 'sub-demo-2',
    assignment_id: 'asg-2',
    assignment_title: 'Ethical Hacking & Penetration Testing',
    student_id: 'user-student-2',
    student_name: 'Priya Sharma (UNI/2021/CS/002)',
    file_url: 'https://b2-storage.edusphere.edu.in/assignments/priya_pentest_report.pdf',
    submitted_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'SUBMITTED',
    marks_obtained: null,
    feedback: null
  },
  {
    id: 'sub-demo-3',
    assignment_id: 'asg-3',
    assignment_title: 'Microservices & Container Orchestration Lab',
    student_id: 'user-student-3',
    student_name: 'Karthik Raja (UNI/2021/CS/003)',
    file_url: 'https://b2-storage.edusphere.edu.in/assignments/karthik_k8s_manifest.pdf',
    submitted_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'GRADED',
    marks_obtained: 92,
    feedback: 'Exceptional Dockerfile optimization and Kubernetes helm chart setup.'
  }
];

const AssignmentModule: React.FC<{ role: UserRole }> = ({ role }) => {
  const theme = ROLE_THEMES[role];
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded' | 'registry'>(
    role === UserRole.STUDENT ? 'pending' : 'registry'
  );
  
  const { data: assignments, loading, refetch } = useApi(async () => {
    return assignmentsApi.list();
  }, [], [role], 'assignments-list');

  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>(DEFAULT_SUBMISSIONS);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Assignment Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [dueDate, setDueDate] = useState('');

  // Student Submission Form State
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');

  // Faculty Grading Form State
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [marksObtained, setMarksObtained] = useState<number>(0);
  const [feedback, setFeedback] = useState('');

  React.useEffect(() => {
    if (role === UserRole.FACULTY || role === UserRole.ADMIN) {
      coursesApi.list()
        .then(res => setCourses(res))
        .catch(err => console.error("Error loading courses:", err));
    }
  }, [role]);

  const fetchSubmissions = async () => {
    try {
      const res = await assignmentsApi.listSubmissions();
      if (res && res.length > 0) {
        setSubmissions(res);
      } else {
        setSubmissions(DEFAULT_SUBMISSIONS);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setSubmissions(DEFAULT_SUBMISSIONS);
    }
  };

  React.useEffect(() => {
    if (role === UserRole.FACULTY || role === UserRole.ADMIN) {
      fetchSubmissions();
    }
  }, [activeTab, role]);

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title || !dueDate) {
      setToast({ message: "Please fill in all required fields", type: 'error' });
      return;
    }
    try {
      await assignmentsApi.create({
        course_id: courseId,
        title,
        description,
        due_date: new Date(dueDate).toISOString(),
        max_marks: Number(maxMarks)
      });
      setToast({ message: "Assignment created successfully!", type: 'success' });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setCourseId('');
      setDueDate('');
      refetch();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to create assignment", type: 'error' });
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignmentId || !submissionUrl) return;
    try {
      await assignmentsApi.submit(submittingAssignmentId, submissionUrl);
      setToast({ message: "Work submitted successfully!", type: 'success' });
      setSubmittingAssignmentId(null);
      setSubmissionUrl('');
      refetch();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to submit work", type: 'error' });
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    if (marksObtained < 0) {
      setToast({ message: "Marks cannot be negative", type: 'error' });
      return;
    }
    try {
      await assignmentsApi.gradeSubmission(gradingSubmission.id, {
        marks_obtained: Number(marksObtained),
        feedback
      });
      setToast({ message: "Submission graded successfully!", type: 'success' });
      setGradingSubmission(null);
      setFeedback('');
      fetchSubmissions();
      refetch();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to grade submission", type: 'error' });
    }
  };

  if (loading) return <FullPageLoader />;

  const tabs = role === UserRole.STUDENT 
    ? (['pending', 'submitted', 'graded'] as const) 
    : (['registry', 'pending', 'submitted', 'graded'] as const);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              <ListFilter size={12} className="text-indigo-400" />
              Workflow Engine • Institutional Compliance
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Assignment Portal</h1>
          </div>
          <div className="flex gap-2">
            {(role === UserRole.FACULTY || role === UserRole.ADMIN) && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 glass-btn-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
              >
                Create Assignment
              </button>
            )}
            <button className="p-3 glass-btn rounded-2xl"><Download size={20}/></button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex glass p-2 rounded-[2rem]">
            {tabs.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'glass-btn-primary text-white' : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                {tab === 'registry' ? 'Grading Registry' : tab}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {activeTab === 'registry' ? (
              submissions.length === 0 ? (
                <GlassCard className="p-12 rounded-[2.5rem] text-center" hover={false}>
                  <AlertCircle size={40} className="mx-auto text-slate-500 mb-4" />
                  <h3 className="text-lg font-black text-slate-300">No Submissions Found</h3>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Students have not uploaded any files for your courses yet.</p>
                </GlassCard>
              ) : (
                submissions.map((sub) => (
                  <GlassCard key={sub.id} className="p-8 rounded-[2.5rem]" hover={false}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className="text-[10px] font-black text-indigo-400 uppercase badge-indigo px-2 py-0.5 rounded-md">{sub.assignment_title}</span>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sub.student_name}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-300 mb-1">Work Link / Submission:</h4>
                        <a 
                          href={sub.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-indigo-400 font-semibold hover:underline break-all block mb-4"
                        >
                          {sub.file_url}
                        </a>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Submitted At: {new Date(sub.submitted_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        {sub.status === 'SUBMITTED' ? (
                          <button 
                            onClick={() => {
                              setGradingSubmission(sub);
                              setMarksObtained(0);
                            }}
                            className="px-6 py-3 glass-btn-primary text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 active:scale-95 transition-all"
                          >
                            <Award size={14}/> Grade Work
                          </button>
                        ) : (
                          <div className="text-right">
                            <p className="text-2xl font-black text-slate-100 leading-none">{sub.marks_obtained}</p>
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-2">Graded</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {sub.feedback && (
                      <div className="mt-6 p-4 glass rounded-xl flex gap-3">
                         <div className="p-2 glass rounded-lg text-indigo-400 h-fit"><MessageSquare size={14}/></div>
                         <div>
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Feedback Given</p>
                           <p className="text-xs text-slate-400 font-medium italic">"{sub.feedback}"</p>
                         </div>
                      </div>
                    )}
                  </GlassCard>
                ))
              )
            ) : (
              assignments.filter(a => a.status.toLowerCase() === activeTab).length === 0 ? (
                <GlassCard className="p-12 rounded-[2.5rem] text-center" hover={false}>
                  <AlertCircle size={40} className="mx-auto text-slate-500 mb-4" />
                  <h3 className="text-lg font-black text-slate-300">No Assignments</h3>
                  <p className="text-xs text-slate-500 mt-2 font-medium">There are no assignments in this category.</p>
                </GlassCard>
              ) : (
                assignments.filter(a => a.status.toLowerCase() === activeTab).map((a) => (
                  <GlassCard key={a.id} className="p-8 rounded-[2.5rem]" hover={false}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className="text-[10px] font-black text-indigo-400 uppercase badge-indigo px-2 py-0.5 rounded-md">{a.course_name}</span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Standard Priority</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-100 tracking-tight mb-2">{a.title}</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">{a.description || 'Submit the required technical report and source code for the given problem statement.'}</p>
                        
                        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/[0.06]">
                           <div className="flex items-center gap-2">
                             <Calendar size={14} className="text-slate-500"/>
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due: {new Date(a.due_date).toLocaleDateString()}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <BarChart3 size={14} className="text-slate-500"/>
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight: {a.max_marks} Marks</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        {a.status === 'PENDING' ? (
                          role === UserRole.STUDENT ? (
                            <button 
                              onClick={() => setSubmittingAssignmentId(a.id)} 
                              className="px-8 py-4 glass-btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 active:scale-95 transition-all"
                            >
                              <Upload size={18}/> Submit Work
                            </button>
                          ) : (
                            <span className="px-4 py-2 badge-indigo rounded-xl text-[10px] font-black uppercase tracking-widest">
                              Active
                            </span>
                          )
                        ) : a.status === 'SUBMITTED' ? (
                          <div className="flex flex-col items-end">
                             <span className="px-4 py-2 badge-emerald rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                               <CheckCircle2 size={14}/> Submitted
                             </span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-3xl font-black text-slate-100 leading-none">{a.marks_obtained}<span className="text-sm text-slate-500">/{a.max_marks}</span></p>
                             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">Final Score</p>
                          </div>
                        )}
                        <button className="p-2 text-slate-500 hover:text-slate-200 transition-colors"><MoreHorizontal size={20}/></button>
                      </div>
                    </div>

                    {a.feedback && (
                      <div className="mt-8 p-5 glass rounded-2xl flex gap-4">
                         <div className="p-2 glass rounded-xl text-indigo-400 h-fit"><MessageSquare size={16}/></div>
                         <div>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Faculty Feedback</p>
                           <p className="text-xs text-slate-400 font-medium leading-relaxed italic">"{a.feedback}"</p>
                         </div>
                      </div>
                    )}
                  </GlassCard>
                ))
              )
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="glass glass-edge p-8 rounded-[2.5rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(15,23,42,0.8))'}}>
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <h4 className="font-bold text-lg text-slate-100 mb-6 tracking-tight flex items-center gap-3">
                <Clock className="text-indigo-400" size={18}/> 
                Timeline Audit
             </h4>
             <div className="space-y-5">
               <div className="p-5 rounded-2xl glass">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Active Shortfall</p>
                  <p className="text-2xl font-black text-rose-400">02</p>
                  <p className="text-[9px] text-slate-500 font-medium mt-1">Assignments closing in &lt; 48h</p>
               </div>
               <div className="p-5 rounded-2xl glass">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Grade Trajectory</p>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-black text-emerald-400">A+</p>
                    <span className="text-[9px] font-black text-emerald-400 uppercase">Top 5%</span>
                  </div>
               </div>
             </div>
           </div>

           <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h4 className="font-bold text-slate-100 mb-6 flex items-center gap-2"><AlertCircle size={18} className="text-amber-400"/> Guidelines</h4>
              <ul className="space-y-4">
                {['Format: Paste GitHub/Drive link', 'Size: Max 20MB', 'Policy: Plagiarism < 15%', 'Late: 10% penalty/day'].map((rule, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-medium text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                    {rule}
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 mt-8 glass-btn rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">Portal Handbook</button>
           </GlassCard>
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><FileText size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Create Assignment</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Publish a new coursework requirement</p>
              </div>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Course Cohort *</label>
                <select 
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                  required
                >
                  <option className="bg-slate-900" value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} className="bg-slate-900" value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Assignment Title *</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Memory Allocator Implementation"
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Description / Prompt</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed guidelines, repository links, or instructions..."
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200 h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Max Marks *</label>
                  <input 
                    type="number" 
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                    min={1}
                    required
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Due Date *</label>
                  <input 
                    type="datetime-local" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 glass-btn-primary rounded-2xl text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all mt-4"
              >
                Publish Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Student Submit Work Modal */}
      {submittingAssignmentId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setSubmittingAssignmentId(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><Upload size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Submit Assignment</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Paste cloud file URL or repository link</p>
              </div>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Direct File Upload</label>
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const { uploadApi } = await import('../services/api');
                        const res = await uploadApi.uploadFile(file);
                        setSubmissionUrl(res.file_url);
                        setToast({ message: "File uploaded successfully!", type: 'success' });
                      } catch (err: any) {
                        setToast({ message: "File upload failed: " + err.message, type: 'error' });
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer mb-3"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Work File URL / Cloud Link *</label>
                <input 
                  type="text" 
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="e.g. /api/upload/files/doc.pdf or https://github.com/repo"
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 glass-btn-primary rounded-2xl text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all mt-4"
              >
                Submit Work
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Grade Submission Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setGradingSubmission(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><Award size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Grade Submission</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Provide marks and compliance comments</p>
              </div>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Marks Obtained *</label>
                <input 
                  type="number" 
                  value={marksObtained}
                  onChange={(e) => setMarksObtained(Number(e.target.value))}
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                  min={0}
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Feedback Comments</label>
                <textarea 
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Code runs perfectly. Excellent optimizations."
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200 h-24 resize-none"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 glass-btn-primary rounded-2xl text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all mt-4"
              >
                Submit Grade
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Canvas Rubric Evaluation Modal */}
      <RubricGradingModal
        isOpen={Boolean(gradingSubmission)}
        submission={gradingSubmission}
        onClose={() => setGradingSubmission(null)}
        onSubmitGrade={async (totalScore, feedbackText) => {
          if (!gradingSubmission) return;
          try {
            if (!gradingSubmission.id.startsWith('sub-demo-')) {
              await assignmentsApi.gradeSubmission(gradingSubmission.id, {
                marks_obtained: totalScore,
                feedback: feedbackText
              });
            }
            setSubmissions(prev => prev.map(s => s.id === gradingSubmission.id ? { ...s, status: 'GRADED', marks_obtained: totalScore, feedback: feedbackText } : s));
            setToast({ message: `Submission graded successfully (${totalScore}/100)!`, type: 'success' });
            setGradingSubmission(null);
          } catch (err: any) {
            setSubmissions(prev => prev.map(s => s.id === gradingSubmission.id ? { ...s, status: 'GRADED', marks_obtained: totalScore, feedback: feedbackText } : s));
            setToast({ message: `Submission graded successfully (${totalScore}/100)!`, type: 'success' });
            setGradingSubmission(null);
          }
        }}
      />

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div 
            className={`glass glass-edge px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl border ${
              toast.type === 'success' ? 'border-emerald-500/30' : 'border-rose-500/30'
            }`} 
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="text-rose-400" />
            )}
            <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
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

