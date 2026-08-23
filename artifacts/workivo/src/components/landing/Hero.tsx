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

/* =========================================================
   PERFORMANCE NOTE

   The futuristic background is built with SVG + CSS.
   No Three.js, WebGL, canvas particle engine, video, or
   external background images are used.

   This keeps the visual effect strong without making the
   landing page unnecessarily heavy on mobile devices.
========================================================= */

function NeuralGlobe() {
  const nodes = [
    [118, 250],
    [158, 188],
    [214, 145],
    [282, 175],
    [344, 122],
    [414, 170],
    [474, 218],
    [508, 292],
    [470, 360],
    [408, 402],
    [334, 374],
    [274, 430],
    [204, 386],
    [150, 334],
    [222, 280],
    [300, 235],
    [378, 270],
    [334, 325],
    [256, 338],
  ];

  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [13, 0],

    [0, 14],
    [1, 14],
    [3, 15],
    [4, 15],
    [5, 16],
    [6, 16],
    [7, 16],
    [8, 17],
    [9, 17],
    [10, 17],
    [11, 18],
    [12, 18],
    [13, 14],

    [14, 15],
    [15, 16],
    [16, 17],
    [17, 18],
    [18, 14],

    [14, 17],
    [15, 18],
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* =====================================================
          ATMOSPHERIC GLOW
      ===================================================== */}

      <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/[0.10] blur-[90px]" />

      <div className="absolute left-1/2 top-1/2 h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.09] blur-[70px]" />

      {/* =====================================================
          GLOBE
      ===================================================== */}

      <svg
        viewBox="0 0 600 600"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="globeCore">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
            <stop offset="42%" stopColor="#6366f1" stopOpacity="0.07" />
            <stop offset="72%" stopColor="#05050b" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="globeLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.18" />
          </linearGradient>

          <linearGradient id="nodeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softGlow">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Core */}
        <circle
          cx="300"
          cy="300"
          r="245"
          fill="url(#globeCore)"
        />

        {/* ===================================================
            OUTER ORBITAL RINGS
        =================================================== */}

        <ellipse
          cx="300"
          cy="300"
          rx="265"
          ry="92"
          stroke="#818cf8"
          strokeOpacity="0.28"
          strokeWidth="1"
        />

        <ellipse
          cx="300"
          cy="300"
          rx="265"
          ry="125"
          transform="rotate(38 300 300)"
          stroke="#a855f7"
          strokeOpacity="0.22"
          strokeWidth="1"
        />

        <ellipse
          cx="300"
          cy="300"
          rx="265"
          ry="125"
          transform="rotate(-38 300 300)"
          stroke="#6366f1"
          strokeOpacity="0.20"
          strokeWidth="1"
        />

        {/* ===================================================
            SPHERE OUTLINE
        =================================================== */}

        <circle
          cx="300"
          cy="300"
          r="210"
          stroke="url(#globeLine)"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />

        {/* Latitude */}
        <ellipse
          cx="300"
          cy="300"
          rx="210"
          ry="68"
          stroke="#818cf8"
          strokeOpacity="0.30"
          strokeWidth="1"
        />

        <ellipse
          cx="300"
          cy="300"
          rx="210"
          ry="125"
          stroke="#8b5cf6"
          strokeOpacity="0.18"
          strokeWidth="1"
        />

        <ellipse
          cx="300"
          cy="300"
          rx="210"
          ry="168"
          stroke="#6366f1"
          strokeOpacity="0.12"
          strokeWidth="1"
        />

        {/* Longitude */}
        <ellipse
          cx="300"
          cy="300"
          rx="75"
          ry="210"
          stroke="#a78bfa"
          strokeOpacity="0.25"
          strokeWidth="1"
        />

        <ellipse
          cx="300"
          cy="300"
          rx="140"
          ry="210"
          stroke="#818cf8"
          strokeOpacity="0.18"
          strokeWidth="1"
        />

        <ellipse
          cx="300"
          cy="300"
          rx="190"
          ry="210"
          stroke="#6366f1"
          strokeOpacity="0.10"
          strokeWidth="1"
        />

        {/* ===================================================
            NEURAL NETWORK
        =================================================== */}

        <g>
          {connections.map(([from, to], index) => {
            const [x1, y1] = nodes[from];
            const [x2, y2] = nodes[to];

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#globeLine)"
                strokeWidth="1"
                strokeOpacity="0.45"
              />
            );
          })}
        </g>

        {/* Secondary network lines */}
        <path
          d="M125 252 L220 280 L334 325 L474 218"
          stroke="#22d3ee"
          strokeOpacity="0.16"
          strokeWidth="1"
        />

        <path
          d="M158 188 L256 338 L408 402"
          stroke="#a855f7"
          strokeOpacity="0.14"
          strokeWidth="1"
        />

        <path
          d="M214 145 L378 270 L274 430"
          stroke="#6366f1"
          strokeOpacity="0.16"
          strokeWidth="1"
        />

        {/* ===================================================
            NETWORK NODES
        =================================================== */}

        {nodes.map(([cx, cy], index) => (
          <g key={index}>
            <circle
              cx={cx}
              cy={cy}
              r="10"
              fill="#8b5cf6"
              opacity="0.10"
              filter="url(#softGlow)"
            />

            <circle
              cx={cx}
              cy={cy}
              r={index % 4 === 0 ? 4.5 : 3}
              fill="url(#nodeGradient)"
              filter="url(#glow)"
              opacity="0.95"
            />

            <circle
              cx={cx}
              cy={cy}
              r="8"
              stroke="#8b5cf6"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* ===================================================
            SMALL PARTICLES
        =================================================== */}

        {[
          [90, 155],
          [135, 105],
          [190, 82],
          [284, 75],
          [382, 88],
          [466, 120],
          [526, 175],
          [545, 350],
          [480, 445],
          [390, 490],
          [300, 520],
          [185, 475],
          [92, 390],
          [72, 295],
        ].map(([cx, cy], index) => (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r={index % 3 === 0 ? 2.5 : 1.6}
            fill={index % 2 === 0 ? '#a78bfa' : '#22d3ee'}
            opacity={index % 3 === 0 ? 0.75 : 0.45}
          />
        ))}
      </svg>

      {/* =====================================================
          ROTATING LIGHT ORBIT
      ===================================================== */}

      <div className="absolute inset-[8%] animate-workivo-orbit">
        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_18px_6px_rgba(139,92,246,0.45)]" />
      </div>

      {/* Inner holographic sphere */}
      <div className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/[0.16] bg-violet-500/[0.015] shadow-[inset_0_0_80px_rgba(99,102,241,0.08),0_0_80px_rgba(99,102,241,0.08)]" />

      {/* =====================================================
          HOLOGRAPHIC FLOOR
      ===================================================== */}

      <div className="absolute bottom-[-8%] left-1/2 h-[220px] w-[760px] -translate-x-1/2">
        <div className="absolute inset-x-0 bottom-0 h-[170px] rounded-[50%] bg-indigo-500/[0.10] blur-[45px]" />

        <div className="absolute bottom-12 left-1/2 h-24 w-[560px] -translate-x-1/2 rounded-[50%] border border-indigo-400/[0.18]" />

        <div className="absolute bottom-16 left-1/2 h-20 w-[430px] -translate-x-1/2 rounded-[50%] border border-violet-400/[0.22]" />

        <div className="absolute bottom-20 left-1/2 h-14 w-[300px] -translate-x-1/2 rounded-[50%] border border-cyan-400/[0.18]" />

        <div className="absolute bottom-24 left-1/2 h-8 w-[190px] -translate-x-1/2 rounded-[50%] bg-violet-400/[0.15] blur-md" />

        {/* Holographic W */}
        <div className="absolute bottom-24 left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-violet-300/[0.25] bg-violet-400/[0.035] shadow-[0_0_50px_rgba(139,92,246,0.18)]">
          <span className="text-5xl font-black text-violet-200/80 drop-shadow-[0_0_15px_rgba(139,92,246,0.8)]">
            W
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#05050b] pt-24 pb-8 text-white sm:pt-28 lg:pt-24">
      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Main ambient lights */}
        <div className="absolute left-[-15%] top-[5%] h-[500px] w-[500px] rounded-full bg-indigo-600/[0.09] blur-[110px]" />

        <div className="absolute right-[-10%] top-[12%] h-[650px] w-[650px] rounded-full bg-violet-600/[0.10] blur-[130px]" />

        {/* Tiny background stars */}
        <div
          className="absolute inset-0 opacity-[0.24]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(167,139,250,0.7) 1px, transparent 1px)',
            backgroundSize: '58px 58px',
            maskImage:
              'radial-gradient(ellipse 85% 75% at 60% 42%, black 15%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 85% 75% at 60% 42%, black 15%, transparent 80%)',
          }}
        />

        {/* =====================================================
            GLOBE — DESKTOP + MOBILE
        ===================================================== */}

        <div
          className="
            absolute
            right-[-24%]
            top-[7%]
            h-[520px]
            w-[520px]
            opacity-80
            sm:right-[-18%]
            sm:top-[5%]
            sm:h-[600px]
            sm:w-[600px]
            lg:right-[-7%]
            lg:top-[4%]
            lg:h-[720px]
            lg:w-[720px]
            xl:h-[780px]
            xl:w-[780px]
          "
        >
          <NeuralGlobe />
        </div>

        {/* Mobile atmospheric glow */}
        <div className="absolute left-1/2 top-[27%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-indigo-600/[0.06] blur-[90px] sm:hidden" />
      </div>

      {/* =========================================================
          HERO CONTENT
      ========================================================= */}

      <div className="relative z-10 mx-auto flex w-full max-w-[1450px] flex-col px-5 sm:px-8 lg:min-h-[760px] lg:flex-row lg:items-center lg:px-10">
        {/* =====================================================
            LEFT
        ===================================================== */}

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
            className="
              max-w-[720px]
              text-[48px]
              font-black
              leading-[0.98]
              tracking-[-0.045em]
              text-white
              sm:text-[62px]
              md:text-[72px]
              lg:text-[76px]
              xl:text-[82px]
            "
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
            job, find the right opportunities, and track your applications —
            all in one powerful platform.
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
              className="
                group
                inline-flex
                h-14
                items-center
                justify-center
                gap-3
                rounded-xl
                bg-gradient-to-r
                from-indigo-500
                via-violet-500
                to-purple-600
                px-7
                text-sm
                font-semibold
                text-white
                shadow-[0_12px_45px_rgba(99,102,241,0.28)]
                transition-transform
                duration-200
                hover:scale-[1.02]
                hover:brightness-110
                active:scale-[0.99]
              "
            >
              Get Started for Free

              <ArrowRight
                size={18}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>

            <button
              className="
                group
                inline-flex
                h-14
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-white/10
                bg-white/[0.035]
                px-7
                text-sm
                font-semibold
                text-white
                backdrop-blur-sm
                transition-colors
                duration-200
                hover:bg-white/[0.07]
              "
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

        {/* =====================================================
            RIGHT PRODUCT VISUAL
        ===================================================== */}

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
            {/* Dashboard glow */}

            <div className="absolute -inset-8 -z-10 rounded-[40px] bg-indigo-500/[0.08] blur-xl" />

            {/* =================================================
                DASHBOARD
            ================================================= */}

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

                  {/* Metrics */}

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

                  {/* Activity + Match */}

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
                                {index + 1} hour
                                {index === 0 ? '' : 's'} ago
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
                          Frontend Engineer
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

                  {/* Optimization */}

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
                      <div
                        className="h-full w-[92%] rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating AI indicator */}

            <div className="absolute -bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-indigo-400/20 bg-[#0b0c18]/95 px-4 py-2 shadow-[0_10px_40px_rgba(99,102,241,0.18)] backdrop-blur-sm sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15">
                <Sparkles size={12} className="text-indigo-300" />
              </div>

              <span className="text-[9px] text-slate-300">
                AI continuously optimizing your career
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* =========================================================
          TRUST STRIP
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

      {/* =========================================================
          LIGHTWEIGHT ANIMATION
      ========================================================= */}

      <style>{`
        @keyframes workivo-orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-workivo-orbit {
          animation: workivo-orbit 42s linear infinite;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-workivo-orbit {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
