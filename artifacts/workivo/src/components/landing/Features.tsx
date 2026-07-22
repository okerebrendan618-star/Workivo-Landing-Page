import { motion } from 'framer-motion';
import { Sparkles, Target, FileText, Search, Copy, Zap, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI Resume Optimization',
    description: 'Instantly rewrites your resume to match any job description with precision.',
    gradient: 'from-indigo-500 to-violet-500'
  },
  {
    icon: Target,
    title: 'ATS Score Checker',
    description: 'Know your score before you apply. Beat the bots every time.',
    gradient: 'from-violet-500 to-purple-500'
  },
  {
    icon: FileText,
    title: 'Tailored Cover Letters',
    description: 'One click. A cover letter written for this exact job and company.',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Search,
    title: 'Job Description Analyzer',
    description: 'Extracts keywords, skills, and priorities from any job posting.',
    gradient: 'from-cyan-500 to-indigo-500'
  },
  {
    icon: Copy,
    title: 'Multiple Resume Versions',
    description: 'Save and manage tailored resumes for different roles and industries.',
    gradient: 'from-emerald-500 to-cyan-500'
  },
  {
    icon: Zap,
    title: 'Instant Results',
    description: 'No waiting. Your optimized resume is ready in seconds, not hours.',
    gradient: 'from-orange-500 to-rose-500'
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      {/* Subtle top left glow */}
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6"
          >
            Features
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Everything you need to get hired
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            Stop sending generic resumes. Start sending the right one.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-indigo-500/25 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1.5 flex flex-col h-full"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed flex-grow">
                {feature.description}
              </p>
              
              <div className="mt-6 flex items-center gap-2 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Learn more <ArrowRight size={14} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}