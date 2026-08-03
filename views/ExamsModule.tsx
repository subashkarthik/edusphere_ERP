import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { ROLE_THEMES } from '../constants';
import { Download, Clock, ShieldAlert, CheckCircle2, XCircle, Award, Plus, FileText, Check, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { useApi } from '../hooks';
import { examApi, examsApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface ModuleProps { id: string; role: UserRole; }

const DEFAULT_QUIZZES = [
  {
    id: 'quiz-cyber-sec',
    title: 'Ethical Hacking & Cyber Security Fundamentals',
    description: 'Covers network security, OWASP top 10 vulnerabilities, cryptography, and penetration testing principles.',
    time_limit_minutes: 15,
    passing_percentage: 60,
    total_questions: 5,
    total_marks: 50,
    attempted: false
  },
  {
    id: 'quiz-dsa-mid',
    title: 'Data Structures & Algorithms Midterm Quiz',
    description: 'Assesses tree traversals, dynamic programming, sorting algorithms, and binary search trees.',
    time_limit_minutes: 15,
    passing_percentage: 60,
    total_questions: 5,
    total_marks: 50,
    attempted: false
  },
  {
    id: 'quiz-dbms-sql',
    title: 'Database Management Systems & SQL',
    description: 'Focuses on SQL queries, ACID transaction properties, database normalization, and indexing.',
    time_limit_minutes: 20,
    passing_percentage: 70,
    total_questions: 5,
    total_marks: 50,
    attempted: true,
    best_score: 45,
    passed: true
  },
  {
    id: 'quiz-web-tech',
    title: 'Web Technologies & REST API Architecture',
    description: 'Covers HTTP status codes, OAuth2 authentication, WebSockets, and asynchronous JavaScript execution.',
    time_limit_minutes: 15,
    passing_percentage: 60,
    total_questions: 5,
    total_marks: 50,
    attempted: false
  }
];

const FALLBACK_QUESTIONS: Record<string, any[]> = {
  'quiz-cyber-sec': [
    {
      id: 'q-cs-1',
      question_text: 'What type of attack involves an attacker placing themselves between a client and a server to intercept communications?',
      option_a: 'SQL Injection',
      option_b: 'Man-in-the-Middle (MitM)',
      option_c: 'Cross-Site Scripting (XSS)',
      option_d: 'Denial of Service (DoS)',
      correct_option: 'B',
      explanation: 'In a Man-in-the-Middle attack, the attacker secretly relays and alters communications between two parties.',
      marks: 10
    },
    {
      id: 'q-cs-2',
      question_text: 'Which cryptographic protocol is widely used to secure HTTP web traffic?',
      option_a: 'FTP',
      option_b: 'SSH',
      option_c: 'TLS/SSL',
      option_d: 'SMTP',
      correct_option: 'C',
      explanation: 'TLS (Transport Layer Security) encrypts communications over computer networks.',
      marks: 10
    },
    {
      id: 'q-cs-3',
      question_text: 'What does OWASP stand for in web application security?',
      option_a: 'Open Web Application Security Project',
      option_b: 'Online World Application Shield Program',
      option_c: 'Optimal Web Algorithm Security Protocol',
      option_d: 'Open Worldwide Architecture Security Policy',
      correct_option: 'A',
      explanation: 'OWASP is a non-profit foundation dedicated to improving web software security.',
      marks: 10
    },
    {
      id: 'q-cs-4',
      question_text: 'Which hashing algorithm produces a 256-bit fixed-length output?',
      option_a: 'MD5',
      option_b: 'SHA-256',
      option_c: 'SHA-1',
      option_d: 'DES',
      correct_option: 'B',
      explanation: 'SHA-256 is part of the SHA-2 cryptographic hash function family.',
      marks: 10
    },
    {
      id: 'q-cs-5',
      question_text: 'What principle dictates that users should be granted only the minimum permissions necessary to perform work?',
      option_a: 'Zero Trust Architecture',
      option_b: 'Principle of Least Privilege',
      option_c: 'Defense in Depth',
      option_d: 'Role Switching',
      correct_option: 'B',
      explanation: 'The Principle of Least Privilege limits access rights for users to only what is strictly necessary.',
      marks: 10
    }
  ],
  'default': [
    {
      id: 'q-def-1',
      question_text: 'What is the worst-case time complexity of Quick Sort?',
      option_a: 'O(n log n)',
      option_b: 'O(n)',
      option_c: 'O(n^2)',
      option_d: 'O(1)',
      correct_option: 'C',
      explanation: 'Quick Sort degrades to O(n^2) when the pivot choice is consistently bad (e.g. sorted array with first element pivot).',
      marks: 10
    },
    {
      id: 'q-def-2',
      question_text: 'Which data structure follows the First-In, First-Out (FIFO) principle?',
      option_a: 'Stack',
      option_b: 'Queue',
      option_c: 'Binary Tree',
      option_d: 'Heap',
      correct_option: 'B',
      explanation: 'Queues process elements in the order they were inserted (FIFO).',
      marks: 10
    },
    {
      id: 'q-def-3',
      question_text: 'In a Binary Search Tree (BST), the left child node of a parent node always contains a value that is:',
      option_a: 'Greater than the parent',
      option_b: 'Equal to the parent',
      option_c: 'Less than the parent',
      option_d: 'Double the parent',
      correct_option: 'C',
      explanation: 'BST property dictates left subtree nodes are strictly smaller than root.',
      marks: 10
    },
    {
      id: 'q-def-4',
      question_text: 'Which algorithm is used to find the shortest path in a weighted graph with non-negative edge weights?',
      option_a: 'Kruskal Algorithm',
      option_b: 'Dijkstra Algorithm',
      option_c: 'Prim Algorithm',
      option_d: 'Bellman-Ford',
      correct_option: 'B',
      explanation: 'Dijkstra algorithm computes shortest paths from a single source vertex.',
      marks: 10
    },
    {
      id: 'q-def-5',
      question_text: 'What is the average time complexity for searching an element in a Hash Table?',
      option_a: 'O(n)',
      option_b: 'O(log n)',
      option_c: 'O(1)',
      option_d: 'O(n^2)',
      correct_option: 'C',
      explanation: 'Hash table lookups average constant O(1) time complexity with good hash functions.',
      marks: 10
    }
  ]
};

export const ExamsModule: React.FC<ModuleProps> = ({ role }) => {
  const isStudent = role === UserRole.STUDENT;
  const isFacultyOrAdmin = role === UserRole.FACULTY || role === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<'transcripts' | 'quizzes'>('quizzes');
  
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

  // Faculty Quiz Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizCourseId, setNewQuizCourseId] = useState('course-1');
  const [newQuizTimeLimit, setNewQuizTimeLimit] = useState(15);
  const [newQuizPassPct, setNewQuizPassPct] = useState(60);
  const [newQuizQuestions, setNewQuizQuestions] = useState([
    {
      question_text: 'What is the primary key concept in relational databases?',
      option_a: 'Foreign Key',
      option_b: 'Unique Identifier',
      option_c: 'Secondary Index',
      option_d: 'Hash Map',
      correct_option: 'B',
      explanation: 'A primary key is a unique identifier for records in a table.',
      marks: 10
    }
  ]);

  // Transcripts API
  const { data: transcripts, loading: loadingTranscripts } = useApi(
    () => isStudent ? examsApi.transcripts() : Promise.resolve([]),
    [{ semester: 'Semester 7', courses: [
      { course_name: 'Theory of Computation', grade: 'A+', credits: 4 },
      { course_name: 'Microprocessors', grade: 'A', credits: 4 },
      { course_name: 'Data Structures', grade: 'S', credits: 4 }
    ], sgpa: 9.0 }],
    [role], 'exam-transcripts'
  );

  const { data: schedules } = useApi(() => examsApi.schedules(), [], [role], 'exam-schedules');
  const { data: quizzes, reload: reloadQuizzes } = useApi(() => examApi.getQuizzes(), [], [role], 'exam-quizzes');

  const quizzesList = (quizzes && (quizzes as any[]).length > 0) ? (quizzes as any[]) : DEFAULT_QUIZZES;

  // Anti-Cheat Tab Switch Listener
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

  // Quiz Timer Countdown
  useEffect(() => {
    if (!activeQuizId || quizResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuizId, quizResult, timeLeft]);

  const startQuiz = async (quizId: string) => {
    setLoadingQuiz(true);
    setQuizResult(null);
    setAnswers({});
    setViolations(0);
    setCurrentQIndex(0);
    
    let details: any = null;
    try {
      details = await examApi.getQuizDetails(quizId);
    } catch {
      details = null;
    }

    if (!details || !details.questions || details.questions.length === 0) {
      const targetQuiz = quizzesList.find(q => q.id === quizId) || DEFAULT_QUIZZES[0];
      const qns = FALLBACK_QUESTIONS[quizId] || FALLBACK_QUESTIONS['default'];
      details = {
        id: quizId,
        title: targetQuiz.title,
        time_limit_minutes: targetQuiz.time_limit_minutes || 15,
        passing_percentage: targetQuiz.passing_percentage || 60,
        questions: qns
      };
    }

    setQuizDetails(details);
    setActiveQuizId(quizId);
    setTimeLeft((details.time_limit_minutes || 15) * 60);
    setLoadingQuiz(false);
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleAutoSubmit = async () => {
    if (!activeQuizId || submittingQuiz) return;
    submitQuizInternal();
  };

  const submitQuizInternal = async () => {
    if (!activeQuizId) return;
    setSubmittingQuiz(true);
    try {
      const result = await examApi.submitQuiz(activeQuizId, answers, violations);
      setQuizResult(result);
      reloadQuizzes();
    } catch {
      // Local evaluation fallback if backend submission is offline
      const qns = quizDetails?.questions || [];
      let score = 0;
      let correct = 0;
      const review = qns.map((q: any) => {
        const userChoice = answers[q.id] || '';
        const isCorrect = userChoice.upper?.() === q.correct_option?.upper?.() || userChoice === q.correct_option;
        if (isCorrect) { score += (q.marks || 10); correct++; }
        return {
          question_id: q.id,
          question_text: q.question_text,
          user_choice: userChoice,
          correct_option: q.correct_option,
          is_correct: isCorrect,
          explanation: q.explanation
        };
      });
      const totalMarks = qns.reduce((sum: number, q: any) => sum + (q.marks || 10), 0) || 50;
      const percentage = Math.round((score / totalMarks) * 100);
      const passed = percentage >= (quizDetails?.passing_percentage || 60);

      setQuizResult({
        quiz_title: quizDetails?.title || 'Online Assessment',
        score,
        total_marks: totalMarks,
        percentage,
        passed,
        correct_answers: correct,
        total_questions: qns.length,
        tab_switch_violations: violations,
        review
      });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await examApi.createQuiz({
        course_id: newQuizCourseId,
        title: newQuizTitle,
        description: 'Interactive online quiz test',
        time_limit_minutes: newQuizTimeLimit,
        passing_percentage: newQuizPassPct,
        questions: newQuizQuestions
      });
      alert('Quiz created successfully!');
      setShowCreateModal(false);
      reloadQuizzes();
    } catch (err: any) {
      alert('Failed to create quiz: ' + err.message);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingTranscripts) return <FullPageLoader />;

  return (
    <div className="space-y-8">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Examinations & Assessment Engine</h2>
          <p className="text-slate-400 text-sm font-medium">Timed online quizzes, anti-cheat proctoring, and semester transcripts.</p>
        </div>

        <div className="flex items-center gap-3">
          {isFacultyOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30"
            >
              <Plus size={16} /> Create Online Quiz
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
              Transcripts
            </button>
          </div>
        </div>
      </div>

      {/* QUIZZES TAB */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzesList.map((quiz: any) => (
              <GlassCard key={quiz.id} className="p-6 rounded-2xl flex flex-col justify-between border-indigo-500/20 hover:border-indigo-500/50 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-md">
                      {quiz.time_limit_minutes} Mins Timed
                    </span>
                    {quiz.attempted ? (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 ${
                        quiz.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {quiz.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {quiz.passed ? `PASSED (${quiz.best_score})` : 'FAILED'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-md">
                        Ready to Take
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-slate-100 mb-2 leading-snug">{quiz.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{quiz.description || 'Test your knowledge on course core topics.'}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-6">
                    <div>Questions: <span className="font-bold text-white">{quiz.total_questions || 5}</span></div>
                    <div>Marks: <span className="font-bold text-indigo-400">{quiz.total_marks || 50}</span></div>
                    <div>Pass: <span className="font-bold text-emerald-400">{quiz.passing_percentage}%</span></div>
                  </div>
                </div>

                <button
                  onClick={() => startQuiz(quiz.id)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {quiz.attempted ? <RefreshCw size={14} /> : <FileText size={14} />}
                  {quiz.attempted ? 'Retake Online Quiz' : 'Start Online Exam'}
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TRANSCRIPTS TAB */}
      {activeTab === 'transcripts' && (
        <div className="space-y-6">
          {schedules && (schedules as any[]).length > 0 && (
            <div className="glass p-6 rounded-2xl border-amber-500/30" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(15,23,42,0.6))' }}>
              <h3 className="font-black text-amber-400 text-xs uppercase tracking-widest mb-4">Upcoming University Exam Schedules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(schedules as any[]).slice(0, 3).map((exam: any, i: number) => (
                  <GlassCard key={i} className="p-5 rounded-xl">
                    <p className="font-black text-sm text-slate-200">{exam.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{exam.course_name} • {exam.exam_type}</p>
                    <p className="text-[10px] text-amber-400 font-black uppercase mt-2">{new Date(exam.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(transcripts || []).map((sem: any) => (
              <GlassCard key={sem.semester} className="rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs">{sem.semester}</h3>
                  <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors">
                    <Download size={18} />
                  </div>
                </div>
                <div className="space-y-4">
                  {sem.courses.map((course: any) => (
                    <div key={course.course_name} className="flex justify-between items-center pb-3 border-b border-white/[0.04] last:border-0">
                      <p className="text-xs font-bold text-slate-300 uppercase pr-4">{course.course_name}</p>
                      <span className="text-xs font-black text-indigo-400">{course.grade}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SGPA</span>
                  <span className="text-lg font-black text-indigo-400">{sem.sgpa}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* QUIZ PLAYER MODAL */}
      {activeQuizId && quizDetails && !quizResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Quiz Player Header */}
            <div className="p-6 bg-slate-950 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Online Assessment</span>
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
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-2 text-amber-300 text-xs font-medium">
              <AlertTriangle size={14} />
              <span>Anti-Cheat Proctor Active: Do not switch tabs or minimize window during the exam.</span>
            </div>

            {/* Quiz Question Body */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {quizDetails.questions && quizDetails.questions[currentQIndex] && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-bold">
                    <span>Question {currentQIndex + 1} of {quizDetails.questions.length}</span>
                    <span className="text-indigo-400">{quizDetails.questions[currentQIndex].marks} Marks</span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-slate-100 mb-6">
                    {quizDetails.questions[currentQIndex].question_text}
                  </h4>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-3">
                    {['A', 'B', 'C', 'D'].map((optKey) => {
                      const optText = quizDetails.questions[currentQIndex][`option_${optKey.toLowerCase()}`];
                      const qId = quizDetails.questions[currentQIndex].id;
                      const isSelected = answers[qId] === optKey;

                      return (
                        <button
                          key={optKey}
                          onClick={() => handleSelectAnswer(qId, optKey)}
                          className={`p-4 rounded-xl text-left border transition-all flex items-center gap-4 ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                              : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/10'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
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
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                Previous
              </button>

              <div className="flex gap-1">
                {quizDetails.questions?.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold ${
                      idx === currentQIndex ? 'bg-indigo-500 text-white' : answers[quizDetails.questions[idx]?.id] ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {currentQIndex < (quizDetails.questions?.length || 0) - 1 ? (
                <button
                  onClick={() => setCurrentQIndex((p) => p + 1)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={submitQuizInternal}
                  disabled={submittingQuiz}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center gap-1"
                >
                  {submittingQuiz ? 'Grading...' : 'Submit Exam'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUIZ RESULT MODAL */}
      {quizResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-2xl rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
              quizResult.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {quizResult.passed ? <Award size={36} /> : <XCircle size={36} />}
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">{quizResult.quiz_title}</span>
              <h3 className="text-2xl font-black text-white mt-1">
                {quizResult.passed ? 'Assessment Passed!' : 'Assessment Retake Required'}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-white/5">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Score</p>
                <p className="text-xl font-black text-indigo-400">{quizResult.score} / {quizResult.total_marks}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Percentage</p>
                <p className="text-xl font-black text-white">{quizResult.percentage}%</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Violations</p>
                <p className="text-xl font-black text-amber-400">{quizResult.tab_switch_violations}</p>
              </div>
            </div>

            <button
              onClick={() => { setQuizResult(null); setActiveQuizId(null); }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition"
            >
              Close & Return to Assessments
            </button>
          </div>
        </div>
      )}

      {/* CREATE QUIZ MODAL (Faculty/Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleCreateQuiz} className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Create Online Assessment Quiz</h3>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Quiz Title</label>
              <input
                type="text"
                required
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                placeholder="e.g. Operating Systems Kernel Quiz"
                className="w-full glass-input px-4 py-2.5 rounded-xl text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Time Limit (Minutes)</label>
                <input
                  type="number"
                  value={newQuizTimeLimit}
                  onChange={(e) => setNewQuizTimeLimit(Number(e.target.value))}
                  className="w-full glass-input px-4 py-2 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Passing %</label>
                <input
                  type="number"
                  value={newQuizPassPct}
                  onChange={(e) => setNewQuizPassPct(Number(e.target.value))}
                  className="w-full glass-input px-4 py-2 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg">Save & Publish Quiz</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExamsModule;
