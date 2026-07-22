import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Paste the Job Description',
    description: 'Drop in any job posting URL or paste the description directly.',
    Visual: () => (
      <div className="w-full h-32 rounded-xl bg-[#0a0a0f] border border-white/10 p-4 flex flex-col relative overflow-hidden">
        <div className="h-4 w-1/3 bg-white/10 rounded mb-3"></div>
        <div className="h-2 w-full bg-white/5 rounded mb-2"></div>
        <div className="h-2 w-4/5 bg-white/5 rounded mb-2"></div>
        <div className="h-2 w-5/6 bg-white/5 rounded"></div>
        <div className="absolute top-1/2 left-1/2 w-1.5 h-4 bg-indigo-500 animate-pulse -translate-y-1/2"></div>
      </div>
    )
  },
  {
    number: '02',
    title: 'Upload Your Resume',
    description: 'We analyze your resume against the role in real time.',
    Visual: () => (
      <div className="w-full h-32 rounded-xl bg-[#0a0a0f] border border-white/10 p-4 flex flex-col justify-center items-center relative overflow-hidden">
        <div className="w-12 h-14 bg-white/5 border border-white/10 rounded flex flex-col items-center justify-center gap-1.5 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative">
          <div className="w-6 h-1 bg-white/20 rounded-full"></div>
          <div className="w-8 h-1 bg-white/20 rounded-full"></div>
          <div className="w-5 h-1 bg-white/20 rounded-full"></div>
          {/* Scanning line */}
          <div className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_8px_#818cf8] animate-scan z-10 top-0"></div>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="w-[60%] h-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-[pulse_2s_infinite]"></div>
        </div>
      </div>
    )
  },
  {
    number: '03',
    title: 'Get Your Optimized Resume',
    description: 'Download your tailored resume and cover letter. Apply with confidence.',
    Visual: () => (
      <div className="w-full h-32 rounded-xl bg-[#0a0a0f] border border-white/10 p-4 flex items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-emerald-500/5 mix-blend-screen pointer-events-none"></div>
        <div className="flex flex-col items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Ready
          </div>
          <div className="px-6 py-2 rounded bg-white border border-white/20 text-black text-xs font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            Download PDF
          </div>
        </div>
      </div>
    )
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6"
          >
            How it works
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Three steps to your next interview
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            It's faster than filling out the job application form.
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="hidden lg:block absolute top-[calc(50%-1px)] left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 overflow-hidden z-10 backdrop-blur-sm"
              >
                <div className="absolute top-4 right-4 text-8xl font-black text-white/[0.03] select-none pointer-events-none leading-none -mt-4 -mr-2">
                  {step.number}
                </div>
                
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6 relative z-10">
                  Step {step.number}
                </div>

                <div className="mb-6 relative z-10">
                  <step.Visual />
                </div>

                <h3 className="text-xl font-bold text-white mb-3 relative z-10">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed relative z-10">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}