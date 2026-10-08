import { motion } from 'framer-motion';
import {
  Target,
  Sparkles,
  LayoutList,
  Search,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  {
    icon: Search,
    number: '01',
    title: 'AI Job Matching',
    description:
      'Find opportunities that fit your experience and goals without wasting time on jobs that are a poor match.',
    gradient: 'from-indigo-500 to-violet-500',
    bullets: [
      'Relevant job opportunities',
      'AI-powered matching',
      'Less time spent searching',
    ],
    visual: 'matching',
  },
  {
    icon: Target,
    number: '02',
    title: 'AI ATS Resume Scanner',
    description:
      'Check how well your resume fits a role before you apply. See compatibility gaps and the changes that can strengthen your application.',
    gradient: 'from-indigo-500 to-violet-500',
    bullets: [
      'ATS compatibility score',
      'Keyword gap analysis',
      'Actionable improvements',
    ],
    visual: 'ats',
  },
  {
    icon: Sparkles,
    number: '03',
    title: 'AI Resume Tailor',
    description:
      'Turn your existing resume into a job-specific version built around the requirements, keywords, and context of the role.',
    gradient: 'from-violet-500 to-purple-500',
    bullets: [
      'Job-specific customisation',
      'Keyword optimisation',
      'Role-focused rewriting',
    ],
    visual: 'tailor',
  },
  {
    icon: LayoutList,
    number: '04',
    title: 'Job Application Tracker',
    description:
      'Keep your applications organised in one place and always know what you applied to, where it stands, and what comes next.',
    gradient: 'from-indigo-500 to-violet-500',
    bullets: [
      'Application status tracking',
      'Organised job pipeline',
      'One place for every application',
    ],
    visual: 'tracker',
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
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
    },
  },
};

function FeatureVisual({
  type,
}: {
  type: string;
}) {
  if (type === 'matching') {
    return (
      <div className="relative h-36 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          <div className="h-2 w-24 bg-white/10 rounded-full" />
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((item, index) => (
            <motion.div
              key={item}
              animate={{
                opacity: [0.35, 0.75, 0.35],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: index * 0.25,
              }}
              className="flex items-center gap-2"
            >
              <div className="h-6 w-6 rounded-md bg-white/[0.04] border border-white/5" />
              <div className="flex-1">
                <div className="h-1.5 w-3/4 bg-white/10 rounded-full mb-1.5" />
                <div className="h-1.5 w-1/2 bg-white/5 rounded-full" />
              </div>
              <div className="h-1.5 w-7 bg-indigo-400/30 rounded-full" />
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute right-4 bottom-4 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-semibold"
        >
          Matched
        </motion.div>
      </div>
    );
  }

  if (type === 'ats') {
    return (
      <div className="relative h-36 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-2 w-20 bg-white/10 rounded-full mb-2" />
            <div className="h-1.5 w-14 bg-white/5 rounded-full" />
          </div>

          <div className="relative h-12 w-12 rounded-full border-4 border-indigo-500/15 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-[-4px] rounded-full border-4 border-indigo-500 border-r-transparent border-b-transparent"
            />

            <span className="text-[11px] font-bold text-white">
              82%
            </span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: ['35%', '82%', '68%', '82%'] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
          />
        </div>

        <div className="flex gap-2 mt-4">
          <div className="h-1.5 w-12 bg-indigo-400/30 rounded-full" />
          <div className="h-1.5 w-16 bg-white/10 rounded-full" />
          <div className="h-1.5 w-8 bg-white/10 rounded-full" />
        </div>
      </div>
    );
  }

  if (type === 'tailor') {
    return (
      <div className="relative h-36 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-14 bg-white/[0.04] border border-white/10 rounded-lg flex flex-col items-center justify-center gap-1.5 relative overflow-hidden">
            <div className="w-5 h-1 bg-white/20 rounded-full" />
            <div className="w-7 h-1 bg-white/10 rounded-full" />
            <div className="w-5 h-1 bg-white/10 rounded-full" />

            <motion.div
              animate={{ y: [0, 38, 0] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute left-0 right-0 top-0 h-0.5 bg-indigo-400 shadow-[0_0_8px_#818cf8]"
            />
          </div>

          <ArrowRight className="w-4 h-4 text-indigo-400/60 shrink-0" />

          <div className="flex-1">
            <div className="h-2 w-24 bg-white/10 rounded-full mb-3" />

            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
              }}
              className="space-y-2"
            >
              <div className="h-1.5 w-full bg-indigo-400/25 rounded-full" />
              <div className="h-1.5 w-4/5 bg-white/10 rounded-full" />
              <div className="h-1.5 w-3/5 bg-white/10 rounded-full" />
            </motion.div>
          </div>
        </div>

        <div className="absolute right-4 bottom-4 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-semibold">
          AI tailored
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-36 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
      <div className="grid grid-cols-3 gap-2 h-full">
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
          <div className="h-1.5 w-9 bg-indigo-400/40 rounded-full mb-3" />

          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="space-y-2"
          >
            <div className="h-7 rounded-md bg-white/[0.04] border border-white/5" />
            <div className="h-7 rounded-md bg-white/[0.04] border border-white/5" />
          </motion.div>
        </div>

        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
          <div className="h-1.5 w-9 bg-violet-400/40 rounded-full mb-3" />

          <div className="space-y-2">
            <div className="h-7 rounded-md bg-white/[0.04] border border-white/5" />
          </div>
        </div>

        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
          <div className="h-1.5 w-9 bg-indigo-400/30 rounded-full mb-3" />

          <div className="space-y-2">
            <div className="h-7 rounded-md bg-white/[0.04] border border-white/5" />
          </div>
        </div>
      </div>

      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-3 right-3 h-5 w-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"
      >
        <Check className="w-2.5 h-2.5 text-indigo-400" />
      </motion.div>
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="py-24 md:py-32 relative overflow-hidden"
    >
      {/* Subtle ambient glow — same Workivo palette */}
      <div className="absolute top-[18%] left-[8%] w-[380px] h-[380px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0" />

      <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] bg-violet-600/[0.06] rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
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
            One workspace for your entire job search
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            Find better opportunities, understand your fit, tailor your
            application, and keep every job search organised.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.number}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="group relative"
            >
              {/* Soft hover glow */}
              <div className="absolute inset-0 rounded-[26px] bg-indigo-500/0 group-hover:bg-indigo-500/[0.035] blur-2xl transition-colors duration-300 pointer-events-none" />

              <div className="relative h-full p-7 md:p-8 rounded-[26px] bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] group-hover:border-indigo-500/20 group-hover:bg-white/[0.045] transition-all duration-300 overflow-hidden">
                {/* Background number */}
                <div className="absolute -top-3 -right-2 text-[110px] font-black leading-none text-white/[0.025] group-hover:text-indigo-400/[0.045] select-none pointer-events-none transition-colors duration-300">
                  {feature.number}
                </div>

                {/* Top row */}
                <div className="relative z-10 flex items-center justify-between mb-6">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-[0_8px_25px_rgba(99,102,241,0.18)]`}
                  >
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>

                  <span className="text-xs font-semibold tracking-widest text-slate-500">
                    {feature.number}
                  </span>
                </div>

                {/* Mini product visual */}
                <div className="relative z-10 mb-7">
                  <FeatureVisual type={feature.visual} />
                </div>

                {/* Copy */}
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {feature.description}
                  </p>

                  {/* Feature bullets */}
                  <ul className="space-y-2.5">
                    {feature.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-center gap-2.5 text-xs text-slate-400"
                      >
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/15 shrink-0">
                          <Check className="w-2.5 h-2.5 text-indigo-400" />
                        </span>

                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/30 transition-all duration-300" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
