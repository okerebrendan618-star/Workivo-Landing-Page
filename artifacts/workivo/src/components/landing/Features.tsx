import { motion } from 'framer-motion';
import { Target, Sparkles, LayoutList, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'AI ATS Resume Scanner',
    description: 'Paste a job description and instantly see your ATS compatibility score. Get clear, actionable suggestions to fix gaps before you apply.',
    gradient: 'from-indigo-500 to-violet-500',
    bullets: ['ATS compatibility score', 'Keyword gap analysis', 'Improvement suggestions'],
  },
  {
    icon: Sparkles,
    title: 'AI Resume Tailor',
    description: 'Automatically rewrites and customises your resume to match any job description — improving keyword relevance so your application rises to the top.',
    gradient: 'from-violet-500 to-purple-500',
    bullets: ['Job-specific customisation', 'Keyword matching', 'Relevance optimisation'],
  },
  {
    icon: LayoutList,
    title: 'Job Application Tracker',
    description: 'Keep every application organised in one place. Track which jobs you\'ve applied to, where they stand, and what comes next.',
    gradient: 'from-cyan-500 to-indigo-500',
    bullets: ['Application status tracking', 'Progress overview', 'Organised pipeline'],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
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
      {/* Glow */}
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6"
          >
            What's Available Now
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Three tools. Real results.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            Everything you need to get interviews — built, shipped, and ready to use today.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
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
              <h3 className="text-lg font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed flex-grow mb-6">
                {feature.description}
              </p>

              {/* Bullet points */}
              <ul className="space-y-2 mb-6">
                {feature.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Learn more <ArrowRight size={14} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
