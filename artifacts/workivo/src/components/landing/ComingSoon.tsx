import { motion } from 'framer-motion';
import { Mail, Brain, Linkedin, BarChart3 } from 'lucide-react';

const upcoming = [
  {
    icon: Mail,
    title: 'AI Cover Letter Generator',
    description: 'One click. A compelling cover letter written specifically for the job and company — no templates, no filler.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Brain,
    title: 'AI Interview Preparation',
    description: 'Practice with AI-generated questions tailored to your role and get instant feedback on your answers.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Linkedin,
    title: 'LinkedIn Profile Optimisation',
    description: 'Rewrite your LinkedIn headline, summary, and experience sections to attract recruiters and pass LinkedIn\'s own algorithm.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: BarChart3,
    title: 'Advanced Career Insights',
    description: 'Understand market trends, salary benchmarks, and the skills most in-demand for your target roles — all in one dashboard.',
    gradient: 'from-cyan-500 to-indigo-500',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function ComingSoon() {
  return (
    <section className="py-24 md:py-32 relative">
      {/* Right-side glow */}
      <div className="absolute top-[30%] right-[8%] w-[350px] h-[350px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-widest uppercase mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Coming Soon
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            More power,{' '}
            <span className="text-gradient">on the way</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            We're building fast. These features are in development and will roll out to Pro users first.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto"
        >
          {upcoming.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative flex gap-5 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
            >
              {/* Subtle top-left gradient accent */}
              <div className={`absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-[0.06] rounded-full blur-2xl pointer-events-none`} />

              {/* Icon */}
              <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-70 flex items-center justify-center shadow-md`}>
                <feature.icon className="w-4 h-4 text-white" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-slate-300">{feature.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    Soon
                  </span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Waitlist nudge */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-slate-600 text-sm mt-12"
        >
          Pro members get early access to every new feature the moment it ships.
        </motion.p>
      </div>
    </section>
  );
}
