import React, { useState } from 'react';
import { Award, Zap, Shield, Swords, CheckCircle2, Lock, Trophy, Sparkles, User, Users } from 'lucide-react';
import GlassCard from '../components/GlassCard';

interface SkillNode {
  id: string;
  title: string;
  category: string;
  level: number;
  xpReward: number;
  status: 'UNLOCKED' | 'IN_PROGRESS' | 'LOCKED';
  description: string;
}

const SKILL_NODES: SkillNode[] = [
  { id: 'node-1', title: 'Ethical Hacking Basics', category: 'Cyber Security', level: 1, xpReward: 500, status: 'UNLOCKED', description: 'Network scanning, port enumeration, Wireshark packet capture.' },
  { id: 'node-2', title: 'Cloud DevOps Specialist', category: 'Cloud Infrastructure', level: 2, xpReward: 750, status: 'UNLOCKED', description: 'Docker containerization, Kubernetes helm deployments.' },
  { id: 'node-3', title: 'Neural Networks & Deep Learning', category: 'AI Engineering', level: 3, xpReward: 1000, status: 'IN_PROGRESS', description: 'PyTorch tensors, convolution layers, transformer models.' },
  { id: 'node-4', title: 'Enterprise System Architect', category: 'Systems', level: 4, xpReward: 1500, status: 'LOCKED', description: 'Microservices architecture, Redis caching, event streaming.' }
];

export const SkillQuestView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TREE' | 'BATTLE'>('TREE');
  const [battleOpponent, setBattleOpponent] = useState<string | null>(null);
  const [battleState, setBattleState] = useState<'IDLE' | 'MATCHING' | 'BATTLED' | 'FINISHED'>('IDLE');
  const [score, setScore] = useState({ me: 0, opponent: 0 });

  const startPeerBattle = (opponentName: string) => {
    setBattleOpponent(opponentName);
    setBattleState('MATCHING');

    setTimeout(() => {
      setBattleState('BATTLED');
    }, 1500);
  };

  const finishBattle = () => {
    setScore({ me: 4, opponent: 2 });
    setBattleState('FINISHED');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Banner */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              <Trophy size={16} /> Gamified Learning Engine • Skill Mastery
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">RPG Skill Quest Tree & Peer Battle Arena</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Unlock tech skill nodes, earn XP points, and battle classmates in 1v1 speed quizzes</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('TREE')}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === 'TREE' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={16} /> Skill Quest Tree
            </button>
            <button
              onClick={() => setActiveTab('BATTLE')}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === 'BATTLE' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Swords size={16} /> 1v1 Peer Battle Arena
            </button>
          </div>
        </div>

        {/* XP Status Bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Player Rank & Level</p>
            <p className="text-sm font-black text-indigo-400 mt-1 flex items-center gap-1">
              <Zap size={14} /> LEVEL 14 • SENIOR TECH MASTER
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Earned XP</p>
            <p className="text-sm font-black text-amber-400 mt-1">14,250 XP Points</p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Battle Win Rate</p>
            <p className="text-sm font-black text-emerald-400 mt-1">88.4% (24 Wins / 3 Losses)</p>
          </div>
        </div>
      </GlassCard>

      {/* SKILL QUEST TREE TAB */}
      {activeTab === 'TREE' && (
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-100">Engineering Skill Progression Tree</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SKILL_NODES.map((node) => (
              <GlassCard key={node.id} className="p-6 rounded-[2rem] relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-2.5 py-1 bg-indigo-500/20 rounded-md">
                    {node.category} • LEVEL {node.level}
                  </span>

                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                    node.status === 'UNLOCKED' ? 'bg-emerald-500/20 text-emerald-300' :
                    node.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {node.status}
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-100 mb-2">{node.title}</h4>
                <p className="text-xs text-slate-400 font-medium mb-4">{node.description}</p>

                <div className="flex justify-between items-center pt-4 border-t border-white/[0.06]">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                    <Zap size={14} /> +{node.xpReward} XP Reward
                  </span>

                  {node.status === 'UNLOCKED' && (
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Mastered
                    </span>
                  )}
                  {node.status === 'IN_PROGRESS' && (
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition">
                      Continue Quest
                    </button>
                  )}
                  {node.status === 'LOCKED' && (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Lock size={14} /> Requires Level 4
                    </span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* 1V1 PEER BATTLE ARENA TAB */}
      {activeTab === 'BATTLE' && (
        <div className="space-y-6">
          <GlassCard className="p-8 rounded-[2.5rem]">
            <h3 className="text-xl font-black text-slate-100 mb-2 flex items-center gap-2">
              <Swords size={20} className="text-rose-500" /> Live 1v1 Peer Quiz Arena
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-6">Challenge online classmates to a 5-question speed quiz battle for XP bragging rights!</p>

            {battleState === 'IDLE' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { name: 'Priya Sharma', title: 'Top Ranked in ECE', xp: '12,800 XP' },
                  { name: 'Karthik Raja', title: 'Cyber Security Champion', xp: '15,100 XP' },
                  { name: 'Divya Nair', title: 'AI Engineering Specialist', xp: '11,400 XP' },
                ].map((peer, pIdx) => (
                  <div key={pIdx} className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/30 text-indigo-300 font-black flex items-center justify-center mx-auto">
                      {peer.name[0]}
                    </div>
                    <p className="text-sm font-bold text-slate-200">{peer.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{peer.title} • {peer.xp}</p>
                    <button
                      onClick={() => startPeerBattle(peer.name)}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <Swords size={14} /> Challenge to Battle
                    </button>
                  </div>
                ))}
              </div>
            )}

            {battleState === 'MATCHING' && (
              <div className="text-center py-12 space-y-4">
                <Swords size={48} className="mx-auto text-rose-500 animate-bounce" />
                <h4 className="text-lg font-black text-slate-100">Connecting to {battleOpponent}...</h4>
                <p className="text-xs text-slate-400 font-medium">Initializing 5-question speed duel match environment</p>
              </div>
            )}

            {battleState === 'BATTLED' && (
              <div className="space-y-6 text-center py-6">
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                  LIVE BATTLE MATCH vs {battleOpponent}
                </span>

                <div className="p-6 bg-slate-950 rounded-3xl border border-white/10 space-y-4">
                  <p className="text-sm font-bold text-slate-200">Question 1: What is the default port used by HTTPS protocol?</p>

                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    <button onClick={finishBattle} className="p-3 bg-slate-900 hover:bg-emerald-600/30 text-slate-200 text-xs font-bold rounded-xl border border-white/5 transition">
                      Port 443 (Correct)
                    </button>
                    <button onClick={finishBattle} className="p-3 bg-slate-900 hover:bg-rose-600/30 text-slate-200 text-xs font-bold rounded-xl border border-white/5 transition">
                      Port 80
                    </button>
                  </div>
                </div>
              </div>
            )}

            {battleState === 'FINISHED' && (
              <div className="text-center py-8 space-y-4 animate-in fade-in duration-500">
                <Trophy size={48} className="mx-auto text-amber-400" />
                <h4 className="text-2xl font-black text-emerald-400">VICTORY! You won 4 - 2!</h4>
                <p className="text-xs text-slate-400 font-medium">+350 XP earned • Global Leaderboard Rank #12</p>
                <button
                  onClick={() => setBattleState('IDLE')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition"
                >
                  Return to Battle Arena
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default SkillQuestView;
