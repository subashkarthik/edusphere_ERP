import React, { useState } from 'react';
import { 
  Plus, Upload, FileText, Settings, 
  Search, Filter, MoreVertical, LayoutGrid, 
  List, Edit, Eye, Trash2, CheckCircle, Clock,
  ChevronRight, BookOpen, Video, File, MessageSquare,
  Layers, Users, Loader2, AlertCircle, X, Check,
  Play, ExternalLink, Globe, Lock
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useApi } from '../hooks';
import { cmsApi, coursesApi } from '../services/api';

interface FacultyCMSProps {
  role?: string;
}

const FacultyCMS: React.FC<FacultyCMSProps> = ({ role = 'FACULTY' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'onboarding' | 'analytics'>('inventory');
  
  // State for enrolled students modal
  const [viewStudentsCourse, setViewStudentsCourse] = useState<any | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  
  // State for Course Create/Edit modal
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({
    id: '',
    code: '',
    title: '',
    name: '',
    description: '',
    credits: 3,
    semester: 7,
    department: '',
    faculty: '',
    syllabus_topics: [] as string[],
  });
  const [currentTopic, setCurrentTopic] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Curriculum & Lessons management modal
  const [curriculumCourse, setCurriculumCourse] = useState<any | null>(null);
  const [curriculumModules, setCurriculumModules] = useState<any[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<'VIDEO' | 'PDF' | 'LINK'>('VIDEO');
  const [newLessonUrl, setNewLessonUrl] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState<number>(15);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Onboarding states
  const [onboardCourseId, setOnboardCourseId] = useState<string>('');
  const [onboardFile, setOnboardFile] = useState<File | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  const { data: inventory, loading, refetch: refresh } = useApi(() => cmsApi.getInventory(), [], [], 'faculty-inventory');

  // Course Create / Edit Handlers
  const handleOpenCreate = () => {
    setCourseForm({
      id: '',
      code: '',
      title: '',
      name: '',
      description: '',
      credits: 3,
      semester: 7,
      department: '',
      faculty: '',
      syllabus_topics: [],
    });
    setCurrentTopic('');
    setFormError(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEdit = (course: any) => {
    setCourseForm({
      id: course.id,
      code: course.code,
      title: course.title || course.name,
      name: course.name,
      description: course.description || '',
      credits: course.credits || 3,
      semester: course.semester || 7,
      department: course.department_name || course.department_id || '',
      faculty: course.faculty_name || '',
      syllabus_topics: course.syllabus_topics || [],
    });
    setCurrentTopic('');
    setFormError(null);
    setIsCourseModalOpen(true);
  };

  const handleAddTopic = () => {
    const trimmed = currentTopic.trim();
    if (!trimmed) return;
    if (courseForm.syllabus_topics.includes(trimmed)) {
      setCurrentTopic('');
      return;
    }
    setCourseForm({
      ...courseForm,
      syllabus_topics: [...courseForm.syllabus_topics, trimmed]
    });
    setCurrentTopic('');
  };

  const handleRemoveTopic = (indexToRemove: number) => {
    setCourseForm({
      ...courseForm,
      syllabus_topics: courseForm.syllabus_topics.filter((_, idx) => idx !== indexToRemove)
    });
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (courseForm.description.trim().length < 30) {
      setFormError(`Description must be at least 30 characters (currently ${courseForm.description.trim().length}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: courseForm.code.trim(),
        title: courseForm.title.trim(),
        name: courseForm.title.trim(),
        description: courseForm.description.trim(),
        credits: Number(courseForm.credits),
        semester: Number(courseForm.semester),
        department: courseForm.department.trim() || undefined,
        faculty: courseForm.faculty.trim() || undefined,
        syllabus_topics: courseForm.syllabus_topics,
      };

      if (courseForm.id) {
        await coursesApi.update(courseForm.id, payload);
      } else {
        await coursesApi.create(payload);
      }
      setIsCourseModalOpen(false);
      refresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Curriculum & Lessons Handlers
  const handleOpenCurriculum = async (course: any) => {
    setCurriculumCourse(course);
    setLoadingCurriculum(true);
    setNewModuleTitle('');
    setNewModuleDesc('');
    setActiveModuleForLesson(null);
    setNewLessonTitle('');
    setNewLessonUrl('');
    setUploadMessage(null);
    try {
      const res = await coursesApi.get(course.id);
      setCurriculumModules(res?.modules || []);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
      setCurriculumModules([]);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const reloadCurriculum = async () => {
    if (!curriculumCourse) return;
    try {
      const res = await coursesApi.get(curriculumCourse.id);
      setCurriculumModules(res?.modules || []);
      refresh();
    } catch (err) {
      console.error('Failed to reload curriculum:', err);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curriculumCourse || !newModuleTitle.trim()) return;
    try {
      await coursesApi.addModule(curriculumCourse.id, {
        title: newModuleTitle.trim(),
        description: newModuleDesc.trim(),
        order_index: curriculumModules.length,
        is_published: true,
      });
      setNewModuleTitle('');
      setNewModuleDesc('');
      reloadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to add module');
    }
  };

  const handleToggleModulePublish = async (moduleId: string, currentStatus: boolean) => {
    try {
      await coursesApi.updateModule(moduleId, { is_published: !currentStatus });
      reloadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle module status');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Delete this module and all its lessons?')) return;
    try {
      await coursesApi.deleteModule(moduleId);
      reloadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to delete module');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !curriculumCourse) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File exceeds maximum allowed size of 50MB');
      return;
    }

    setIsUploading(true);
    setUploadMessage('Uploading file (max 50MB)...');
    try {
      const res = await coursesApi.uploadFile(curriculumCourse.id, file);
      setNewLessonUrl(res.url);
      if (res.content_type === 'VIDEO') setNewLessonType('VIDEO');
      else if (res.content_type === 'PDF') setNewLessonType('PDF');
      else setNewLessonType('LINK');
      setUploadMessage(`Uploaded: ${res.filename} (${(res.file_size / (1024 * 1024)).toFixed(1)} MB)`);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
      setUploadMessage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    try {
      await coursesApi.addLesson(moduleId, {
        title: newLessonTitle.trim(),
        content_type: newLessonType,
        content_url: newLessonUrl.trim(),
        duration_minutes: Number(newLessonDuration) || 0,
        is_published: true,
      });
      setNewLessonTitle('');
      setNewLessonUrl('');
      setActiveModuleForLesson(null);
      setUploadMessage(null);
      reloadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to add lesson');
    }
  };

  const handleToggleLessonPublish = async (lessonId: string, currentStatus: boolean) => {
    try {
      await coursesApi.updateLesson(lessonId, { is_published: !currentStatus });
      reloadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle lesson status');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await coursesApi.deleteLesson(lessonId);
      reloadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lesson');
    }
  };

  const handleSyllabusAction = async (courseId: string, action: 'submit' | 'approve' | 'reject', remarks?: string) => {
    try {
      if (action === 'submit') {
        await cmsApi.submitCourse(courseId);
      } else if (action === 'approve') {
        await cmsApi.approveCourse(courseId);
      } else if (action === 'reject') {
        await cmsApi.rejectCourse(courseId, remarks || '');
      }
      refresh();
    } catch (err: any) {
      alert(err.message || `Failed to perform ${action}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course? This action is permanent for your institution.')) {
      try {
        await coursesApi.delete(id);
        refresh();
      } catch (err) {
        alert('Failed to delete course. It may have active enrollments.');
      }
    }
  };

  const handleViewStudents = async (course: any) => {
    setViewStudentsCourse(course);
    setLoadingStudents(true);
    setStudentsError(null);
    try {
      const data = await coursesApi.getEnrolledStudents(course.id);
      setEnrolledStudents(data.students || []);
    } catch (err: any) {
      setStudentsError(err.message || 'Failed to fetch enrolled students');
      setEnrolledStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleBulkEnroll = async () => {
    if (!onboardCourseId) {
      setOnboardError('Please select a target course module.');
      return;
    }
    if (!onboardFile) {
      setOnboardError('Please choose a roster CSV file to upload.');
      return;
    }

    setIsOnboarding(true);
    setOnboardError(null);
    setOnboardSuccess(null);

    try {
      const response = await cmsApi.bulkEnroll(onboardCourseId, onboardFile);
      if (response && response.status === 'success') {
        setOnboardSuccess(`Successfully enrolled ${response.processed} student(s) into the course.`);
        setOnboardFile(null);
        const fileInput = document.getElementById('onboard-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setOnboardError(response.detail || 'Failed to process provisioning roster.');
      }
    } catch (err: any) {
      setOnboardError(err.message || 'Network error during batch student onboarding.');
    } finally {
      setIsOnboarding(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans pb-12">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <Settings size={12} className="text-indigo-400" />
            Institutional CMS Studio
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Academic Content Factory</h1>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          {['inventory', 'onboarding', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab as any)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === tab ? 'glass-btn-primary text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'inventory' && (
        <div className="space-y-8">
           {/* Summary Stats */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Live Courses', value: inventory?.length || 0, icon: CheckCircle, color: 'text-emerald-400' },
              { label: 'Active Roster', value: inventory?.reduce((acc: number, c: any) => acc + (c.enrolled_count || 0), 0) || 0, icon: Users, color: 'text-indigo-400' },
              { label: 'Pending Review', value: inventory?.filter((c: any) => c.approval_status !== 'ACTIVE').length || 0, icon: Clock, color: 'text-amber-400' },
              { label: 'Syllabus Modules', value: inventory?.reduce((acc: number, c: any) => acc + (c.syllabus_topics?.length || 0), 0) || 0, icon: Layers, color: 'text-rose-400' },
            ].map((stat, i) => (
              <GlassCard key={i} className="p-6 rounded-3xl" hover={true}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 glass rounded-xl ${stat.color}`}><stat.icon size={20}/></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-black text-slate-100 mt-0.5">{stat.value}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

           <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-black text-slate-100 text-lg flex items-center gap-3">
                 Institutional Courses
                 <span className="px-3 py-1 glass rounded-lg text-[10px] text-indigo-400 uppercase tracking-widest">{inventory?.length || 0} Total</span>
               </h3>
               <button 
                onClick={handleOpenCreate}
                className="glass-btn-primary px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white flex items-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <Plus size={16}/> New Course
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500 font-black animate-pulse uppercase tracking-[0.2em] text-xs">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                Syncing Institutional Data...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(inventory || []).map((course: any) => (
                  <GlassCard key={course.id} className="p-6 rounded-3xl group border-white/5 hover:border-indigo-500/20 relative overflow-hidden flex flex-col justify-between min-h-[320px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
                    
                    <div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="px-3 py-1.5 glass rounded-xl text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/20">{course.code}</div>
                        <div className="flex gap-1.5">
                           <button 
                              onClick={() => handleOpenEdit(course)}
                              title="Edit Course"
                              className="p-2 glass rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                           >
                             <Edit size={14}/>
                           </button>
                           <button 
                              onClick={() => handleDelete(course.id)}
                              title="Delete Course"
                              className="p-2 glass rounded-lg text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            ><Trash2 size={14}/></button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                          course.approval_status === 'ACTIVE' ? 'badge-emerald' :
                          course.approval_status === 'DEPT_PENDING' ? 'badge-amber' :
                          course.approval_status === 'REJECTED' ? 'badge-rose' : 'badge-indigo'
                        }`}>
                          {course.approval_status || 'DRAFT'}
                        </span>
                        
                        <span className="text-[10px] font-bold text-slate-400">
                          {course.credits || 3} Credits • Sem {course.semester || 7}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-100 mb-2 truncate group-hover:text-indigo-400 transition-colors relative z-10">{course.name}</h4>
                      <p className="text-[11px] text-slate-400 font-medium mb-3 line-clamp-2 leading-relaxed">
                        {course.description || "No course description provided."}
                      </p>

                      {/* Syllabus Topics if entered */}
                      {course.syllabus_topics && course.syllabus_topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
                          {course.syllabus_topics.slice(0, 3).map((t: string) => (
                            <span key={t} className="px-2 py-0.5 glass text-indigo-300 text-[8px] font-bold uppercase rounded-md border border-indigo-500/20">
                              {t}
                            </span>
                          ))}
                          {course.syllabus_topics.length > 3 && (
                            <span className="px-1.5 py-0.5 glass text-slate-400 text-[8px] font-bold rounded-md">
                              +{course.syllabus_topics.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-4 relative z-10 pt-2 border-t border-white/[0.04]">
                          <span className="text-[10px] text-slate-400 font-medium">
                            Faculty: <strong className="text-slate-200">{course.faculty_name || 'Assigned'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleViewStudents(course)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass hover:bg-white/10 text-slate-300 hover:text-white transition"
                          >
                            <Users size={12} className="text-indigo-400"/>
                            <span className="text-[10px] font-black uppercase tracking-widest">{course.enrolled_count || 0}</span>
                          </button>
                      </div>

                      <div className="flex flex-col gap-2 relative z-10">
                        <button 
                          onClick={() => handleOpenCurriculum(course)}
                          className="w-full py-2.5 glass-btn text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 rounded-xl hover:text-white hover:bg-indigo-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                        >
                          <BookOpen size={14} /> Manage Curriculum & Lessons <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform"/>
                        </button>
                        
                        {(course.approval_status === 'DRAFT' || course.approval_status === 'REJECTED' || !course.approval_status) && (
                          <button 
                            onClick={() => handleSyllabusAction(course.id, 'submit')}
                            className="w-full py-2 bg-indigo-600/80 hover:bg-indigo-500 text-[9px] font-black uppercase tracking-[0.2em] text-white rounded-xl transition-all"
                          >
                            Submit For Approval
                          </button>
                        )}

                        {role === 'ADMIN' && course.approval_status === 'DEPT_PENDING' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleSyllabusAction(course.id, 'approve')}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-[8px] font-black uppercase tracking-widest text-white rounded-xl transition-all"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                const remarks = prompt("Enter review remarks:") || "Revision needed.";
                                handleSyllabusAction(course.id, 'reject', remarks);
                              }}
                              className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-[8px] font-black uppercase tracking-widest text-white rounded-xl transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Batch Onboarding Tab */}
      {activeSubTab === 'onboarding' && (
        <GlassCard className="p-8 rounded-[2.5rem] max-w-2xl mx-auto space-y-6" hover={false}>
           <div className="space-y-1">
             <h3 className="font-black text-slate-100 text-lg">Batch Student Provisioning</h3>
             <p className="text-xs text-slate-400">Upload a CSV roster to batch-enroll candidates directly into an institutional module.</p>
           </div>

           {onboardSuccess && (
             <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2">
               <CheckCircle size={16} /> <span>{onboardSuccess}</span>
             </div>
           )}

           {onboardError && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs font-bold flex items-center gap-2">
               <AlertCircle size={16} /> <span>{onboardError}</span>
             </div>
           )}

           <div className="space-y-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Course Module</label>
               <select 
                 value={onboardCourseId}
                 onChange={e => setOnboardCourseId(e.target.value)}
                 className="w-full glass-input rounded-2xl px-6 py-4 font-bold text-sm bg-slate-900 border border-white/10 text-white"
               >
                 <option value="">Select course...</option>
                 {(inventory || []).map((c: any) => (
                   <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                 ))}
               </select>
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Roster CSV File</label>
               <input 
                 id="onboard-file"
                 type="file" 
                 accept=".csv"
                 onChange={e => setOnboardFile(e.target.files?.[0] || null)}
                 className="w-full glass-input rounded-2xl px-6 py-4 font-bold text-sm bg-slate-900 border border-white/10 text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-indigo-600 file:text-white"
               />
               <p className="text-[10px] text-slate-500">CSV must contain header column: <code>email</code> and optional <code>semester</code>.</p>
             </div>
           </div>

           <button
             onClick={handleBulkEnroll}
             disabled={isOnboarding}
             className="w-full py-4 glass-btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
           >
             {isOnboarding ? <Loader2 size={16} className="animate-spin" /> : 'Start Batch Provisioning'}
           </button>
        </GlassCard>
      )}

      {/* Analytics Tab */}
      {activeSubTab === 'analytics' && (
        <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
          <h3 className="font-black text-slate-100 text-lg mb-2">Curriculum Delivery Intelligence</h3>
          <p className="text-xs text-slate-400 mb-6">Metrics tracking curriculum completeness and active student engagement.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 glass rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Average Modules / Course</span>
              <p className="text-2xl font-black text-white">4.8</p>
            </div>
            <div className="p-6 glass rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Completion Rate</span>
              <p className="text-2xl font-black text-emerald-400">88.4%</p>
            </div>
            <div className="p-6 glass rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Syllabus Approval Rate</span>
              <p className="text-2xl font-black text-indigo-400">94.1%</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Course Create / Edit Modal (Requirement 1) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glass-sidebar rounded-[2.5rem] p-8 md:p-10 border border-white/10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase tracking-widest text-sm">
                  {courseForm.id ? 'Edit Course Details' : 'Create Course Module'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Course details and syllabus topics come strictly from your input.
                </p>
              </div>
              <button onClick={() => setIsCourseModalOpen(false)} className="p-3 glass rounded-2xl text-slate-400 hover:text-white transition-colors">
                <X size={20}/>
              </button>
            </div>

            {formError && (
              <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> <span>{formError}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmitCourse} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Code *</label>
                  <input 
                    required
                    value={courseForm.code}
                    onChange={e => setCourseForm({...courseForm, code: e.target.value})}
                    placeholder="e.g. CS-401"
                    className="w-full glass-input rounded-2xl px-5 py-3.5 font-bold text-sm bg-slate-900 border border-white/10 text-white" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course Title *</label>
                  <input 
                    required
                    value={courseForm.title}
                    onChange={e => setCourseForm({...courseForm, title: e.target.value, name: e.target.value})}
                    placeholder="e.g. Distributed Operating Systems"
                    className="w-full glass-input rounded-2xl px-5 py-3.5 font-bold text-sm bg-slate-900 border border-white/10 text-white" 
                  />
                </div>
              </div>

              {/* Description with Required Min 30 Characters Enforcement */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Course Description * (Min 30 chars)
                  </label>
                  <span className={`text-[10px] font-bold ${courseForm.description.trim().length >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {courseForm.description.trim().length} / 30 chars
                  </span>
                </div>
                <textarea 
                  required
                  value={courseForm.description}
                  onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                  rows={4}
                  placeholder="Provide comprehensive objectives, outcomes, prerequisites, and scope (minimum 30 characters)..."
                  className={`w-full glass-input rounded-2xl px-5 py-3.5 font-medium text-sm resize-none bg-slate-900 border text-white ${
                    courseForm.description.trim().length > 0 && courseForm.description.trim().length < 30 ? 'border-amber-500/50' : 'border-white/10'
                  }`} 
                />
                {courseForm.description.trim().length > 0 && courseForm.description.trim().length < 30 && (
                  <p className="text-[11px] text-amber-400 font-bold ml-1">
                    Description must be at least 30 characters long ({30 - courseForm.description.trim().length} more needed).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credits</label>
                  <input 
                    type="number"
                    min="1"
                    max="10"
                    value={courseForm.credits}
                    onChange={e => setCourseForm({...courseForm, credits: parseInt(e.target.value) || 3})}
                    className="w-full glass-input rounded-2xl px-5 py-3.5 font-bold text-sm bg-slate-900 border border-white/10 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semester</label>
                  <input 
                    type="number"
                    min="1"
                    max="8"
                    value={courseForm.semester}
                    onChange={e => setCourseForm({...courseForm, semester: parseInt(e.target.value) || 7})}
                    className="w-full glass-input rounded-2xl px-5 py-3.5 font-bold text-sm bg-slate-900 border border-white/10 text-white" 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <input 
                    value={courseForm.department}
                    onChange={e => setCourseForm({...courseForm, department: e.target.value})}
                    placeholder="e.g. Computer Science & Eng"
                    className="w-full glass-input rounded-2xl px-5 py-3.5 font-bold text-sm bg-slate-900 border border-white/10 text-white" 
                  />
                </div>
              </div>

              {/* Free-form Syllabus Topics Editor */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Syllabus Topics (Free-form list entered by faculty)
                </label>
                <div className="flex gap-2">
                  <input 
                    value={currentTopic}
                    onChange={e => setCurrentTopic(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTopic();
                      }
                    }}
                    placeholder="Enter a syllabus topic (e.g. Memory Virtualization, Paging & Segmentation)..."
                    className="flex-1 glass-input rounded-2xl px-5 py-3 font-medium text-sm bg-slate-900 border border-white/10 text-white" 
                  />
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    className="px-5 py-3 glass-btn-primary rounded-2xl font-bold text-xs uppercase tracking-wider text-white shrink-0"
                  >
                    Add Topic
                  </button>
                </div>

                {courseForm.syllabus_topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    {courseForm.syllabus_topics.map((t, idx) => (
                      <span key={idx} className="px-3 py-1.5 glass text-indigo-300 text-xs font-bold rounded-xl border border-indigo-500/20 flex items-center gap-2">
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(idx)}
                          className="text-slate-400 hover:text-rose-400 font-bold transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || courseForm.description.trim().length < 30}
                className="w-full py-4 glass-btn-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (courseForm.id ? 'Save Course Updates' : 'Deploy Course Module')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Curriculum & Lesson Management Modal (Requirement 5) */}
      {curriculumCourse && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl glass-sidebar rounded-[2.5rem] p-8 md:p-10 border border-white/10 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/[0.06] shrink-0">
              <div>
                <span className="px-3 py-1 glass rounded-xl text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/20">
                  {curriculumCourse.code}
                </span>
                <h2 className="text-xl font-black text-white tracking-tight mt-2">{curriculumCourse.name}</h2>
                <p className="text-xs text-slate-400 font-medium">Curriculum Modules & Lessons Studio</p>
              </div>
              <button 
                onClick={() => setCurriculumCourse(null)} 
                className="p-3 glass rounded-2xl text-slate-400 hover:text-white transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
              {/* Add New Module Section */}
              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Plus size={14} /> Add New Module to Curriculum
                </h3>
                <form onSubmit={handleAddModule} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    required
                    value={newModuleTitle}
                    onChange={e => setNewModuleTitle(e.target.value)}
                    placeholder="Module Title (e.g. Unit 1: Foundations)..."
                    className="md:col-span-1 glass-input rounded-xl px-4 py-2.5 font-bold text-xs bg-slate-900 border border-white/10 text-white"
                  />
                  <input 
                    value={newModuleDesc}
                    onChange={e => setNewModuleDesc(e.target.value)}
                    placeholder="Short description..."
                    className="md:col-span-1 glass-input rounded-xl px-4 py-2.5 font-medium text-xs bg-slate-900 border border-white/10 text-white"
                  />
                  <button 
                    type="submit"
                    className="glass-btn-primary px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white"
                  >
                    Add Module
                  </button>
                </form>
              </div>

              {loadingCurriculum ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-bold">
                  <Loader2 size={28} className="animate-spin text-indigo-400" />
                  <span>Loading curriculum...</span>
                </div>
              ) : curriculumModules.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs font-medium border border-dashed border-white/10 rounded-3xl">
                  No modules created yet. Add a module above to get started.
                </div>
              ) : (
                <div className="space-y-6">
                  {curriculumModules.map((mod: any, mIdx: number) => (
                    <div key={mod.id || mIdx} className="p-6 glass rounded-3xl border border-white/10 space-y-4">
                      {/* Module Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/[0.06]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                              Module {mIdx + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              mod.is_published ? 'badge-emerald' : 'badge-amber'
                            }`}>
                              {mod.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-white mt-0.5">{mod.title}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleModulePublish(mod.id, mod.is_published)}
                            className="px-3 py-1.5 glass rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white transition"
                          >
                            {mod.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModule(mod.id)}
                            className="p-1.5 glass rounded-xl text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Module"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Module Lessons List */}
                      <div className="space-y-2">
                        {(!mod.lessons || mod.lessons.length === 0) ? (
                          <div className="text-center py-4 text-slate-500 text-xs italic">
                            No lessons published in this module yet.
                          </div>
                        ) : (
                          mod.lessons.map((lesson: any, lIdx: number) => (
                            <div key={lesson.id || lIdx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 glass rounded-xl text-indigo-400">
                                  {lesson.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-200">{lesson.title}</p>
                                  <p className="text-[10px] text-slate-400 uppercase font-medium">
                                    {lesson.type || lesson.content_type || 'LESSON'} • {lesson.duration || `${lesson.duration_minutes || 0} min`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLessonPublish(lesson.id, lesson.is_published)}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                    lesson.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}
                                >
                                  {lesson.is_published ? 'Live' : 'Hidden'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Lesson Button / Form */}
                      {activeModuleForLesson === mod.id ? (
                        <div className="p-5 bg-white/[0.03] border border-indigo-500/20 rounded-2xl space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Add Lesson to {mod.title}</span>
                            <button onClick={() => setActiveModuleForLesson(null)} className="text-slate-400 hover:text-white text-xs">✕ Cancel</button>
                          </div>
                          
                          <form onSubmit={e => handleAddLesson(e, mod.id)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input 
                                required
                                value={newLessonTitle}
                                onChange={e => setNewLessonTitle(e.target.value)}
                                placeholder="Lesson Title..."
                                className="glass-input rounded-xl px-4 py-2.5 font-bold text-xs bg-slate-900 border border-white/10 text-white"
                              />
                              <select 
                                value={newLessonType}
                                onChange={e => setNewLessonType(e.target.value as any)}
                                className="glass-input rounded-xl px-4 py-2.5 font-bold text-xs bg-slate-900 border border-white/10 text-white"
                              >
                                <option value="VIDEO">Video Lecture</option>
                                <option value="PDF">PDF / Document</option>
                                <option value="LINK">External Link</option>
                              </select>
                              <input 
                                type="number"
                                min="0"
                                value={newLessonDuration}
                                onChange={e => setNewLessonDuration(parseInt(e.target.value) || 0)}
                                placeholder="Duration (minutes)..."
                                className="glass-input rounded-xl px-4 py-2.5 font-bold text-xs bg-slate-900 border border-white/10 text-white"
                              />
                            </div>

                            {/* Authenticated File Upload (Max 50MB) */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Upload File (Authenticated, max 50MB, .mp4, .pdf, .docx, .zip)
                              </label>
                              <input 
                                type="file"
                                accept=".mp4,.webm,.mov,.pdf,.zip,.doc,.docx"
                                onChange={handleFileUpload}
                                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-600 file:text-white"
                              />
                              {uploadMessage && (
                                <p className="text-[10px] text-emerald-400 font-bold">{uploadMessage}</p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Content URL</label>
                              <input 
                                value={newLessonUrl}
                                onChange={e => setNewLessonUrl(e.target.value)}
                                placeholder="Auto-populated from upload or enter URL (https://...)"
                                className="w-full glass-input rounded-xl px-4 py-2.5 font-medium text-xs bg-slate-900 border border-white/10 text-white"
                              />
                            </div>

                            <button 
                              type="submit"
                              disabled={isUploading}
                              className="px-6 py-2.5 glass-btn-primary rounded-xl text-xs font-black uppercase tracking-wider text-white"
                            >
                              Save Lesson
                            </button>
                          </form>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModuleForLesson(mod.id);
                            setNewLessonTitle('');
                            setNewLessonUrl('');
                            setUploadMessage(null);
                          }}
                          className="w-full py-2.5 border border-dashed border-white/10 hover:border-indigo-500/30 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-indigo-400 transition flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} /> Add Lesson to this Module
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrolled Students Modal */}
      {viewStudentsCourse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glass-sidebar rounded-[2.5rem] p-8 md:p-10 border border-white/10 animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="px-2.5 py-1 glass rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/20">
                  {viewStudentsCourse.code}
                </span>
                <h2 className="text-xl font-black text-white tracking-tight mt-2">{viewStudentsCourse.name}</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Enrolled Student Roster</p>
              </div>
              <button 
                onClick={() => setViewStudentsCourse(null)} 
                className="p-2.5 glass rounded-2xl text-slate-400 hover:text-white transition-colors"
              >
                <span className="font-bold text-xs px-2">✕ Close</span>
              </button>
            </div>

            {loadingStudents ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-bold">
                <Loader2 size={28} className="animate-spin text-indigo-400" />
                <span>Loading enrolled student records...</span>
              </div>
            ) : studentsError ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{studentsError}</span>
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-medium border border-dashed border-white/10 rounded-2xl">
                No students currently enrolled in this course module.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-3 pr-1 scrollbar-hide">
                <div className="flex justify-between items-center px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Enrolled Candidates ({enrolledStudents.length})</span>
                  <span>Status</span>
                </div>
                {enrolledStudents.map((st, idx) => (
                  <div key={st.enrollment_id || idx} className="p-4 rounded-2xl glass border border-white/[0.06] flex items-center justify-between gap-4 hover:border-indigo-500/20 transition">
                    <div className="flex items-center gap-3.5">
                      <img 
                        src={st.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name || 'Student')}&background=4f46e5&color=fff`} 
                        alt={st.name} 
                        className="w-10 h-10 rounded-xl object-cover border border-white/10" 
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">{st.name}</h4>
                        <p className="text-[11px] text-slate-400 font-medium">{st.email}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-bold uppercase">
                          <span>{st.enrollment_no || 'No Reg No'}</span>
                          {st.department && <span>• {st.department}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest badge-emerald">
                        {st.status || 'ACTIVE'}
                      </span>
                      <p className="text-[9px] text-slate-500 font-medium mt-1">
                        {st.semester_label || 'Current Semester'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyCMS;
