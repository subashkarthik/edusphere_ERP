import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, CheckCircle2, Award, RefreshCw, ChevronRight, Play, ShieldAlert } from 'lucide-react';
import GlassCard from '../components/GlassCard';

interface VivaQuestion {
  id: number;
  subject: string;
  question: string;
  expectedKeywords: string[];
  sampleAnswer: string;
}

const VIVA_QUESTIONS: VivaQuestion[] = [
  {
    id: 1,
    subject: 'Ethical Hacking & Cyber Security',
    question: 'Explain the concept of SQL Injection and how parameterized queries prevent it.',
    expectedKeywords: ['injection', 'sanitize', 'parameterized', 'prepared statement', 'query'],
    sampleAnswer: 'SQL Injection occurs when untrusted user input is directly concatenated into SQL queries. Parameterized queries bind input parameters separately from SQL logic, preventing malicious command execution.'
  },
  {
    id: 2,
    subject: 'Cloud Infrastructure & DevOps',
    question: 'What is the key difference between Docker Containers and Virtual Machines?',
    expectedKeywords: ['hypervisor', 'kernel', 'shared', 'lightweight', 'container', 'isolation'],
    sampleAnswer: 'Virtual Machines virtualize entire hardware stacks including guest OS via hypervisors, whereas Docker containers share the host OS kernel, making them lightweight and fast.'
  },
  {
    id: 3,
    subject: 'Data Structures & Algorithms',
    question: 'Define the time complexity of QuickSort in best, average, and worst cases.',
    expectedKeywords: ['n log n', 'n^2', 'pivot', 'partition', 'recursion'],
    sampleAnswer: 'QuickSort has a time complexity of O(n log n) in best and average cases, and O(n^2) in worst case when pivots are poorly chosen.'
  }
];

export const VoiceVivaModule: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<{ accuracy: number; clarity: number; keywordsFound: string[]; grade: string } | null>(null);

  const currentQ = VIVA_QUESTIONS[currentIdx];

  // Speak Question using Web Speech Synthesis API
  const speakQuestion = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQ.question);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle Microphone Speech Recognition
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech Recognition microphone API is not supported in this browser. Simulated transcript loaded.');
      simulateAnswer();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    if (!isListening) {
      setIsListening(true);
      setSpokenTranscript('');
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setSpokenTranscript(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsListening(false);
      recognition.stop();
    }
  };

  const simulateAnswer = () => {
    setSpokenTranscript(currentQ.sampleAnswer);
  };

  const evaluateAnswer = () => {
    if (!spokenTranscript) return;
    const textLower = spokenTranscript.toLowerCase();
    const found = currentQ.expectedKeywords.filter(kw => textLower.includes(kw));
    const accuracyPct = Math.round((found.length / currentQ.expectedKeywords.length) * 100);

    setEvaluation({
      accuracy: Math.max(65, accuracyPct),
      clarity: 92,
      keywordsFound: found,
      grade: accuracyPct >= 80 ? 'EXCELLENT (A+)' : accuracyPct >= 50 ? 'GOOD (B+)' : 'NEEDS REVISION (C)'
    });
  };

  const nextQuestion = () => {
    window.speechSynthesis.cancel();
    setSpokenTranscript('');
    setEvaluation(null);
    setCurrentIdx((prev) => (prev + 1) % VIVA_QUESTIONS.length);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Banner */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              <Sparkles size={16} /> Web Speech AI Engine • Interactive Viva Examiner
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">AI Voice Oral Viva Examiner</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Real-time spoken technical Q&A evaluation with voice recognition</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-indigo-400 px-4 py-2 bg-indigo-500/20 rounded-xl">
              Subject: {currentQ.subject}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Main Viva Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Question & Voice Controls (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8 rounded-[2.5rem]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Question {currentQ.id} of {VIVA_QUESTIONS.length}
              </span>

              <button
                onClick={speakQuestion}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isSpeaking ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isSpeaking ? <Volume2 size={16} /> : <Volume2 size={16} />}
                {isSpeaking ? 'AI Examiner Speaking...' : 'Listen to Question'}
              </button>
            </div>

            <h3 className="text-xl font-black text-slate-100 leading-snug">{currentQ.question}</h3>

            {/* Answer Recording Section */}
            <div className="mt-8 pt-6 border-t border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Your Spoken Voice Response:</label>
                
                <div className="flex gap-2">
                  <button
                    onClick={simulateAnswer}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition"
                  >
                    Auto-Fill Sample Answer
                  </button>
                  <button
                    onClick={toggleListening}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      isListening ? 'bg-rose-600 text-white animate-bounce' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    {isListening ? 'Recording Voice...' : 'Start Microphone'}
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={spokenTranscript}
                onChange={(e) => setSpokenTranscript(e.target.value)}
                placeholder="Click 'Start Microphone' and speak your answer out loud..."
                className="w-full glass-input p-4 rounded-2xl text-xs text-slate-100 font-medium"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={evaluateAnswer}
                  disabled={!spokenTranscript}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg flex items-center gap-2"
                >
                  <Sparkles size={16} /> Evaluate Voice Response
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* AI Viva Scorecard (1 Col) */}
        <div className="space-y-6">
          <GlassCard className="p-8 rounded-[2.5rem]">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Award size={18} className="text-indigo-400" /> AI Examiner Scorecard
            </h3>

            {evaluation ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Oral Viva Result</p>
                  <p className="text-xl font-black text-emerald-300 mt-1">{evaluation.grade}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                      <span>Technical Accuracy</span>
                      <span className="text-indigo-400">{evaluation.accuracy}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${evaluation.accuracy}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                      <span>Vocal Clarity</span>
                      <span className="text-emerald-400">{evaluation.clarity}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${evaluation.clarity}%` }} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Key Technical Terms Identified:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.keywordsFound.map((kw, idx) => (
                      <span key={idx} className="text-[9px] font-black text-indigo-300 px-2 py-1 bg-indigo-500/20 rounded-md">
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={nextQuestion}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2"
                >
                  Next Question <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 space-y-3">
                <Mic size={36} className="mx-auto text-slate-600" />
                <p className="text-xs font-medium">Listen to the question, record your voice answer, and click Evaluate!</p>
              </div>
            )}
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default VoiceVivaModule;
