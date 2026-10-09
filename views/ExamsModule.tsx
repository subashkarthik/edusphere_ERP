import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { 
  Download, Clock, ShieldAlert, CheckCircle2, XCircle, Award, 
  Plus, FileText, Check, ArrowRight, RefreshCw, AlertTriangle,
  Trash2, BookOpen, Users, BarChart3, HelpCircle, ChevronRight, X
} from 'lucide-react';
import { examApi, examsApi, coursesApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface ModuleProps { 
  id: string; 
  role: UserRole; 
}

interface QuestionFormItem {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  marks: number;
}

export const ExamsModule: React.FC<ModuleProps> = ({ role }) => {
  const isStudent = role === UserRole.STUDENT;
  const isFacultyOrAdmin = role === UserRole.FACULTY || role === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<'quizzes' | 'transcripts'>('quizzes');
  
  // Quizzes list state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);

  // Quiz Taker State
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<any | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [violations, setViolations] = useState(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Stale-closure safe refs for timer / auto-submit
  const answersRef = useRef<Record<string, string>>({});
  const violationsRef = useRef<number>(0);
  const activeQuizIdRef = useRef<string | null>(null);
  const submittingRef = useRef<boolean>(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  useEffect(() => {
    activeQuizIdRef.current = activeQuizId;
  }, [activeQuizId]);

  useEffect(() => {
    submittingRef.current = submittingQuiz;
  }, [submittingQuiz]);

  // Faculty Quiz Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizCourseId, setNewQuizCourseId] = useState('');
  const [newQuizDescription, setNewQuizDescription] = useState('');
  const [newQuizTimeLimit, setNewQuizTimeLimit] = useState(15);
  const [newQuizPassPct, setNewQuizPassPct] = useState(60);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newQuizQuestions, setNewQuizQuestions] = useState<QuestionFormItem[]>([
    {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
      explanation: '',
      marks: 10,
    },
  ]);

  // Faculty View Attempts State
  const [viewingAttemptsQuizId, setViewingAttemptsQuizId] = useState<string | null>(null);
  const [attemptsData, setAttemptsData] = useState<any | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Transcripts & Schedules State
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);

  // ---------------------------------------------------------------------------
  // Data Loaders
  // ---------------------------------------------------------------------------
  const loadQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const data = await examApi.getQuizzes();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      setQuizzes([]);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await coursesApi.list(true);
      const list = Array.isArray(data) ? data : [];
      setCourses(list);
      if (list.length > 0 && !newQuizCourseId) {
        setNewQuizCourseId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const loadTranscriptsAndSchedules = async () => {
    setLoadingTranscripts(true);
    try {
      const [scheds, trans] = await Promise.all([
        examsApi.schedules().catch(() => []),
        isStudent ? examsApi.transcripts().catch(() => []) : Promise.resolve([]),
      ]);
      setSchedules(Array.isArray(scheds) ? scheds : []);
      setTranscripts(Array.isArray(trans) ? trans : []);
    } catch (err) {
      console.error('Failed to load transcripts/schedules:', err);
    } finally {
      setLoadingTranscripts(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
    if (isFacultyOrAdmin) {
      loadCourses();
    }
    loadTranscriptsAndSchedules();
  }, [role, isFacultyOrAdmin]);

  // ---------------------------------------------------------------------------
  // Anti-Cheat Tab Switch Listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeQuizId || quizResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeQuizId, quizResult]);

  // ---------------------------------------------------------------------------
  // Countdown Timer with Stale-Closure Fix
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeQuizId || quizResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit using latest state from refs
          triggerSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuizId, quizResult, timeLeft]);

  // ---------------------------------------------------------------------------
  // Quiz Taking Operations
  // ---------------------------------------------------------------------------
  const startQuiz = async (quizId: string) => {
    setLoadingQuiz(true);
    setQuizResult(null);
    setAnswers({});
    setViolations(0);
    setCurrentQIndex(0);
    
    try {
      const details = await examApi.getQuizDetails(quizId);
      if (!details || !details.questions || details.questions.length === 0) {
        alert('This quiz has no questions yet.');
        return;
      }
      setQuizDetails(details);
      setActiveQuizId(quizId);
      setTimeLeft((details.time_limit_minutes || 15) * 60);
    } catch (err: any) {
      alert(err.message || 'Failed to open quiz');
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const triggerSubmit = async (isAuto: boolean = false) => {
    const currentQuizId = activeQuizIdRef.current;
    if (!currentQuizId || submittingRef.current) return;

    setSubmittingQuiz(true);
    try {
      const result = await examApi.submitQuiz(
        currentQuizId, 
        answersRef.current, 
        violationsRef.current
      );
      setQuizResult(result);
      loadQuizzes(); // Refresh list to reflect latest score and status
    } catch (err: any) {
      alert('Error submitting quiz: ' + (err.message || 'Submission failed'));
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Faculty: Create Quiz Operations
  // ---------------------------------------------------------------------------
  const handleAddQuestion = () => {
    setNewQuizQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
        marks: 10,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (newQuizQuestions.length <= 1) return;
    setNewQuizQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionFormItem, value: any) => {
    setNewQuizQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizCourseId) {
      setCreateFeedback({ type: 'error', text: 'Please select a course for the quiz.' });
      return;
    }

    // Validate questions
    for (let i = 0; i < newQuizQuestions.length; i++) {
      const q = newQuizQuestions[i];
      if (!q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        setCreateFeedback({ 
          type: 'error', 
          text: `Please fill in all options and question text for Question #${i + 1}.` 
        });
        return;
      }
    }

    setCreatingQuiz(true);
    setCreateFeedback(null);

    try {
      await examApi.createQuiz({
        course_id: newQuizCourseId,
        title: newQuizTitle,
        description: newQuizDescription || undefined,
        time_limit_minutes: newQuizTimeLimit,
        passing_percentage: newQuizPassPct,
        questions: newQuizQuestions,
      });

      setShowCreateModal(false);
      // Reset form
      setNewQuizTitle('');
      setNewQuizDescription('');
      setNewQuizQuestions([
        {
          question_text: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_option: 'A',
          explanation: '',
          marks: 10,
        },
      ]);
      loadQuizzes();
    } catch (err: any) {
      setCreateFeedback({ type: 'error', text: err.message || 'Failed to create quiz' });
    } finally {
      setCreatingQuiz(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Faculty: View Attempts
  // ---------------------------------------------------------------------------
  const handleViewAttempts = async (quizId: string) => {
    setViewingAttemptsQuizId(quizId);
    setLoadingAttempts(true);
    try {
      const data = await examApi.getQuizAttempts(quizId);
      setAttemptsData(data);
    } catch (err: any) {
      console.error('Failed to load quiz attempts:', err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Module Header */}
      <GlassCard className="p-6 rounded-[2rem]" hover={false}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">
              <Award size={14} /> Examinations & Quizzes
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Assessment Engine</h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Online MCQ assessments, live countdown proctoring, and official academic transcripts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isFacultyOrAdmin && (
              <button
                onClick={() => {
                  setCreateFeedback(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 glass-btn-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30"
              >
                <Plus size={16} /> Create Quiz
              </button>
            )}

            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === 'quizzes' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Online Quizzes
              </button>
              <button
                onClick={() => setActiveTab('transcripts')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === 'transcripts' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Transcripts & Schedules
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB: ONLINE QUIZZES */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          {loadingQuizzes ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-indigo-400" size={28} />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Assessments...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <GlassCard className="p-12 text-center rounded-[2rem]" hover={false}>
              <HelpCircle className="mx-auto text-slate-600 mb-3" size={40} />
              <h3 className="text-base font-bold text-slate-300">No Online Quizzes Available</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium mt-1">
                {isStudent
                  ? 'No active quizzes found for your enrolled courses. Check back later when your instructors publish tests.'
                  : 'You have not created any quizzes yet. Click "Create Quiz" above to publish your first assessment.'}
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => {
                const hasAttempted = quiz.attempted;
                const passed = quiz.passed;

                return (
                  <GlassCard
                    key={quiz.id}
                    className="p-6 rounded-[2rem] flex flex-col justify-between border-white/[0.08] hover:border-indigo-500/40 transition-all"
                    hover={false}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-bold text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                          {quiz.course_code}
                        </span>

                        {isStudent && (
                          hasAttempted ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                passed ? 'badge-emerald text-emerald-300' : 'badge-rose text-rose-300'
                              }`}
                            >
                              {passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {passed ? `Score: ${quiz.best_score} (${quiz.percentage}%)` : `Failed (${quiz.percentage}%)`}
                            </span>
                          ) : (
                            <span className="badge-amber text-amber-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              Unattempted
                            </span>
                          )
                        )}

                        {isFacultyOrAdmin && (
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                            {quiz.attempts_count} {quiz.attempts_count === 1 ? 'Attempt' : 'Attempts'}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-slate-100 mb-1 leading-snug">{quiz.title}</h3>
                      <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                        {quiz.description || quiz.course_name}
                      </p>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center mb-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Duration</p>
                          <p className="text-xs font-bold text-slate-200 mt-0.5">{quiz.time_limit_minutes}m</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Questions</p>
                          <p className="text-xs font-bold text-indigo-300 mt-0.5">{quiz.total_questions}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pass Mark</p>
                          <p className="text-xs font-bold text-emerald-400 mt-0.5">{quiz.passing_percentage}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {isStudent && (
                        <button
                          onClick={() => startQuiz(quiz.id)}
                          className="w-full py-3 glass-btn-primary text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          {hasAttempted ? <RefreshCw size={14} /> : <FileText size={14} />}
                          {hasAttempted ? 'Retake Quiz' : 'Start Online Quiz'}
                        </button>
                      )}

                      {isFacultyOrAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewAttempts(quiz.id)}
                            className="flex-1 py-2.5 glass-btn rounded-xl text-xs font-bold text-indigo-300 hover:text-white uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            <BarChart3 size={14} /> View Results
                          </button>
                          <button
                            onClick={() => startQuiz(quiz.id)}
                            className="py-2.5 px-4 glass-btn rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
                            title="Preview Quiz"
                          >
                            Preview
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB: TRANSCRIPTS & SCHEDULES */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'transcripts' && (
        <div className="space-y-6">
          {schedules.length > 0 && (
            <GlassCard className="p-6 rounded-[2rem] border-amber-500/20" hover={false}>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-4">
                <Clock size={14} /> Upcoming University Exam Schedules
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedules.map((exam, i) => (
                  <GlassCard key={i} className="p-4 rounded-xl" hover={false}>
                    <p className="font-bold text-sm text-slate-200">{exam.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {exam.course_name} • {exam.exam_type}
                    </p>
                    <p className="text-xs text-amber-400 font-mono font-bold mt-2">
                      {new Date(exam.exam_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </GlassCard>
                ))}
              </div>
            </GlassCard>
          )}

          {isStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {transcripts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                  No transcripts records found.
                </div>
              ) : (
                transcripts.map((sem) => (
                  <GlassCard key={sem.semester} className="rounded-[2rem] p-6" hover={false}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs">
                        {sem.semester}
                      </h3>
                      <div className="w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-400">
                        <Award size={16} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {sem.courses?.map((course: any) => (
                        <div
                          key={course.course_name}
                          className="flex justify-between items-center pb-2.5 border-b border-white/[0.04] last:border-0 text-xs"
                        >
                          <p className="font-bold text-slate-300 uppercase pr-4">{course.course_name}</p>
                          <span className="font-black text-indigo-400 font-mono">{course.grade}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        SGPA
                      </span>
                      <span className="text-lg font-black text-indigo-400 font-mono">{sem.sgpa}</span>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* QUIZ PLAYER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {activeQuizId && quizDetails && !quizResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Quiz Player Header */}
            <div className="p-6 bg-slate-950 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  {quizDetails.course_code} • Assessment Test
                </span>
                <h3 className="text-lg font-black text-white">{quizDetails.title}</h3>
              </div>

              {/* Timer & Violations */}
              <div className="flex items-center gap-4">
                {violations > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold animate-pulse">
                    <ShieldAlert size={14} />
                    <span>Violations: {violations}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-xl font-mono text-sm font-black">
                  <Clock size={16} />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            {/* Anti-Cheat Notice */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center gap-2 text-amber-300 text-xs font-medium">
              <AlertTriangle size={14} />
              <span>Anti-Cheat Proctor: Please do not switch browser tabs or minimize the window during examination.</span>
            </div>

            {/* Quiz Question Body */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {quizDetails.questions && quizDetails.questions[currentQIndex] && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-bold">
                    <span>Question {currentQIndex + 1} of {quizDetails.questions.length}</span>
                    <span className="text-indigo-400 font-mono">
                      {quizDetails.questions[currentQIndex].marks} Marks
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-100 mb-6 leading-relaxed">
                    {quizDetails.questions[currentQIndex].question_text}
                  </h4>

                  {/* MCQ Options */}
                  <div className="grid grid-cols-1 gap-3">
                    {['A', 'B', 'C', 'D'].map((optKey) => {
                      const optText = quizDetails.questions[currentQIndex][`option_${optKey.toLowerCase()}`];
                      const qId = quizDetails.questions[currentQIndex].id;
                      const isSelected = answers[qId] === optKey;

                      return (
                        <button
                          key={optKey}
                          type="button"
                          onClick={() => handleSelectAnswer(qId, optKey)}
                          className={`p-4 rounded-2xl text-left border transition-all flex items-center gap-4 ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20'
                              : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/10'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black uppercase ${
                              isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {optKey}
                          </span>
                          <span className="text-sm flex-1">{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Footer Navigation */}
            <div className="p-6 bg-slate-950 border-t border-white/10 flex items-center justify-between">
              <button
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((p) => p - 1)}
                className="px-5 py-2.5 glass-btn disabled:opacity-40 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Previous
              </button>

              <div className="flex gap-1 overflow-x-auto max-w-xs px-2">
                {quizDetails.questions?.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      idx === currentQIndex
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                        : answers[quizDetails.questions[idx]?.id]
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800/80 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {currentQIndex < (quizDetails.questions?.length || 0) - 1 ? (
                <button
                  onClick={() => setCurrentQIndex((p) => p + 1)}
                  className="px-5 py-2.5 glass-btn-primary text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => triggerSubmit(false)}
                  disabled={submittingQuiz}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingQuiz ? 'Grading...' : 'Submit Exam'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* QUIZ RESULT & REVIEW MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {quizResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl flex flex-col max-h-[90vh] space-y-6">
            <div className="text-center space-y-2">
              <div
                className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                  quizResult.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {quizResult.passed ? <Award size={36} /> : <XCircle size={36} />}
              </div>

              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {quizResult.quiz_title}
              </span>
              <h3 className="text-2xl font-black text-white">
                {quizResult.passed ? 'Assessment Passed!' : 'Assessment Failed'}
              </h3>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-white/5 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Score</p>
                <p className="text-xl font-black text-indigo-400 font-mono mt-0.5">
                  {quizResult.score} / {quizResult.total_marks}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Percentage</p>
                <p className="text-xl font-black text-white font-mono mt-0.5">
                  {quizResult.percentage}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Violations</p>
                <p className="text-xl font-black text-amber-400 font-mono mt-0.5">
                  {quizResult.tab_switch_violations}
                </p>
              </div>
            </div>

            {/* Question by Question Review */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Detailed Answer Review
              </h4>
              {(quizResult.review || []).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border text-left space-y-2 ${
                    item.is_correct
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-rose-500/5 border-rose-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-bold text-slate-200">
                      <span className="text-slate-400 font-mono mr-1">Q{idx + 1}.</span> {item.question_text}
                    </p>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.is_correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {item.is_correct ? `+${item.marks} Marks` : '0 Marks'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-xl bg-slate-950/40">
                      <span className="text-[10px] text-slate-500 font-bold block">Your Answer</span>
                      <span className={`font-bold ${item.is_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Option {item.user_choice || 'None'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/40">
                      <span className="text-[10px] text-slate-500 font-bold block">Correct Answer</span>
                      <span className="font-bold text-emerald-400">
                        Option {item.correct_option}
                      </span>
                    </div>
                  </div>

                  {item.explanation && (
                    <p className="text-[11px] text-slate-400 italic pt-1">
                      Note: {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setQuizResult(null);
                setActiveQuizId(null);
                setQuizDetails(null);
              }}
              className="w-full py-3 glass-btn-primary text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-lg"
            >
              Close & Return to Assessments
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* FACULTY: VIEW ATTEMPTS MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingAttemptsQuizId && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-4xl rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  Assessment Analytics & Roster
                </span>
                <h3 className="text-xl font-black text-white">
                  {attemptsData?.quiz_title || 'Quiz Attempts'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setViewingAttemptsQuizId(null);
                  setAttemptsData(null);
                }}
                className="p-2 glass-btn rounded-xl text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {loadingAttempts ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="animate-spin text-indigo-400" size={28} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Attempt Records...</p>
              </div>
            ) : !attemptsData || attemptsData.attempts?.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                No students have taken this quiz yet.
              </div>
            ) : (
              <div className="space-y-6 pt-6 flex-1 overflow-y-auto">
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-3 gap-4">
                  <GlassCard className="p-4 rounded-xl text-center" hover={false}>
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Submissions</p>
                    <p className="text-xl font-black text-indigo-300 mt-0.5">{attemptsData.total_attempts}</p>
                  </GlassCard>
                  <GlassCard className="p-4 rounded-xl text-center" hover={false}>
                    <p className="text-[10px] font-black uppercase text-slate-400">Average Score</p>
                    <p className="text-xl font-black text-emerald-400 mt-0.5">{attemptsData.average_score} pts</p>
                  </GlassCard>
                  <GlassCard className="p-4 rounded-xl text-center" hover={false}>
                    <p className="text-[10px] font-black uppercase text-slate-400">Pass Rate</p>
                    <p className="text-xl font-black text-indigo-400 mt-0.5">{attemptsData.pass_rate}%</p>
                  </GlassCard>
                </div>

                {/* Attempts Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left glass-table">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Score</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Violations</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {attemptsData.attempts.map((att: any) => (
                        <tr key={att.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-3">
                            <div>
                              <p className="text-xs font-bold text-slate-200">{att.student_name}</p>
                              <p className="text-[10px] font-mono text-slate-400">{att.enrollment_no}</p>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-xs font-bold font-mono text-slate-200">
                              {att.score} ({att.percentage}%)
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                att.passed ? 'badge-emerald text-emerald-300' : 'badge-rose text-rose-300'
                              }`}
                            >
                              {att.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`text-xs font-mono font-bold ${
                                att.tab_switch_violations > 0 ? 'text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              {att.tab_switch_violations}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right text-xs text-slate-400">
                            {new Date(att.completed_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* FACULTY: CREATE QUIZ MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form
            onSubmit={handleCreateQuiz}
            className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2rem] p-6 shadow-2xl space-y-5 flex flex-col max-h-[92vh]"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  New Assessment
                </span>
                <h3 className="text-lg font-black text-white">Create Online Quiz</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 glass-btn rounded-xl text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {createFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  createFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}
              >
                <AlertTriangle size={16} />
                <span>{createFeedback.text}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Course Selection */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Target Course
                </label>
                <select
                  required
                  value={newQuizCourseId}
                  onChange={(e) => setNewQuizCourseId(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-xs text-white bg-slate-900 cursor-pointer"
                >
                  {courses.length === 0 && <option value="">No courses available</option>}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id} className="bg-slate-900 text-slate-200">
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quiz Title */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Quiz Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3 Cloud Architecture Assessment"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-xs text-white"
                />
              </div>

              {/* Time Limit & Passing % */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    required
                    value={newQuizTimeLimit}
                    onChange={(e) => setNewQuizTimeLimit(Number(e.target.value))}
                    className="w-full glass-input px-4 py-2 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Passing %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newQuizPassPct}
                    onChange={(e) => setNewQuizPassPct(Number(e.target.value))}
                    className="w-full glass-input px-4 py-2 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="pt-3 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">
                    Questions ({newQuizQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 glass-btn text-indigo-400 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>

                {newQuizQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-indigo-300">Question #{idx + 1}</span>
                      {newQuizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 text-rose-400 hover:text-rose-300 transition"
                          title="Remove Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Enter question prompt..."
                      value={q.question_text}
                      onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-white font-medium"
                    />

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                        <div key={opt} className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500">
                            {opt.toUpperCase()}
                          </span>
                          <input
                            type="text"
                            required
                            placeholder={`Option ${opt.toUpperCase()}`}
                            value={q[`option_${opt}`]}
                            onChange={(e) => handleQuestionChange(idx, `option_${opt}`, e.target.value)}
                            className="w-full glass-input pl-8 pr-3 py-2 rounded-xl text-xs text-white"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Correct Option & Marks */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                          Correct Option
                        </label>
                        <select
                          value={q.correct_option}
                          onChange={(e) => handleQuestionChange(idx, 'correct_option', e.target.value as any)}
                          className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-white bg-slate-900 cursor-pointer"
                        >
                          <option value="A" className="bg-slate-900">Option A</option>
                          <option value="B" className="bg-slate-900">Option B</option>
                          <option value="C" className="bg-slate-900">Option C</option>
                          <option value="D" className="bg-slate-900">Option D</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                          Marks
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={q.marks}
                          onChange={(e) => handleQuestionChange(idx, 'marks', Number(e.target.value))}
                          className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingQuiz}
                className="px-6 py-2.5 glass-btn-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg disabled:opacity-50"
              >
                {creatingQuiz ? 'Publishing...' : 'Publish Quiz'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExamsModule;
