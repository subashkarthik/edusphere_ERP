import React, { useState } from 'react';
import { Cpu, FlaskConical, Play, RotateCcw, CheckCircle2, Zap, Layers, Sparkles } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export const VirtualLab3DView: React.FC = () => {
  const [activeExp, setActiveExp] = useState<'CIRCUIT' | 'CHEMISTRY'>('CIRCUIT');

  // Digital Circuit State
  const [inputA, setInputA] = useState(false);
  const [inputB, setInputB] = useState(false);
  const [gateType, setGateType] = useState<'AND' | 'OR' | 'XOR' | 'NAND'>('AND');

  // Chemistry Titration State
  const [dropsAdded, setDropsAdded] = useState(0);
  const [isTitrating, setIsTitrating] = useState(false);

  // Compute Circuit Output
  let circuitOutput = false;
  if (gateType === 'AND') circuitOutput = inputA && inputB;
  if (gateType === 'OR') circuitOutput = inputA || inputB;
  if (gateType === 'XOR') circuitOutput = inputA !== inputB;
  if (gateType === 'NAND') circuitOutput = !(inputA && inputB);

  // Compute pH
  const currentPh = Math.min(14, +(1.0 + dropsAdded * 0.4).toFixed(1));
  const isNeutralized = currentPh >= 7.0 && currentPh <= 8.5;

  const handleAddDrop = () => {
    setDropsAdded(prev => prev + 1);
  };

  const handleResetChem = () => {
    setDropsAdded(0);
    setIsTitrating(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Banner */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              <Sparkles size={16} /> WebGL Interactive Engine • Virtual STEM Laboratory
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">3D Virtual Science & Engineering Lab</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Interactive real-time laboratory simulations for engineering and chemistry</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveExp('CIRCUIT')}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeExp === 'CIRCUIT' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Cpu size={16} /> Digital Logic Circuit Workbench
            </button>
            <button
              onClick={() => setActiveExp('CHEMISTRY')}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeExp === 'CHEMISTRY' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FlaskConical size={16} /> Chemistry Titration Simulator
            </button>
          </div>
        </div>
      </GlassCard>

      {/* EXPERIMENT 1: DIGITAL CIRCUIT WORKBENCH */}
      {activeExp === 'CIRCUIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Circuit Playground (2 Cols) */}
          <div className="lg:col-span-2">
            <GlassCard className="p-8 rounded-[2.5rem] relative overflow-hidden min-h-[420px] flex flex-col justify-between">
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  Logic Gate Simulator • Active: {gateType} GATE
                </span>
                <span className={`text-xs font-black px-3 py-1 rounded-lg ${circuitOutput ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  OUTPUT LED: {circuitOutput ? 'HIGH (1)' : 'LOW (0)'}
                </span>
              </div>

              {/* Interactive Logic Gates Circuit Diagram */}
              <div className="my-8 py-8 px-6 bg-slate-950/80 rounded-3xl border border-white/10 flex items-center justify-around relative">
                
                {/* Inputs Switch Controls */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setInputA(!inputA)}
                      className={`w-12 h-12 rounded-2xl font-black text-sm transition-all shadow-md ${
                        inputA ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {inputA ? '1' : '0'}
                    </button>
                    <span className="text-xs font-bold text-slate-300">Input A</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setInputB(!inputB)}
                      className={`w-12 h-12 rounded-2xl font-black text-sm transition-all shadow-md ${
                        inputB ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {inputB ? '1' : '0'}
                    </button>
                    <span className="text-xs font-bold text-slate-300">Input B</span>
                  </div>
                </div>

                {/* Gate Center Node */}
                <div className="p-6 bg-indigo-600/30 border-2 border-indigo-500 rounded-3xl text-center space-y-1">
                  <Cpu size={32} className="mx-auto text-indigo-300" />
                  <p className="text-xs font-black text-white">{gateType} GATE</p>
                </div>

                {/* Output Glowing LED Bulb */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                    circuitOutput
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.8)] scale-110'
                      : 'bg-slate-900 border border-white/10 text-slate-600'
                  }`}>
                    <Zap size={28} />
                  </div>
                  <span className="text-xs font-bold text-slate-300">Output Lamp</span>
                </div>

              </div>

              <div className="text-center text-xs text-slate-400 font-medium">
                Click Input A & Input B buttons above to toggle binary states (0 / 1) and test truth tables live!
              </div>

            </GlassCard>
          </div>

          {/* Controls Panel (1 Col) */}
          <GlassCard className="p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">Gate Selector</h3>

            <div className="grid grid-cols-2 gap-3">
              {(['AND', 'OR', 'XOR', 'NAND'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGateType(g)}
                  className={`p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                    gateType === g ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {g} Gate
                </button>
              ))}
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Truth Table Verification</p>
              <p className="text-xs text-slate-300 font-medium">
                For {gateType} Gate: Output is HIGH when {
                  gateType === 'AND' ? 'both A and B are 1' :
                  gateType === 'OR' ? 'at least one input is 1' :
                  gateType === 'XOR' ? 'inputs A and B are different' :
                  'inputs are NOT both 1'
                }.
              </p>
            </div>
          </GlassCard>

        </div>
      )}

      {/* EXPERIMENT 2: CHEMISTRY TITRATION */}
      {activeExp === 'CHEMISTRY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Titration Bench (2 Cols) */}
          <div className="lg:col-span-2">
            <GlassCard className="p-8 rounded-[2.5rem] relative min-h-[420px] flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  Acid-Base Titration Workbench (HCl + NaOH)
                </span>
                <span className={`text-xs font-black px-3 py-1 rounded-lg ${isNeutralized ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  pH: {currentPh} • {isNeutralized ? 'EQUIVALENCE POINT REACHED' : 'ACIDIC'}
                </span>
              </div>

              {/* Lab Flask Simulation Graphic */}
              <div className="my-6 py-8 px-6 bg-slate-950/80 rounded-3xl border border-white/10 flex items-center justify-center gap-12">
                
                {/* Burette Graphic */}
                <div className="w-12 h-48 bg-slate-900 border-2 border-white/20 rounded-t-xl relative flex flex-col justify-end p-1">
                  <div className="w-full bg-indigo-500/40 rounded-t-sm transition-all" style={{ height: `${Math.max(10, 100 - dropsAdded * 5)}%` }} />
                </div>

                {/* Conical Flask Graphic */}
                <div className="flex flex-col items-center">
                  <div className={`w-32 h-32 rounded-b-3xl border-2 border-white/20 relative flex items-end p-2 transition-all duration-700 ${
                    isNeutralized ? 'bg-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.5)]' : 'bg-teal-500/20'
                  }`}>
                    <div className="w-full text-center text-[10px] font-black text-white mb-2">
                      {isNeutralized ? 'Phenolphthalein Pink' : 'Clear Solution'}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-300 mt-2">Conical Flask (25mL HCl)</span>
                </div>

              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleAddDrop}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition shadow-lg flex items-center gap-2"
                >
                  <Play size={16} /> Add 1 Drop NaOH ({dropsAdded} drops added)
                </button>
                <button
                  onClick={handleResetChem}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest rounded-2xl transition flex items-center gap-2"
                >
                  <RotateCcw size={16} /> Reset Flask
                </button>
              </div>

            </GlassCard>
          </div>

          {/* Measurements Panel (1 Col) */}
          <GlassCard className="p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">pH Curve Meter</h3>

            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-center space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Measured pH Level</p>
              <p className="text-4xl font-black text-indigo-400">{currentPh}</p>
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-300">
              <p>• Titrant: 0.1M NaOH Solution</p>
              <p>• Analyte: 0.1M HCl Solution</p>
              <p>• Indicator: Phenolphthalein</p>
            </div>

            {isNeutralized && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
                <p className="text-xs font-black text-emerald-300">Perfect Neutralization Achieved!</p>
              </div>
            )}
          </GlassCard>

        </div>
      )}

    </div>
  );
};

export default VirtualLab3DView;
