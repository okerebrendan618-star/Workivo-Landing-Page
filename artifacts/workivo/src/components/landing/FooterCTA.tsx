import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Sparkles,
  Layers3,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function CountUp({
  value,
  duration = 1.4,
}: {
  value: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, {
    once: true,
    margin: '-80px',
  });

  const motionValue = useMotionValue(0);

  const spring = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
  });

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    motionValue.set(value);

    const unsubscribe = spring.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });

    return () => unsubscribe();
  }, [isInView, value, motionValue, spring]);

  return <span ref={ref}>{displayValue}</span>;
}

const stats = [
  {
    value: 4,
    label: 'AI-powered tools',
    icon: Sparkles,
  },
  {
    value: 1,
    label: 'unified workspace',
    icon: Layers3,
  },
  {
    value: 0,
    label: 'guesswork',
    icon: Zap,
  },
];

export default function FooterCTA() {
  return (
    <section className="py-32 md:py-40 relative overflow-hidden flex flex-col items-center justify-center">

      {/* =========================================================
          BACKGROUND
          Same dark Workivo background — intentionally unchanged
      ========================================================== */}

      <div className="absolute inset-0 bg-[#07070c] -z-20" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(99,102,241,0.12),rgba(168,85,247,0.08),transparent)] -z-10 pointer-events-none" />

      {/* Ambient center glow */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.35, 0.5, 0.35],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-indigo-600/[0.07] blur-[120px] pointer-events-none"
      />

      {/* Top Gradient Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="max-w-5xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">

        {/* =========================================================
            EYEBROW
        ========================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-8"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
          </span>

          Your next opportunity starts here
        </motion.div>

        {/* =========================================================
            MAIN HEADLINE
        ========================================================== */}

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.08,
            duration: 0.5,
          }}
          className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-[1.05]"
        >
          Stop guessing.
          <br />

          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            Start applying smarter.
          </span>
        </motion.h2>

        {/* =========================================================
            SUPPORTING COPY
        ========================================================== */}

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.16,
            duration: 0.5,
          }}
          className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Find stronger opportunities, build better applications, and
          keep your entire job search organised with Workivo.
        </motion.p>

        {/* =========================================================
            PRODUCT STATS
            Real product facts — no fabricated user numbers
        ========================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.22,
            duration: 0.5,
          }}
          className="w-full max-w-2xl mb-10"
        >
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm overflow-hidden">

            {/* Subtle top highlight */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">

              {stats.map((stat, index) => {
                const Icon = stat.icon;

                return (
                  <motion.div
                    key={stat.label}
                    whileHover={{
                      backgroundColor: 'rgba(255,255,255,0.025)',
                    }}
                    className="relative px-4 py-5 md:px-6 md:py-6 transition-colors"
                  >
                    <div className="flex flex-col items-center">

                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-3">
                        <Icon className="w-3.5 h-3.5 text-indigo-400" />
                      </div>

                      <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        <CountUp value={stat.value} />
                        {stat.value === 0 && (
                          <span className="text-indigo-400">+</span>
                        )}
                      </div>

                      <div className="text-[10px] md:text-xs text-slate-500 mt-1 text-center">
                        {stat.label}
                      </div>

                    </div>

                    {/* Tiny active indicator */}
                    {index === 0 && (
                      <motion.div
                        animate={{
                          opacity: [0.25, 0.8, 0.25],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                        }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-px bg-indigo-500/50"
                      />
                    )}
                  </motion.div>
                );
              })}

            </div>
          </div>
        </motion.div>

        {/* =========================================================
            CTA
        ========================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.3,
            duration: 0.5,
          }}
          className="flex flex-col items-center w-full"
        >
          <motion.button
            whileHover={{
              scale: 1.025,
            }}
            whileTap={{
              scale: 0.98,
            }}
            className="group relative px-10 py-5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-lg font-bold shadow-[0_0_50px_rgba(99,102,241,0.32)] hover:shadow-[0_0_70px_rgba(99,102,241,0.48)] transition-shadow duration-300 w-full sm:w-auto overflow-hidden"
          >
            {/* Moving highlight */}
            <motion.span
              animate={{
                x: ['-120%', '220%'],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 2,
                ease: 'easeInOut',
              }}
              className="absolute top-0 bottom-0 w-16 bg-white/10 skew-x-[-20deg] pointer-events-none"
            />

            <span className="relative z-10 flex items-center justify-center gap-2">
              Get Started Free

              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </motion.button>

          {/* Trust row */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-indigo-400/70" />
              Start free
            </span>

            <span className="w-1 h-1 rounded-full bg-slate-700" />

            <span className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-indigo-400/70" />
              No setup fees
            </span>

            <span className="w-1 h-1 rounded-full bg-slate-700" />

            <span className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-indigo-400/70" />
              Upgrade when ready
            </span>
          </div>
        </motion.div>
      </div>

      {/* =========================================================
          VERY SUBTLE BOTTOM PARTICLES / LIGHT
          Lightweight CSS-style elements only
      ========================================================== */}

      <motion.div
        animate={{
          y: [0, -10, 0],
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute left-[12%] bottom-[18%] w-1 h-1 rounded-full bg-indigo-400 pointer-events-none"
      />

      <motion.div
        animate={{
          y: [0, 8, 0],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        className="absolute right-[14%] bottom-[24%] w-1 h-1 rounded-full bg-violet-400 pointer-events-none"
      />

    </section>
  );
}
