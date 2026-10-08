import { motion } from 'framer-motion';
import {
  Target,
  Sparkles,
  LayoutList,
  Search,
  Check,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  FileText,
  Briefcase,
  Clock3,
  CircleCheck,
  AlertTriangle,
} from 'lucide-react';

const features = [
  {
    icon: Search,
    number: '01',
    title: 'AI Job Matching',
    description:
      'Surface opportunities that align with your experience, skills, and direction — so you can spend less time sorting through jobs that are not worth applying to.',
    gradient: 'from-indigo-500 to-violet-500',
    bullets: [
      'Relevant opportunities',
      'AI-powered fit signals',
      'Less time spent searching',
    ],
    visual: 'matching',
  },
  {
    icon: Target,
    number: '02',
    title: 'AI ATS Resume Scanner',
    description:
      'See how your resume performs against a specific role and understand exactly where your application may be losing strength before you hit apply.',
    gradient: 'from-indigo-500 to-violet-500',
    bullets: [
      'ATS compatibility analysis',
      'Keyword and content gaps',
      'Actionable resume feedback',
    ],
    visual: 'ats',
  },
  {
    icon: Sparkles,
    number: '03',
    title: 'AI Resume Tailor',
    description:
      'Turn one general resume into a version shaped around the role you actually want — while keeping your experience and story intact.',
    gradient: 'from-violet-500 to-purple-500',
    bullets: [
      'Role-specific rewriting',
      'Relevant keyword optimisation',
      'Context-aware improvements',
    ],
    visual: 'tailor',
  },
  {
    icon: LayoutList,
    number: '04',
    title: 'Job Application Tracker',
    description:
      'Keep every application visible from the moment you apply to the moment you hear back, without relying on scattered notes or spreadsheets.',
    gradient: 'from-indigo-500 to-violet-500',
    bullets: [
      'Application pipeline',
      'Status organisation',
      'Centralised job history',
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
  /*
   * JOB MATCHING
   * Different from How It Works:
   * This is an "intelligence snapshot", not a workflow.
   */
  if (type === 'matching') {
    return (
      <div className="relative h-40 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                Match intelligence
              </span>
            </div>

            <div className="h-1.5 w-24 bg-white/10 rounded-full" />
          </div>

          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20"
          >
            <Zap className="w-2.5 h-2.5 text-indigo-400" />
            <span className="text-[8px] font-semibold text-indigo-300">
              AI
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-2">
            {[
              ['Senior Product Engineer', 'Strong fit'],
              ['Frontend Engineer', 'Good fit'],
              ['Software Engineer', 'Potential'],
            ].map(([role, fit], index) => (
              <motion.div
                key={role}
                animate={{
                  x: [0, index === 0 ? 2 : 0, 0],
                  opacity: [0.65, 1, 0.65],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  delay: index * 0.35,
                  ease: 'easeInOut',
                }}
                className="flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-md bg-white/[0.035] border border-white/[0.07] flex items-center justify-center">
                  <Briefcase className="w-3 h-3 text-slate-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="h-1.5 w-28 max-w-full bg-white/10 rounded-full mb-1.5" />
                  <div className="h-1 w-16 bg-white/5 rounded-full" />
                </div>

                <span
                  className={`text-[7px] ${
                    index === 0
                      ? 'text-indigo-300'
                      : 'text-slate-500'
                  }`}
                >
                  {fit}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="relative w-20 h-20 rounded-full border border-indigo-500/15 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-[-1px] rounded-full border border-transparent border-t-indigo-400/70 border-r-violet-400/50"
            />

            <div className="text-center">
              <div className="text-lg font-bold text-white">92%</div>
              <div className="text-[7px] text-slate-500 uppercase tracking-wider">
                fit
              </div>
            </div>
          </div>
        </div>

        <motion.div
          animate={{
            width: ['20%', '75%', '55%', '75%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-indigo-500 to-violet-500"
        />
      </div>
    );
  }

  /*
   * ATS SCANNER
   * Diagnostic/report visual rather than workflow.
   */
  if (type === 'ats') {
    return (
      <div className="relative h-40 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>

            <div>
              <div className="text-[9px] font-semibold text-slate-300">
                Resume analysis
              </div>
              <div className="h-1.5 w-16 bg-white/10 rounded-full mt-1.5" />
            </div>
          </div>

          <div className="text-[8px] text-slate-500">
            Scan complete
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg
              viewBox="0 0 64 64"
              className="absolute inset-0 w-full h-full -rotate-90"
            >
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="5"
              />

              <motion.circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="currentColor"
                className="text-indigo-500"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="163"
                animate={{
                  strokeDashoffset: [42, 28, 34, 28],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </svg>

            <div className="text-center">
              <div className="text-sm font-bold text-white">82</div>
              <div className="text-[6px] text-slate-500">SCORE</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-slate-500">
                Keywords
              </span>

              <span className="flex items-center gap-1 text-[8px] text-indigo-300">
                <CircleCheck className="w-2.5 h-2.5" />
                Strong
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[8px] text-slate-500">
                Formatting
              </span>

              <span className="flex items-center gap-1 text-[8px] text-indigo-300">
                <CircleCheck className="w-2.5 h-2.5" />
                Ready
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[8px] text-slate-500">
                Missing terms
              </span>

              <span className="flex items-center gap-1 text-[8px] text-violet-300">
                <AlertTriangle className="w-2.5 h-2.5" />
                Review
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5">
          {['Skills', 'Keywords', 'Format', 'Impact'].map(
            (item, index) => (
              <motion.div
                key={item}
                animate={{
                  opacity: [0.45, 1, 0.45],
                }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
                className={`px-2 py-1 rounded-md border text-[7px] ${
                  index === 2
                    ? 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                }`}
              >
                {item}
              </motion.div>
            )
          )}
        </div>
      </div>
    );
  }

  /*
   * RESUME TAILOR
   * Before/after transformation instead of workflow arrows.
   */
  if (type === 'tailor') {
    return (
      <div className="relative h-40 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest">
            Resume transformation
          </span>

          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="text-[8px] text-violet-300">
              AI enhanced
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-3 h-[105px]">
          {/* Before */}
          <div className="relative rounded-lg bg-white/[0.025] border border-white/[0.07] p-3 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <FileText className="w-3 h-3 text-slate-500" />
              <span className="text-[7px] text-slate-500">
                Current resume
              </span>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 w-4/5 bg-white/10 rounded-full" />
              <div className="h-1 w-full bg-white/5 rounded-full" />
              <div className="h-1 w-5/6 bg-white/5 rounded-full" />
              <div className="h-1 w-3/5 bg-white/5 rounded-full" />
            </div>

            <div className="absolute bottom-2 left-3 px-1.5 py-0.5 rounded bg-white/[0.04] text-[6px] text-slate-600">
              General
            </div>
          </div>

          {/* After */}
          <div className="relative rounded-lg bg-indigo-500/[0.035] border border-indigo-500/15 p-3 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span className="text-[7px] text-indigo-300">
                Tailored version
              </span>
            </div>

            <div className="space-y-2">
              <motion.div
                animate={{
                  width: ['55%', '80%', '68%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="h-1.5 bg-indigo-400/30 rounded-full"
              />

              <div className="h-1 w-full bg-white/10 rounded-full" />
              <div className="h-1 w-4/5 bg-white/10 rounded-full" />

              <motion.div
                animate={{
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="h-1 w-2/3 bg-violet-400/30 rounded-full"
              />
            </div>

            <div className="absolute bottom-2 left-3 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/15 text-[6px] text-violet-300">
              Role focused
            </div>
          </div>
        </div>

        {/* subtle center divider */}
        <div className="absolute left-1/2 top-[68px] bottom-4 w-px bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />
      </div>
    );
  }

  /*
   * JOB TRACKER
   * Pipeline/timeline visual rather than generic columns.
   */
  return (
    <div className="relative h-40 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <LayoutList className="w-4 h-4 text-indigo-400" />
          </div>

          <div>
            <div className="text-[9px] font-semibold text-slate-300">
              Application pipeline
            </div>
            <div className="text-[7px] text-slate-600 mt-1">
              Your search, organised
            </div>
          </div>
        </div>

        <Clock3 className="w-3.5 h-3.5 text-slate-600" />
      </div>

      <div className="relative pl-2">
        {/* Timeline */}
        <div className="absolute left-[17px] top-2 bottom-2 w-px bg-white/[0.08]" />

        {[
          {
            label: 'Application submitted',
            company: 'Product Engineer',
            active: true,
          },
          {
            label: 'Under review',
            company: 'Software Engineer',
            active: true,
          },
          {
            label: 'Interview stage',
            company: 'Frontend Engineer',
            active: false,
          },
        ].map((item, index) => (
          <motion.div
            key={item.company}
            animate={
              index === 1
                ? {
                    x: [0, 2, 0],
                  }
                : undefined
            }
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative flex items-center gap-3 mb-2.5 last:mb-0"
          >
            <div
              className={`relative z-10 w-3 h-3 rounded-full border-2 ${
                item.active
                  ? 'bg-indigo-500/30 border-indigo-400'
                  : 'bg-[#0a0a0f] border-white/10'
              }`}
            />

            <div className="flex-1 flex items-center justify-between rounded-md bg-white/[0.025] border border-white/[0.05] px-2.5 py-1.5">
              <div>
                <div className="text-[7px] text-slate-500">
                  {item.label}
                </div>
                <div className="text-[8px] text-slate-300 mt-0.5">
                  {item.company}
                </div>
              </div>

              {item.active && (
                <CircleCheck className="w-3 h-3 text-indigo-400/70" />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        animate={{
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
        }}
        className="absolute bottom-0 right-0 w-32 h-20 bg-indigo-600/10 blur-2xl pointer-events-none"
      />
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="py-24 md:py-32 relative overflow-hidden"
    >
      {/* Same Workivo ambient palette */}
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
            Everything you need to find stronger opportunities, improve
            your applications, and stay organised — all in one place.
          </motion.p>
        </div>

        {/* Product Feature Grid */}
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

                {/* Large atmospheric number */}
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

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                      Live tool
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_7px_rgba(129,140,248,0.7)]" />
                  </div>
                </div>

                {/* Product showcase */}
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

                  {/* Capabilities */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {feature.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-white/[0.025] border border-white/[0.05]"
                      >
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/15 shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-indigo-400" />
                        </span>

                        <span className="text-[10px] leading-relaxed text-slate-500">
                          {bullet}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom accent */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.35 }}
                  className="absolute bottom-0 left-8 right-8 origin-center h-px bg-gradient-to-r from-transparent via-indigo-500/35 to-transparent"
                />

                {/* Corner highlight */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.025] blur-3xl pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
