import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Find the Right Opportunity',
    description:
      'Discover relevant jobs and bring the opportunities you want to pursue into Workivo.',
    Visual: () => (
      <div className="w-full h-32 rounded-xl bg-[#0a0a0f] border border-white/10 p-4 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </div>

          <div className="h-2 w-24 bg-white/10 rounded-full" />
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full bg-white/5 rounded-full" />
          <div className="h-2 w-4/5 bg-white/5 rounded-full" />
        </div>

        <div className="absolute right-4 bottom-4 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold">
          Match found
        </div>
      </div>
    ),
  },
  {
    number: '02',
    title: 'Check Your Fit',
    description:
      'Analyze your resume against the role and see where you can improve your chances before applying.',
    Visual: () => (
      <div className="w-full h-32 rounded-xl bg-[#0a0a0f] border border-white/10 p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-2 w-20 bg-white/10 rounded-full mb-2" />
            <div className="h-1.5 w-14 bg-white/5 rounded-full" />
          </div>

          <div className="relative h-12 w-12 rounded-full border-4 border-indigo-500/20 flex items-center justify-center">
            <div className="absolute inset-[-4px] rounded-full border-4 border-indigo-500 border-r-transparent border-b-transparent rotate-45" />
            <span className="text-[11px] font-bold text-white">82%</span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="w-[82%] h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
        </div>

        <div className="flex gap-2 mt-3">
          <div className="h-1.5 w-12 bg-emerald-400/30 rounded-full" />
          <div className="h-1.5 w-16 bg-white/10 rounded-full" />
          <div className="h-1.5 w-8 bg-white/10 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    number: '03',
    title: 'Tailor Your Application',
    description:
      'Turn your existing resume into a job-specific application designed around the role you want.',
    Visual: () => (
      <div className="w-full h-32 rounded-xl bg-[#0a0a0f] border border-white/10 p-4 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-12 bg-white/[0.04] border border-white/10 rounded-lg flex flex-col items-center justify-center gap-1.5 relative overflow-hidden">
            <div className="w-5 h-1 bg-white/20 rounded-full" />
            <div className="w-7 h-1 bg-white/10 rounded-full" />
            <div className="w-4 h-1 bg-white/10 rounded-full" />

            <motion.div
              animate={{ y: [0, 32, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute left-0 right-0 top-0 h-0.5 bg-indigo-400 shadow-[0_0_8px_#818cf8]"
            />
          </div>

          <div className="flex-1">
            <div className="h-2 w-24 bg-white/10 rounded-full mb-2" />
            <div className="h-1.5 w-full bg-white/5 rounded-full mb-2" />
            <div className="h-1.5 w-4/5 bg-white/5 rounded-full" />
          </div>
        </div>

        <div className="absolute right-4 bottom-4 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold">
          AI tailored
        </div>
      </div>
    ),
  },
  {
    number: '04',
    title: 'Track Your Applications',
    description:
      'Keep every application organized in one place and stay on top of your job search from application to outcome.',
    Visual: () => (
      <div className="w-full h-32 rounded-xl bg-[#0a0a0f] border border-white/10 p-4 relative overflow-hidden">
        <div className="grid grid-cols-3 gap-2 h-full">
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
            <div className="h-1.5 w-8 bg-indigo-400/40 rounded-full mb-3" />

            <div className="space-y-2">
              <div className="h-6 rounded-md bg-white/[0.04] border border-white/5" />
              <div className="h-6 rounded-md bg-white/[0.04] border border-white/5" />
            </div>
          </div>

          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
            <div className="h-1.5 w-8 bg-violet-400/40 rounded-full mb-3" />

            <div className="space-y-2">
              <div className="h-6 rounded-md bg-white/[0.04] border border-white/5" />
            </div>
          </div>

          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
            <div className="h-1.5 w-8 bg-emerald-400/40 rounded-full mb-3" />

            <div className="space-y-2">
              <div className="h-6 rounded-md bg-white/[0.04] border border-white/5" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 right-3 h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-400"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
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
            Four steps to a smarter job search
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            Find the right opportunity, improve your application, and keep
            everything organized in one place.
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="hidden lg:block absolute top-[68px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{
                  once: true,
                  margin: '-50px',
                }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.08,
                }}
                whileHover={{
                  y: -5,
                }}
                className="group relative z-10"
              >
                {/* Subtle card glow */}
                <div className="absolute inset-0 rounded-2xl bg-indigo-500/0 group-hover:bg-indigo-500/[0.04] blur-xl transition-colors duration-300 pointer-events-none" />

                <div className="relative h-full bg-white/[0.03] border border-white/[0.08] group-hover:border-indigo-500/20 rounded-2xl p-6 overflow-hidden backdrop-blur-sm transition-all duration-300 group-hover:bg-white/[0.045]">
                  {/* Large background number */}
                  <div className="absolute top-3 right-4 text-7xl font-black text-white/[0.025] group-hover:text-indigo-400/[0.05] select-none pointer-events-none leading-none transition-colors duration-300">
                    {step.number}
                  </div>

                  {/* Step indicator */}
                  <div className="relative z-10 flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                      {step.number}
                    </div>

                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  {/* Visual */}
                  <div className="mb-6 relative z-10">
                    <step.Visual />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3">
                      {step.title}
                    </h3>

                    <p className="text-sm text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Bottom accent */}
                  <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/30 transition-all duration-300" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
