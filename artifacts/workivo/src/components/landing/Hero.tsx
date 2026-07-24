import { motion } from 'framer-motion';
import { Play, ShieldCheck, Lock, Zap, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';


export default function Hero() {
  const [, setLocation] = useLocation();

  return (
  
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/4 right-[10%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none mix-blend-screen" />
      
      {/* Faint dot grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 flex flex-col items-center text-center">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative inline-flex p-[1px] rounded-full overflow-hidden mb-10 cursor-pointer group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 to-violet-500/40 rounded-full" />
          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0a0a0f]/90 backdrop-blur-sm text-sm font-medium text-slate-300 group-hover:bg-[#0a0a0f]/70 transition-colors">
            <span className="text-indigo-400">✦</span>
            Introducing AI Resume Co-pilot v2.0
            <span className="text-slate-500 mx-1">—</span>
            Read the announcement <ArrowRight size={14} className="text-indigo-400" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-6xl md:text-[80px] font-black tracking-tighter text-white max-w-5xl leading-none flex flex-col items-center gap-2"
        >
          <span>Land Interviews</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 animate-shimmer">
            Faster with AI.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-lg text-slate-400 max-w-xl font-normal leading-relaxed"
        >
          The AI co-pilot that rewrites your resume, beats ATS filters, and writes your cover letter — in under 10 seconds.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto"
        <button
  onClick={() => setLocation('/signup')}
  className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-base font-semibold hover:brightness-110 transition-all shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:scale-[1.02] transform duration-200"
>
  Get Started Free
</button>
            
          
          <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.04] border border-white/15 text-white text-base font-semibold hover:bg-white/8 transition-all flex items-center justify-center gap-3 backdrop-blur-sm group">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Play size={12} className="text-indigo-400 fill-current" />
            </div>
            Watch 60 Second Demo
          </button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 flex items-center justify-center gap-4 sm:gap-6 flex-wrap text-sm font-medium text-slate-500"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            SOC 2 Compliant
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-slate-400" />
            256-bit Encryption
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-indigo-400" />
            10,000+ Resumes Optimized
          </div>
        </motion.div>

        {/* Social Proof Strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <div className="flex -space-x-3">
            {['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500'].map((color, i) => (
              <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center text-[10px] font-bold text-white ${color}`}>
                {['SK', 'MT', 'PS', 'JR', 'AL'][i]}
              </div>
            ))}
          </div>
          <span className="text-sm text-slate-400">Join 10,000+ job seekers</span>
        </motion.div>

        {/* Hero Visual Mock UI */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 w-full max-w-5xl mx-auto"
        >
          <div className="rounded-[28px] border border-white/10 bg-[#0d0d14] overflow-hidden shadow-[0_40px_100px_-20px_rgba(99,102,241,0.2)] flex flex-col md:flex-row min-h-[400px]">
            
            {/* Left Panel */}
            <div className="w-full md:w-2/5 bg-[#111119] border-r border-white/5 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white text-sm font-semibold">Resume Analysis</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"></span>
              </div>
              
              <div className="bg-white/5 rounded-full px-3 py-1.5 inline-block w-max mb-6">
                <span className="text-xs text-slate-400">Senior Frontend Engineer @ Stripe</span>
              </div>
              
              <div className="h-px w-full bg-white/5 mb-8"></div>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 mb-4">
                  {/* SVG Circle Progress */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gradient)" strokeWidth="6" strokeDasharray="282.7" strokeDashoffset="22.6" strokeLinecap="round" className="animate-[stroke_1.5s_ease-out_forwards]" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white leading-none">92</span>
                    <span className="text-xs text-slate-500 mt-1">ATS Score</span>
                  </div>
                </div>

                <div className="w-full space-y-3 mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5"><Zap size={12} className="text-emerald-400"/> Keyword Match</span>
                    <span className="text-white font-medium">94%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="w-[94%] h-full bg-emerald-400 rounded-full"></div></div>
                  
                  <div className="flex items-center justify-between text-xs mt-3">
                    <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck size={12} className="text-indigo-400"/> Format Score</span>
                    <span className="text-white font-medium">88%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="w-[88%] h-full bg-indigo-400 rounded-full"></div></div>

                  <div className="flex items-center justify-between text-xs mt-3">
                    <span className="text-slate-400 flex items-center gap-1.5"><Zap size={12} className="text-purple-400"/> Impact Score</span>
                    <span className="text-white font-medium">91%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="w-[91%] h-full bg-purple-400 rounded-full"></div></div>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-3/5 bg-[#0d0d14] relative overflow-hidden flex flex-col">
              {/* Scan line animation */}
              <div className="absolute inset-0 w-full h-[150%] bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent animate-scan pointer-events-none z-20 mix-blend-screen" />
              
              <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-[#0a0a0f]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="mx-auto text-xs text-slate-500 font-mono">optimized_resume.pdf</div>
              </div>
              
              <div className="p-8 flex-1 relative">
                {/* Resume Mock Lines */}
                <div className="w-1/3 h-5 bg-white/90 rounded-sm mb-4"></div>
                <div className="flex gap-3 mb-10">
                  <div className="w-20 h-2 bg-white/20 rounded-sm"></div>
                  <div className="w-24 h-2 bg-white/20 rounded-sm"></div>
                  <div className="w-32 h-2 bg-white/20 rounded-sm"></div>
                </div>
                
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-3">Experience</div>
                <div className="space-y-2 mb-8">
                  <div className="flex justify-between items-center mb-1">
                    <div className="w-2/5 h-3 bg-white/60 rounded-sm"></div>
                    <div className="w-16 h-2 bg-white/20 rounded-sm"></div>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-sm"></div>
                  <div className="w-11/12 h-2 bg-white/10 rounded-sm"></div>
                  <div className="w-4/5 h-2 bg-white/10 rounded-sm"></div>
                  <div className="w-full h-2 bg-white/10 rounded-sm"></div>
                </div>

                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-3">Skills</div>
                <div className="flex flex-wrap gap-2 mb-8">
                  {['React', 'TypeScript', 'Node.js', 'AWS', 'Next.js', 'GraphQL'].map((skill, i) => (
                    <div key={i} className="px-2 py-1 rounded-sm bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                      {skill}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="w-full h-2 bg-white/10 rounded-sm"></div>
                  <div className="w-10/12 h-2 bg-white/10 rounded-sm"></div>
                </div>
              </div>

              {/* Suggestions Panel */}
              <div className="absolute bottom-4 right-4 left-4 p-3 bg-[#111119]/90 backdrop-blur-md border border-indigo-500/30 rounded-xl shadow-lg z-30">
                <div className="text-xs text-indigo-300 font-medium mb-2 flex items-center gap-1.5">
                  <Zap size={12} /> AI Suggestions Applied
                </div>
                <div className="flex gap-2">
                  <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">Added Next.js to match JD</div>
                  <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">Rewrote bullet for impact</div>
                </div>
              </div>
            </div>
            
          </div>
        </motion.div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes stroke {
          to { stroke-dashoffset: 0; }
        }
      `}} />
    </section>
  );
}
