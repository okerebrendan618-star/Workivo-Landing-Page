import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#05050b] pt-24 pb-8 text-white sm:pt-28 lg:pt-24">
      {/* =========================================================
          CINEMATIC BACKGROUND
          Lightweight CSS/SVG instead of heavy background images.
         ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Deep atmospheric lights */}
        <div
          className="absolute left-[-10%] top-[8%] h-[420px] w-[420px] rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.08) 35%, transparent 70%)',
          }}
        />

        <div
          className="absolute right-[-8%] top-[18%] h-[520px] w-[520px] rounded-full opacity-45"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.20) 0%, rgba(79,70,229,0.08) 38%, transparent 72%)',
          }}
        />

        {/* Subtle star/particle field */}
        <div className="absolute inset-0 opacity-35">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(167,139,250,0.8) 1px, transparent 1px)',
              backgroundSize: '54px 54px',
              maskImage:
                'radial-gradient(ellipse 70% 70% at 65% 45%, black 15%, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 70% at 65% 45%, black 15%, transparent 75%)',
            }}
          />
        </div>

        {/* =====================================================
            MAIN FUTURISTIC AI GLOBE
           ===================================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute right-[-8%] top-[12%] hidden h-[620px] w-[620px] lg:block"
        >
          {/* Soft glow behind globe */}
          <div
            className="absolute inset-[14%] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(99,102,241,0.20), rgba(139,92,246,0.08) 42%, transparent 70%)',
            }}
          />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 55,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-[10%]"
          >
            <svg
              viewBox="0 0 600 600"
              className="h-full w-full"
              fill="none"
              aria-hidden="true"
            >
              {/* Outer orbital rings */}
              <ellipse
                cx="300"
                cy="300"
                rx="238"
                ry="88"
                stroke="rgba(129,140,248,0.24)"
                strokeWidth="1"
              />

              <ellipse
                cx="300"
                cy="300"
                rx="238"
                ry="150"
                transform="rotate(48 300 300)"
                stroke="rgba(168,85,247,0.22)"
                strokeWidth="1"
              />

              <ellipse
                cx="300"
                cy="300"
                rx="238"
                ry="150"
                transform="rotate(-48 300 300)"
                stroke="rgba(99,102,241,0.20)"
                strokeWidth="1"
              />

              {/* Globe longitude */}
              <ellipse
                cx="300"
                cy="300"
                rx="150"
                ry="238"
                stroke="rgba(129,140,248,0.25)"
                strokeWidth="1"
              />

              <ellipse
                cx="300"
                cy="300"
                rx="78"
                ry="238"
                stroke="rgba(168,85,247,0.20)"
                strokeWidth="1"
              />

              <ellipse
                cx="300"
                cy="300"
                rx="238"
                ry="78"
                stroke="rgba(129,140,248,0.20)"
                strokeWidth="1"
              />

              {/* Latitude */}
              <ellipse
                cx="300"
                cy="300"
                rx="238"
                ry="150"
                stroke="rgba(99,102,241,0.18)"
                strokeWidth="1"
              />

              <ellipse
                cx="300"
                cy="300"
                rx="238"
                ry="55"
                stroke="rgba(192,132,252,0.18)"
                strokeWidth="1"
              />

              {/* Network connections */}
              <path
                d="M105 270 L188 205 L270 238 L350 160 L460 220 L510 330 L420 390 L330 350 L250 430 L145 370 Z"
                stroke="rgba(129,140,248,0.25)"
                strokeWidth="1"
              />

              <path
                d="M188 205 L210 315 L330 350 L350 160"
                stroke="rgba(192,132,252,0.20)"
                strokeWidth="1"
              />

              <path
                d="M105 270 L210 315 L145 370"
                stroke="rgba(99,102,241,0.22)"
                strokeWidth="1"
              />

              {/* Network nodes */}
              {[
                [105, 270],
                [188, 205],
                [270, 238],
                [350, 160],
                [460, 220],
                [510, 330],
                [420, 390],
                [330, 350],
                [250, 430],
                [145, 370],
                [210, 315],
              ].map(([cx, cy], index) => (
                <g key={index}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5"
                    fill="#8b5cf6"
                    opacity="0.8"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r="11"
                    stroke="rgba(139,92,246,0.30)"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* Small energy points */}
              {[
                [155, 125],
                [420, 115],
                [520, 170],
                [80, 350],
                [485, 430],
                [300, 90],
                [300, 505],
              ].map(([cx, cy], index) => (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r="2.5"
                  fill="#c084fc"
                  opacity="0.75"
                />
              ))}
            </svg>
          </motion.div>

          {/* Inner globe */}
          <motion.div
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-[22%] rounded-full"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, rgba(167,139,250,0.16), rgba(79,70,229,0.07) 42%, rgba(5,5,11,0.15) 70%, transparent 72%)',
              border: '1px solid rgba(139,92,246,0.20)',
              boxShadow:
                'inset 0 0 50px rgba(99,102,241,0.10), 0 0 70px rgba(99,102,241,0.10)',
            }}
          />
        </motion.div>

        {/* Smaller floating AI node */}
        <motion.div
          animate={{
            y: [0, -14, 0],
            x: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute right-[42%] top-[42%] hidden h-20 w-20 rounded-full lg:block"
          style={{
            background:
              'radial-gradient(circle, rgba(129,140,248,0.25), rgba(99,102,241,0.06) 55%, transparent 72%)',
          }}
        >
          <div className="absolute inset-5 rounded-full border border-indigo-400/30" />
          <div className="absolute inset-7 rounded-full border border-violet-400/20" />
        </motion.div>

        {/* Floor light / futuristic platform */}
        <div className="absolute bottom-[-8%] left-[42%] hidden h-[280px] w-[700px] -translate-x-1/2 lg:block">
          <div
            className="absolute inset-x-0 bottom-0 h-[180px]"
            style={{
              background:
                'radial-gradient(ellipse, rgba(99,102,241,0.22), rgba(139,92,246,0.08) 38%, transparent 72%)',
            }}
          />

          <div className="absolute bottom-16 left-1/2 h-32 w-[500px] -translate-x-1/2 rounded-[50%] border border-indigo-400/15" />
          <div className="absolute bottom-20 left-1/2 h-24 w-[380px] -translate-x-1/2 rounded-[50%] border border-violet-400/20" />
          <div className="absolute bottom-24 left-1/2 h-16 w-[260px] -translate-x-1/2 rounded-[50%] border border-indigo-300/20" />

          <motion.div
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute bottom-28 left-1/2 h-3 w-40 -translate-x-1/2 rounded-full bg-indigo-400/30 blur-md"
          />
        </div>
      </div>

      {/* =========================================================
          HERO CONTENT
         ========================================================= */}

      <div className="relative z-10 mx-auto flex w-full max-w-[1450px] flex-col px-5 sm:px-8 lg:min-h-[760px] lg:flex-row lg:items-center lg:px-10">
        {/* LEFT CONTENT */}
        <div className="w-full max-w-[720px] pt-10 lg:w-[52%] lg:pt-0">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/[0.07] px-4 py-2 text-xs font-medium tracking-wide text-indigo-200 backdrop-blur-sm"
          >
            <Sparkles size={13} className="text-violet-400" />
            AI-POWERED CAREER COPILOT
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="max-w-[720px] text-[48px] font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-[62px] md:text-[72px] lg:text-[76px] xl:text-[82px]"
          >
            Land More Interviews
            <br />
            With{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              AI-Powered
            </span>
            <br />
            Resumes
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-7 max-w-[610px] text-base leading-7 text-slate-400 sm:text-lg"
          >
            Workivo helps you build ATS-friendly resumes, tailor them to any
            job, find the right opportunities, and track your applications
            —all in one powerful platform.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          >
            <button
              onClick={() => setLocation('/signup')}
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 px-7 text-sm font-semibold text-white shadow-[0_12px_45px_rgba(99,102,241,0.28)] transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.99]"
            >
              Get Started for Free
              <ArrowRight
                size={18}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>

            <button
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/[0.07]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Play size={12} className="fill-white" />
              </span>
              See How It Works
            </button>
          </motion.div>

          {/* Trust points */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-indigo-400" />
              ATS-friendly tools
            </div>

            <div className="flex items-center gap-2">
              <Zap size={15} className="text-violet-400" />
              AI-powered writing
            </div>

            <div className="flex items-center gap-2">
              <Check size={15} className="text-emerald-400" />
              Start for free
            </div>
          </motion.div>
        </div>

        {/* =========================================================
            RIGHT PRODUCT VISUAL
           ========================================================= */}

        <div className="relative mt-16 flex w-full items-center justify-center lg:mt-0 lg:w-[48%]">
          <motion.div
            initial={{ opacity: 0, y: 35, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{
              duration: 0.9,
              delay: 0.25,
              ease: 'easeOut',
            }}
            className="relative w-full max-w-[700px]"
          >
            {/* Outer glow */}
            <div className="absolute -inset-8 -z-10 rounded-[40px] bg-indigo-500/[0.08]" />

            {/* Dashboard */}
            <div className="overflow-hidden rounded-[22px] border border-indigo-300/15 bg-[#0b0c18]/95 shadow-[0_35px_100px_rgba(0,0,0,0.55),0_0_70px_rgba(99,102,241,0.12)]">
              {/* Top bar */}
              <div className="flex h-12 items-center border-b border-white/[0.06] bg-white/[0.025] px-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                </div>

                <div className="mx-auto text-[10px] font-medium tracking-wide text-slate-500">
                  WORKIVO • AI RESUME CO-PILOT
                </div>

                <div className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-slate-500">
                  + New Resume
                </div>
              </div>

              <div className="flex min-h-[410px]">
                {/* Sidebar */}
                <div className="hidden w-[150px] shrink-0 border-r border-white/[0.05] bg-[#090a14] p-4 sm:block">
                  <div className="mb-8 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black">
                      W
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      'Dashboard',
                      'Resumes',
                      'AI Writer',
                      'Job Matcher',
                      'Applications',
                      'Settings',
                    ].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-lg px-2.5 py-2 text-[9px] ${
                          index === 0
                            ? 'bg-indigo-500/15 text-indigo-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main dashboard */}
                <div className="min-w-0 flex-1 bg-[#0c0d18] p-4 sm:p-5">
                  <div className="mb-5">
                    <div className="text-sm font-semibold text-white sm:text-base">
                      AI Resume Co-pilot
                    </div>
                    <div className="mt-1 text-[9px] text-slate-500">
                      Your career command center
                    </div>
                  </div>

                  {/* Metric cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      {
                        title: 'AI Resume Score',
                        value: '92',
                        label: 'Excellent Match',
                        color: 'text-emerald-400',
                      },
                      {
                        title: 'Jobs Matched',
                        value: '48',
                        label: '+12 this week',
                        color: 'text-indigo-300',
                      },
                      {
                        title: 'Applications',
                        value: '23',
                        label: '+5 this week',
                        color: 'text-violet-300',
                      },
                    ].map((metric) => (
                      <div
                        key={metric.title}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4"
                      >
                        <div className="text-[8px] text-slate-500 sm:text-[9px]">
                          {metric.title}
                        </div>

                        <div className="mt-3 text-xl font-bold text-white sm:text-2xl">
                          {metric.value}
                        </div>

                        <div className={`mt-1 text-[8px] ${metric.color}`}>
                          {metric.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Activity + match */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                      <div className="mb-4 text-[10px] font-semibold text-white">
                        Recent Activity
                      </div>

                      <div className="space-y-3">
                        {[
                          'Resume tailored to Frontend Developer',
                          'Application tracker updated',
                          'New job match discovered',
                        ].map((text, index) => (
                          <div
                            key={text}
                            className="flex items-center gap-2.5"
                          >
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                index === 0
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : index === 1
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'bg-fuchsia-500/20 text-fuchsia-300'
                              }`}
                            >
                              <Zap size={10} />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-[8px] text-slate-300 sm:text-[9px]">
                                {text}
                              </div>
                              <div className="mt-0.5 text-[7px] text-slate-600">
                                {index + 1} hour{index === 0 ? '' : 's'} ago
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                      <div className="mb-4 text-[10px] font-semibold text-white">
                        Job Match
                      </div>

                      <div className="rounded-lg border border-indigo-400/10 bg-indigo-500/[0.045] p-3">
                        <div className="text-[10px] font-semibold text-white">
                          Senior Frontend Engineer
                        </div>

                        <div className="mt-1 text-[8px] text-slate-500">
                          Recommended match
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {['React', 'TypeScript', 'Next.js'].map((skill) => (
                            <span
                              key={skill}
                              className="rounded bg-white/[0.04] px-1.5 py-1 text-[7px] text-slate-400"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        <button className="mt-4 w-full rounded-lg bg-indigo-500/80 py-2 text-[8px] font-semibold text-white">
                          View Match
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Resume optimization */}
                  <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-[10px] font-semibold text-white">
                        Resume Optimization
                      </div>
                      <div className="text-[8px] text-emerald-400">
                        92% optimized
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '92%' }}
                        transition={{ duration: 1.2, delay: 0.8 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating AI indicator */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-indigo-400/20 bg-[#0b0c18]/95 px-4 py-2 shadow-[0_10px_40px_rgba(99,102,241,0.18)] backdrop-blur-sm sm:flex"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15">
                <Sparkles size={12} className="text-indigo-300" />
              </div>
              <span className="text-[9px] text-slate-300">
                AI continuously optimizing your career
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* =========================================================
          SOCIAL PROOF / TRUST STRIP
         ========================================================= */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        className="relative z-20 mx-auto mt-10 w-[calc(100%-32px)] max-w-[1370px] sm:mt-12 sm:w-[calc(100%-48px)] lg:mt-4"
      >
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:px-8">
          <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
            <div className="text-center lg:text-left">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Built for modern job seekers
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Everything you need to move from application to interview.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users size={15} className="text-indigo-400" />
                Resume tools
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Zap size={15} className="text-violet-400" />
                AI assistance
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={15} className="text-emerald-400" />
                ATS-focused
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05050b] to-transparent" />
    </section>
  );
}
