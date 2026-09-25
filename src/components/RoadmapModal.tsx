import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Clock, Cpu, Wrench, Shield, Database } from 'lucide-react';

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROADMAP_STEPS = [
  { version: 'v1.0', name: 'Cinematic Voice & Core Experience', active: true, desc: 'Interactive AI core orb, speech recognition, Google Gemini, text-to-speech, and responsive cinematic UI.' },
  { version: 'v2.0', name: 'Wake Word Architecture', active: true, desc: 'Continuous hands-free wake word detection with automatic "Yes?" acknowledgment and command transition.' },
  { version: 'v2.1', name: 'Voice-Only & Live Weather Tool ("Hey Jarvis")', active: true, desc: 'Voice-first interface, dynamic English female voice synthesis, "Hey Jarvis" wake phrase, and real Open-Meteo live weather tool.' },
  { version: 'v3.0', name: 'Gemini Function Calling', active: false, desc: 'Real-time tool invocation engine connecting Gemini to real APIs.' },
  { version: 'v4.0', name: 'Personal Tools Suite', active: false, desc: 'Live weather, web search, local reminders, and personal expense logging.' },
  { version: 'v5.0', name: 'Persistent Memory & Preferences', active: false, desc: 'Long-term MongoDB user profile, custom preferences, and episodic dialogue recall.' },
  { version: 'v6.0', name: 'Email & Calendar Integration', active: false, desc: 'Google Workspace / OAuth synchronization for schedule management and briefings.' },
  { version: 'v7.0', name: 'Desktop Agent Integration', active: false, desc: 'System-level shortcuts, clipboard hooks, and window orchestration.' },
  { version: 'v8.0', name: 'Physical Hardware / Raspberry Pi Core', active: false, desc: 'Dedicated physical hardware speaker-box enclosure with far-field mic array and LED aura.' },
];

const FUTURE_TOOLS = [
  { name: 'getWeather()', desc: 'Real-time local weather forecasts' },
  { name: 'searchWeb()', desc: 'Live web search with Gemini grounding' },
  { name: 'createReminder()', desc: 'Timed alerts and productivity reminders' },
  { name: 'getCalendarEvents()', desc: 'Schedule and agenda overview' },
  { name: 'sendEmail()', desc: 'Draft and send messages' },
  { name: 'addExpense() / getExpenses()', desc: 'Personal finance transaction tracking' },
  { name: 'controlSmartHomeDevice()', desc: 'Smart home IoT lighting and temperature' },
];

export const RoadmapModal: React.FC<RoadmapModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl rounded-2xl bg-[#080d19] border border-white/10 p-6 shadow-2xl text-white max-h-[88vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-medium tracking-wide">System Evolution Roadmap</h3>
                <p className="text-xs font-mono text-white/40">Architectural Roadmap from v1 to Hardware Core</p>
              </div>
            </div>

            <button
              id="roadmap-btn-close"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close roadmap modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Version Progression */}
          <div className="mb-6">
            <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-300/80 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Evolution Milestones
            </h4>
            <div className="flex flex-col gap-2.5">
              {ROADMAP_STEPS.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    step.active
                      ? 'bg-cyan-950/30 border-cyan-500/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          step.active
                            ? 'bg-cyan-500 text-black'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {step.version}
                      </span>
                      <span className="text-xs font-medium text-white/90">
                        {step.name}
                      </span>
                    </div>
                    {step.active ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-white/30">
                        PLANNED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 font-light leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Planned Tools Declarations */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-300/80 mb-2.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Engineered Tool Call Architecture (Upcoming v3/v4)
            </h4>
            <p className="text-xs text-white/60 font-light mb-3">
              The backend has structured controller schemas and function declarations ready for Gemini tool-calling execution:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FUTURE_TOOLS.map((tool, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-black/30 border border-white/5 font-mono text-[11px]"
                >
                  <span className="text-cyan-400 font-semibold">{tool.name}</span>
                  <p className="text-white/40 text-[10px] font-sans mt-0.5">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
