import { motion } from 'framer-motion';
import { Play, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none opacity-50 mix-blend-screen" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 flex flex-col items-center text-center">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-300 mb-8 backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"></span>
          Workivo AI Co-pilot is live
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white max-w-5xl leading-[1.1]"
        >
          Land Interviews <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">Faster with AI.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-lg md:text-xl text-slate-400 max-w-2xl font-normal leading-relaxed"
        >
          AI-powered resume optimization, ATS scoring, tailored resumes and cover letters in seconds. Stop guessing. Start interviewing.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto"
        >
          <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 text-white text-base font-semibold hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:scale-105 transform duration-200">
            Get Started Free
          </button>
          <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white text-base font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 group">
            <Play size={18} className="text-slate-300 group-hover:text-white transition-colors" />
            Watch 60 Second Demo
          </button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 flex items-center justify-center gap-6 sm:gap-12 flex-wrap text-sm font-medium text-slate-400"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            ATS Optimized
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            AI Powered
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Secure
          </div>
        </motion.div>

        {/* Abstract Hero Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 w-full max-w-4xl relative"
        >
          <div className="aspect-[16/9] md:aspect-[21/9] rounded-2xl md:rounded-[32px] border border-white/10 bg-[#111118]/80 backdrop-blur-xl shadow-2xl relative overflow-hidden flex items-center justify-center p-8">
            
            {/* Grid pattern background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>
            
            {/* Animated UI Elements */}
            <div className="relative z-10 w-full max-w-md">
              <div className="space-y-6">
                
                {/* Simulated processing bar */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                </div>

                {/* Floating Chips */}
                <div className="flex justify-center gap-4">
                  <motion.div
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    ATS Score: 94%
                  </motion.div>
                  <motion.div
                    animate={{ y: [5, -5, 5] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-mono shadow-[0_0_15px_rgba(99,102,241,0.15)] flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                    Tailored in 4s
                  </motion.div>
                </div>
                
                {/* Dummy Document Representation */}
                <div className="space-y-3 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="w-1/3 h-4 rounded bg-white/10"></div>
                  <div className="w-3/4 h-3 rounded bg-white/5"></div>
                  <div className="w-full h-3 rounded bg-white/5"></div>
                  <div className="w-5/6 h-3 rounded bg-white/5"></div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
