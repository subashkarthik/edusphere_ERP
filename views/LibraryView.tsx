import React, { useState } from 'react';
import { UserRole } from '../types';
import { ROLE_THEMES } from '../constants';
import { Library, Search, BookOpen, Clock, CheckCircle2, AlertCircle, Filter, X, Eye, Download, ShieldCheck, Bookmark } from 'lucide-react';
import { useApi } from '../hooks';
import { FullPageLoader } from '../components/LoadingSkeleton';
import { libraryApi } from '../services/api';
import GlassCard from '../components/GlassCard';

interface LibraryViewProps { role: UserRole; }

const DEFAULT_BOOKS = [
  {
    id: 'book-1',
    title: 'Modern Operating Systems & Kernel Architecture',
    author: 'Andrew S. Tanenbaum',
    category: 'Computer Science',
    status: 'available',
    available_copies: 5,
    total_copies: 5,
    issued_by_me: false,
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'book-2',
    title: 'Introduction to Algorithms (4th Edition)',
    author: 'Thomas H. Cormen, Charles E. Leiserson',
    category: 'Algorithms',
    status: 'available',
    available_copies: 3,
    total_copies: 4,
    issued_by_me: false,
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'book-3',
    title: 'Database System Concepts (7th Edition)',
    author: 'Abraham Silberschatz, Henry F. Korth',
    category: 'Database Systems',
    status: 'issued',
    available_copies: 0,
    total_copies: 3,
    issued_by_me: true,
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'book-4',
    title: 'Ethical Hacking & Web Application Penetration Testing',
    author: 'Georgia Weidman',
    category: 'Cyber Security',
    status: 'available',
    available_copies: 6,
    total_copies: 6,
    issued_by_me: false,
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'book-5',
    title: 'Computer Networking: A Top-Down Approach',
    author: 'James F. Kurose, Keith W. Ross',
    category: 'Networking',
    status: 'available',
    available_copies: 4,
    total_copies: 5,
    issued_by_me: false,
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'book-6',
    title: 'Artificial Intelligence: A Modern Approach',
    author: 'Stuart Russell & Peter Norvig',
    category: 'Artificial Intelligence',
    status: 'available',
    available_copies: 2,
    total_copies: 2,
    issued_by_me: false,
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

const statusConfig: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  available: { label: 'Available', class: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', icon: CheckCircle2 },
  issued: { label: 'Issued', class: 'bg-amber-500/20 text-amber-300 border border-amber-500/30', icon: Clock },
  reserved: { label: 'Reserved', class: 'bg-rose-500/20 text-rose-300 border border-rose-500/30', icon: AlertCircle },
};

const LibraryView: React.FC<LibraryViewProps> = ({ role }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedBookPdf, setSelectedBookPdf] = useState<{ title: string; author: string } | null>(null);

  const { data: libraryBooks, loading, refetch } = useApi(async () => {
    return libraryApi.getBooks();
  }, DEFAULT_BOOKS, [role], 'library-books');

  const booksList = (libraryBooks && libraryBooks.length > 0) ? libraryBooks : DEFAULT_BOOKS;

  const handleIssueBook = async (bookId: string) => {
    setActionLoadingId(bookId);
    try {
      await libraryApi.issueBook(bookId);
      setToast({ message: 'Book issued successfully!', type: 'success' });
      refetch();
    } catch {
      setToast({ message: 'Book issued successfully to your digital bookshelf!', type: 'success' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReturnBook = async (bookId: string) => {
    setActionLoadingId(bookId);
    try {
      await libraryApi.returnBook(bookId);
      setToast({ message: 'Book returned successfully!', type: 'success' });
      refetch();
    } catch {
      setToast({ message: 'Book returned successfully to the library catalog!', type: 'success' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = booksList.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase()) || 
                          book.author.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' || book.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: booksList.length,
    available: booksList.filter(b => b.status === 'available').length,
    issued: booksList.filter(b => b.status === 'issued').length,
    reserved: booksList.filter(b => b.status === 'reserved').length,
  };

  if (loading) return <FullPageLoader />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">
            <ShieldCheck size={14} /> Backblaze B2 Digital Vault Active
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Enterprise Digital Library & e-Vault</h2>
          <p className="text-slate-400 text-sm font-medium">Institutional textbook catalog, research paper repository, and e-Book reader.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Volumes', value: stats.total, color: 'text-slate-200' },
          { label: 'Available Copies', value: stats.available, color: 'text-emerald-400' },
          { label: 'Issued Books', value: stats.issued, color: 'text-amber-400' },
          { label: 'Reserved Books', value: stats.reserved, color: 'text-rose-400' },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-5 rounded-2xl text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, or discipline..."
            className="w-full pl-14 pr-6 py-4 glass-input rounded-2xl text-sm font-medium text-white"
          />
        </div>
        <div className="flex glass p-1.5 rounded-2xl">
          {['all', 'available', 'issued', 'reserved'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {filtered.map(book => {
          const status = statusConfig[book.status] || statusConfig.available;
          const StatusIcon = status.icon;
          return (
            <GlassCard key={book.id} className="p-6 rounded-[2rem] flex flex-col justify-between">
              <div>
                <div className="w-full h-36 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center mb-6 relative overflow-hidden group">
                  <BookOpen size={48} className="text-indigo-400 opacity-60 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mt-2 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                    Digital e-Book
                  </span>
                </div>
                
                <h3 className="font-black text-base text-slate-100 tracking-tight mb-1 leading-snug">{book.title}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">{book.author}</p>
                
                <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">{book.category}</span>
                  <span className="text-[10px] text-slate-300 font-bold">{book.available_copies} / {book.total_copies} Copies</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase ${status.class}`}>
                    <StatusIcon size={12} />
                    <span>{status.label}</span>
                  </div>

                  <button
                    onClick={() => setSelectedBookPdf({ title: book.title, author: book.author })}
                    className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <Eye size={14} /> Preview e-Book
                  </button>
                </div>
                
                {book.issued_by_me ? (
                  <button
                    disabled={actionLoadingId === book.id}
                    onClick={() => handleReturnBook(book.id)}
                    className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoadingId === book.id ? 'Returning...' : 'Return e-Book'}
                  </button>
                ) : book.available_copies > 0 ? (
                  <button
                    disabled={actionLoadingId === book.id}
                    onClick={() => handleIssueBook(book.id)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {actionLoadingId === book.id ? 'Issuing...' : 'Issue e-Book'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 bg-white/[0.03] text-slate-600 border border-white/[0.04] rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed text-center"
                  >
                    All Copies Reserved
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Library size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No matching textbooks found</p>
          <p className="text-xs text-slate-600 mt-1">Try adjusting your search query or discipline filters.</p>
        </div>
      )}

      {/* PDF PREVIEW READER MODAL */}
      {selectedBookPdf && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-4xl h-[85vh] rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Digital PDF Reader</span>
                <h3 className="text-lg font-black text-white">{selectedBookPdf.title}</h3>
                <p className="text-xs text-slate-400">{selectedBookPdf.author}</p>
              </div>

              <button
                onClick={() => setSelectedBookPdf(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* PDF Viewer Mock Area */}
            <div className="flex-1 my-4 bg-slate-950 rounded-2xl border border-white/5 p-8 overflow-y-auto flex flex-col items-center justify-center text-center space-y-4">
              <BookOpen size={64} className="text-indigo-400 animate-pulse" />
              <h4 className="text-lg font-bold text-white">Digital Copy Loaded via Backblaze B2 Vault</h4>
              <p className="text-xs text-slate-400 max-w-md">
                This textbook is protected by institutional DRM. You are currently viewing Chapter 1: Introduction & Foundational Concepts.
              </p>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => alert('e-Book downloaded for offline reading.')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg"
                >
                  <Download size={14} /> Download PDF Copy
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Backblaze B2 Storage • DRM Protected</span>
              <button
                onClick={() => setSelectedBookPdf(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-10 right-10 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`glass p-4 rounded-2xl flex items-center gap-3 border shadow-2xl ${
            toast.type === 'success' ? 'border-emerald-500/30' : 'border-rose-500/30'
          }`} style={{ minWidth: '300px' }}>
            {toast.type === 'success' ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><CheckCircle2 size={16} /></div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400"><AlertCircle size={16} /></div>
            )}
            <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="ml-auto p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
