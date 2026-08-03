import React, { useState } from 'react';
import { 
  Plus, Upload, FileText, Settings, 
  Search, Filter, MoreVertical, LayoutGrid, 
  List, Edit, Eye, Trash2, CheckCircle, Clock,
  ChevronRight, BookOpen, Video, File, MessageSquare,
  Layers, Users, Loader2, AlertCircle
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useApi } from '../hooks';
import { cmsApi } from '../services/api';

interface FacultyCMSProps {
  role?: string;
}

const FacultyCMS: React.FC<FacultyCMSProps> = ({ role = 'FACULTY' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'onboarding' | 'analytics'>('inventory');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // State for new course
  const [newCourse, setNewCourse] = useState({ name: '', code: '', description: '', credits: 4 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Onboarding states
  const [onboardCourseId, setOnboardCourseId] = useState<string>('');
  const [onboardFile, setOnboardFile] = useState<File | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  const { data: inventory, loading, refetch: refresh } = useApi(() => cmsApi.getInventory(), [], [], 'faculty-inventory');
  
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await cmsApi.createCourse(newCourse);
      setIsCreateModalOpen(false);
      setNewCourse({ name: '', code: '', description: '', credits: 4 });
      refresh();
    } catch (err) {
      alert('Failed to create course');
    } finally {
      setIsSubmitting(false);
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
        await cmsApi.deleteCourse(id);
        refresh();
      } catch (err) {
        alert('Failed to delete course. It may have active enrollments.');
      }
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
        // Reset file input
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
    <div className="space-y-8 animate-in fade-in duration-700">
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
              { label: 'Course Hours', value: '420', icon: Clock, color: 'text-amber-400' },
              { label: 'Active Students', value: '1,240', icon: List, color: 'text-indigo-400' },
              { label: 'Material Size', value: '4.2 GB', icon: Layers, color: 'text-rose-400' },
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
                 Institutional Inventory
                 <span className="px-3 py-1 glass rounded-lg text-[10px] text-indigo-400 uppercase tracking-widest">{inventory?.length || 0} Total</span>
               </h3>
               <button 
                onClick={() => setIsCreateModalOpen(true)}
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
                  <GlassCard key={course.id} className="p-6 rounded-3xl group border-white/5 hover:border-indigo-500/20 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
                    
                    <div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="px-3 py-1.5 glass rounded-xl text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/20">{course.code}</div>
                        <div className="flex gap-1">
                           <button className="p-2 glass rounded-lg text-slate-500 hover:text-white transition-colors"><Edit size={14}/></button>
                           <button 
                              onClick={() => handleDelete(course.id)}
                              className="p-2 glass rounded-lg text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            ><Trash2 size={14}/></button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4 relative z-10">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                          course.approval_status === 'ACTIVE' ? 'badge-emerald' :
                          course.approval_status === 'DEPT_PENDING' ? 'badge-amber' :
                          course.approval_status === 'REJECTED' ? 'badge-rose' : 'badge-indigo'
                        }`}>
                          {course.approval_status || 'DRAFT'}
                        </span>
                        
                        {course.approval_status === 'REJECTED' && course.review_remarks && (
                          <span className="text-[9px] text-rose-300 font-bold max-w-[150px] truncate" title={course.review_remarks}>
                            ❌ {course.review_remarks}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-black text-slate-100 mb-2 truncate group-hover:text-indigo-400 transition-colors relative z-10">{course.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mb-6 line-clamp-2 leading-relaxed">{course.description || "No course description provided for this institutional module."}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-4 mb-6 relative z-10">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${course.approval_status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {course.approval_status === 'ACTIVE' ? 'Active' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={12} className="text-indigo-400"/>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course.enrolled_count || 0} Students</span>
                          </div>
                      </div>

                      <div className="flex flex-col gap-2 relative z-10">
                        <button className="w-full py-3 glass-btn text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 rounded-2xl hover:text-white transition-all flex items-center justify-center gap-2 group/btn">
                          Manage Curriculum <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform"/>
                        </button>
                        
                        {(course.approval_status === 'DRAFT' || course.approval_status === 'REJECTED' || !course.approval_status) && (
                          <button 
                            onClick={() => handleSyllabusAction(course.id, 'submit')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-[9px] font-black uppercase tracking-[0.2em] text-white rounded-2xl transition-all"
                          >
                            Submit For Review
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

                
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="p-8 rounded-3xl glass border-2 border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-6 group min-h-[280px]"
                >
                  <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:scale-110 group-hover:rotate-90 transition-all duration-500">
                    <Plus size={32}/>
                  </div>
                  <div className="text-center">
                    <span className="block text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-slate-200 mb-1">New Module</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Add to your org</span>
                  </div>
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {activeSubTab === 'onboarding' && (
        <GlassCard className="p-12 rounded-[2.5rem] border-white/5 flex flex-col items-center justify-center text-center space-y-8 max-w-4xl mx-auto">
           <div className="w-20 h-20 bg-indigo-500/10 rounded-[1.8rem] flex items-center justify-center text-indigo-400">
             <Users size={40} />
           </div>
           <div className="max-w-xl space-y-4">
             <h2 className="text-3xl font-black text-white tracking-tight">Bulk Student Onboarding</h2>
             <p className="text-slate-400 font-medium text-sm">Upload an institutional roster CSV file to automatically provision student accounts and enroll them in your active course modules.</p>
           </div>

           {onboardSuccess && (
             <div className="w-full max-w-lg flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300 text-left">
               <CheckCircle className="text-emerald-400 shrink-0" size={18} />
               <p className="text-emerald-300 text-xs font-bold">{onboardSuccess}</p>
             </div>
           )}

           {onboardError && (
             <div className="w-full max-w-lg flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300 text-left">
               <AlertCircle className="text-rose-400 shrink-0" size={18} />
               <p className="text-rose-300 text-xs font-bold">{onboardError}</p>
             </div>
           )}

           <div className="w-full max-w-lg space-y-5">
             <div className="text-left space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Course Module *</label>
               <select 
                 value={onboardCourseId} 
                 onChange={e => {
                   setOnboardCourseId(e.target.value);
                   setOnboardSuccess(null);
                   setOnboardError(null);
                 }}
                 className="w-full glass-input rounded-2xl px-6 py-4 font-bold text-sm bg-[#080c1e]/90 text-slate-100 border border-white/10"
               >
                 <option value="" className="text-slate-500">-- Select Target Course --</option>
                 {(inventory || []).map((course: any) => (
                   <option key={course.id} value={course.id} className="text-slate-100">
                     {course.code} — {course.name}
                   </option>
                 ))}
               </select>
             </div>

             <div className="w-full p-8 border-2 border-dashed border-white/10 rounded-3xl hover:border-indigo-500/40 hover:bg-white/[0.02] transition-all group">
               <input 
                 type="file" 
                 accept=".csv"
                 className="hidden" 
                 id="onboard-file" 
                 onChange={e => {
                   if (e.target.files && e.target.files.length > 0) {
                     setOnboardFile(e.target.files[0]);
                     setOnboardSuccess(null);
                     setOnboardError(null);
                   }
                 }}
               />
               <label htmlFor="onboard-file" className="flex flex-col items-center cursor-pointer gap-4">
                 <div className={`p-4 glass rounded-2xl transition-colors ${onboardFile ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                   <Upload size={28} />
                 </div>
                 <div className="space-y-1">
                   <p className="text-sm font-black text-slate-300 uppercase tracking-widest">
                     {onboardFile ? onboardFile.name : 'Select Institutional Roster'}
                   </p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                     {onboardFile ? `${(onboardFile.size / 1024).toFixed(1)} KB` : 'Supports .csv (Max 50MB)'}
                   </p>
                 </div>
               </label>
             </div>
           </div>

           <button 
             onClick={handleBulkEnroll}
             disabled={isOnboarding || !onboardCourseId || !onboardFile}
             className="glass-btn-primary px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
           >
             {isOnboarding ? (
               <><Loader2 size={16} className="animate-spin" /> Enrolling Student Roster...</>
             ) : (
               'Start Batch Provisioning'
             )}
           </button>
        </GlassCard>
      )}

      {/* Create Course Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-sidebar rounded-[2.5rem] p-10 border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest text-sm">Initiate New Module</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-3 glass rounded-2xl text-slate-400 hover:text-white transition-colors">
                <Trash2 size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleCreateCourse} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Course Name</label>
                <input 
                  required
                  value={newCourse.name}
                  onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  placeholder="e.g., Advanced Neural Networks"
                  className="w-full glass-input rounded-2xl px-6 py-4 font-bold text-sm" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Code</label>
                  <input 
                    required
                    value={newCourse.code}
                    onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                    placeholder="AI-402"
                    className="w-full glass-input rounded-2xl px-6 py-4 font-bold text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Credits</label>
                  <input 
                    type="number"
                    value={newCourse.credits}
                    onChange={e => setNewCourse({...newCourse, credits: parseInt(e.target.value)})}
                    className="w-full glass-input rounded-2xl px-6 py-4 font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Strategic Description</label>
                <textarea 
                  value={newCourse.description}
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                  rows={4}
                  placeholder="Outline the learning objectives and institutional impact..."
                  className="w-full glass-input rounded-2xl px-6 py-4 font-bold text-sm resize-none" 
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 glass-btn-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
              >
                {isSubmitting ? 'Syncing...' : 'Deploy Institutional Module'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyCMS;
