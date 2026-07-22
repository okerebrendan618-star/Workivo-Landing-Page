import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Paste the Job Description',
    description: 'Drop in any job posting URL or paste the description directly.',
  },
  {
    number: '02',
    title: 'Upload Your Resume',
    description: 'We analyze your resume against the role in real time.',
  },
  {
    number: '03',
    title: 'Get Your Optimized Resume',
    description: 'Download your tailored resume and cover letter. Apply with confidence.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-900/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4"
          >
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6"
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
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative flex flex-col items-center text-center lg:items-start lg:text-left"
              >
                <div className="w-24 h-24 rounded-full bg-[#111118] border border-white/10 flex items-center justify-center text-3xl font-black text-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.1)] mb-8 relative z-10">
                  {step.number}
                  <div className="absolute inset-0 rounded-full border border-indigo-500/30 blur-[2px]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed max-w-sm">
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
