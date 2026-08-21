import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Briefcase,
  TrendingUp,
  Play,
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#05050a] pt-28 pb-20 text-white">

      {/* =========================================================
          CINEMATIC AI ATMOSPHERE
         ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Main purple atmosphere */}
        <div
          className="absolute left-1/2 top-[20%] h-[650px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-[150px]"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.32) 0%, rgba(124,58,237,0.18) 35%, transparent 70%)',
          }}
        />

        {/* Left blue glow */}
        <motion.div
          animate={{
            x: [-30, 20, -30],
            y: [-20, 30, -20],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -left-40 top-[20%] h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[130px]"
        />

        {/* Right violet glow */}
        <motion.div
          animate={{
            x: [20, -20, 20],
            y: [20, -30, 20],
            scale: [1.05, 0.95, 1.05],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -right-40 top-[15%] h-[550px] w-[550px] rounded-full bg-purple-600/15 blur-[140px]"
        />

        {/* Lower atmospheric glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.18, 0.28, 0.18],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute left-1/2 top-[70%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[140px]"
        />

        {/* Fine cinematic grid */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '70px 70px',
            maskImage:
              'radial-gradient(ellipse 70% 65% at 50% 35%, black 20%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 65% at 50% 35%, black 20%, transparent 100%)',
          }}
        />

        {/* =====================================================
            FLOATING AI PARTICLES
           ===================================================== */}

        {[
          { left: '12%', top: '25%', size: 4, delay: 0 },
          { left: '19%', top: '45%', size: 3, delay: 1.5 },
          { left: '27%', top: '18%', size: 5, delay: 0.8 },
          { left: '74%', top: '20%', size: 4, delay: 2 },
          { left: '83%', top: '35%', size: 3, delay: 1 },
          { left: '90%', top: '50%', size: 5, delay: 2.5 },
          { left: '67%', top: '55%', size: 3, delay: 0.5 },
          { left: '33%', top: '65%', size: 4, delay: 1.8 },
        ].map((particle, index) => (
          <motion.div
            key={index}
            animate={{
              y: [-12, 12, -12],
              opacity: [0.25, 0.8, 0.25],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 4 + particle.delay,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: particle.delay,
            }}
            className="absolute rounded-full bg-indigo-300 shadow-[0_0_18px_rgba(129,140,248,0.9)]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
            }}
          />
        ))}

        {/* =====================================================
            ORBITAL AI RINGS
           ===================================================== */}

        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute left-[72%] top-[17%] hidden h-[420px] w-[420px] rounded-full border border-indigo-400/10 md:block"
          style={{
            transform: 'rotateX(68deg) rotateZ(10deg)',
          }}
        />

        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: 55,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute left-[69%] top-[22%] hidden h-[330px] w-[330px] rounded-full border border-purple-400/10 md:block"
          style={{
            transform: 'rotateX(68deg) rotateZ(-18deg)',
          }}
        />

        {/* Orbital node */}
        <motion.div
          animate={{
            scale: [0.8, 1.15, 0.8],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute right-[17%] top-[28%] hidden h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_30px_10px_rgba(168,85,247,0.45)] md:block"
        />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(5,5,10,0.45)_75%,#05050a_100%)]" />

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#05050a] to-transparent" />
      </div>


      {/* =========================================================
          HERO CONTENT
         ========================================================= */}

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6">

        {/* Premium badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-8"
        >
          <div className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-indigo-400/20 bg-white/[0.045] px-4 py-2 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <Sparkles
              size={14}
              className="relative text-violet-300"
            />

            <span className="relative text-xs font-semibold tracking-wide text-slate-300 sm:text-sm">
              AI-POWERED CAREER COPILOT
            </span>

            <span className="relative hidden text-slate-600 sm:block">•</span>

            <span className="relative hidden text-xs text-slate-500 sm:block">
              Built for modern job seekers
            </span>
          </div>
        </motion.div>


        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-5xl text-center text-[48px] font-black leading-[0.94] tracking-[-0.055em] sm:text-[64px] md:text-[82px] lg:text-[92px]"
        >
          <span className="block text-white">
            Land More Interviews
          </span>

          <span className="relative mt-2 block">
            <span className="bg-gradient-to-r from-indigo-300 via-violet-400 to-purple-300 bg-clip-text text-transparent">
              With AI-Powered
            </span>

            {/* glow behind gradient text */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-violet-500/20 bg-clip-text text-transparent blur-2xl"
            >
              With AI-Powered
            </span>
          </span>

          <span className="mt-2 block text-white">
            Resumes.
          </span>
        </motion.h1>


        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-8 max-w-2xl text-center text-base leading-7 text-slate-400 sm:text-lg"
        >
          Workivo helps you build stronger resumes, tailor them to any
          opportunity, discover relevant jobs, and keep every application
          organized in one intelligent workspace.
        </motion.p>


        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
        >
          <button
            onClick={() => setLocation('/signup')}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-600 to-purple-600 px-7 py-4 text-sm font-bold text-white shadow-[0_0_45px_rgba(99,102,241,0.32)] transition-all duration-300 hover:scale-[1.025] hover:shadow-[0_0_65px_rgba(139,92,246,0.45)] sm:w-auto"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

            <span className="relative flex items-center justify-center gap-2">
              Get Started for Free
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </button>

          <button
            className="group w-full rounded-xl border border-white/10 bg-white/[0.035] px-7 py-4 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] sm:w-auto"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10">
                <Play
                  size={11}
                  className="ml-0.5 fill-current text-indigo-300"
                />
              </span>

              See How It Works
            </span>
          </button>
        </motion.div>


        {/* =====================================================
            PREMIUM TRUST MICRO-COPY
           ===================================================== */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-slate-500"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400/80" />
            No credit card required
          </div>

          <div className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />

          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-violet-400/80" />
            AI-assisted workflow
          </div>

          <div className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />

          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-indigo-400/80" />
            Resume · Jobs · Applications
          </div>
        </motion.div>


        {/* =========================================================
            HERO PRODUCT VISUAL
           ========================================================= */}

        <motion.div
          initial={{ opacity: 0, y: 70, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 1,
            delay: 0.45,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative mt-16 w-full max-w-6xl sm:mt-20"
        >

          {/* Outer glow */}
          <div className="absolute -inset-10 -z-10 rounded-[50px] bg-indigo-600/10 blur-[90px]" />

          {/* Perspective wrapper */}
          <div
            className="relative"
            style={{
              perspective: '1800px',
            }}
          >

            <motion.div
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative mx-auto"
              style={{
                transform: 'rotateX(2deg) rotateY(-2deg)',
              }}
            >

              {/* Glass dashboard */}
              <div className="relative overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#090a12]/90 shadow-[0_50px_140px_-30px_rgba(79,70,229,0.42)] backdrop-blur-2xl">

                {/* Dashboard top glow */}
                <div className="absolute left-1/4 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />

                {/* Top bar */}
                <div className="flex h-14 items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-5 sm:px-7">

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                      <Sparkles size={15} />
                    </div>

                    <span className="text-sm font-bold text-white">
                      AI Resume Co-pilot
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-md border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] text-slate-500 sm:block">
                      Workivo Workspace
                    </span>

                    <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                  </div>
                </div>


                {/* Dashboard */}
                <div className="grid min-h-[390px] grid-cols-1 md:grid-cols-[190px_1fr]">

                  {/* Sidebar */}
                  <div className="hidden border-r border-white/[0.06] bg-white/[0.018] p-4 md:block">

                    <div className="mb-7 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                      Workspace
                    </div>

                    {[
                      { icon: FileText, label: 'Resumes', active: true },
                      { icon: Sparkles, label: 'AI Writer' },
                      { icon: Briefcase, label: 'Job Matcher' },
                      { icon: TrendingUp, label: 'Applications' },
                    ].map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.label}
                          className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs ${
                            item.active
                              ? 'bg-indigo-500/10 text-indigo-300'
                              : 'text-slate-500'
                          }`}
                        >
                          <Icon size={14} />
                          {item.label}
                        </div>
                      );
                    })}
                  </div>


                  {/* Main dashboard */}
                  <div className="relative overflow-hidden p-5 sm:p-7">

                    {/* ambient dashboard glow */}
                    <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />

                    {/* dashboard heading */}
                    <div className="relative mb-6 flex items-end justify-between">

                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-400">
                          AI Career Workspace
                        </p>

                        <h3 className="text-lg font-bold text-white sm:text-xl">
                          Good things are moving.
                        </h3>
                      </div>

                      <div className="hidden rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] text-slate-500 sm:block">
                        Updated just now
                      </div>
                    </div>


                    {/* Stats */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                      {/* Tailored resumes */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl">
                        <div className="mb-5 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            Tailored Resumes
                          </span>

                          <div className="rounded-md bg-violet-500/10 p-2">
                            <Sparkles
                              size={13}
                              className="text-violet-300"
                            />
                          </div>
                        </div>

                        <div className="text-2xl font-black text-white">
                          12
                        </div>

                        <div className="mt-2 text-[10px] text-emerald-400">
                          Ready for applications
                        </div>
                      </div>


                      {/* Job matches */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl">
                        <div className="mb-5 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            Jobs Matched
                          </span>

                          <div className="rounded-md bg-indigo-500/10 p-2">
                            <Briefcase
                              size={13}
                              className="text-indigo-300"
                            />
                          </div>
                        </div>

                        <div className="text-2xl font-black text-white">
                          48
                        </div>

                        <div className="mt-2 text-[10px] text-indigo-300">
                          Relevant opportunities
                        </div>
                      </div>


                      {/* Applications */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl">
                        <div className="mb-5 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            Applications
                          </span>

                          <div className="rounded-md bg-emerald-500/10 p-2">
                            <TrendingUp
                              size={13}
                              className="text-emerald-300"
                            />
                          </div>
                        </div>

                        <div className="text-2xl font-black text-white">
                          23
                        </div>

                        <div className="mt-2 text-[10px] text-emerald-400">
                          Tracked applications
                        </div>
                      </div>
                    </div>


                    {/* Lower dashboard */}
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr]">

                      {/* Recent activity */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">

                        <div className="mb-5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">
                            Recent Activity
                          </span>

                          <span className="text-[10px] text-slate-600">
                            View all
                          </span>
                        </div>

                        {[
                          {
                            icon: Sparkles,
                            title: 'Resume tailored successfully',
                            sub: 'Frontend Developer',
                            color: 'text-violet-300',
                            bg: 'bg-violet-500/10',
                          },
                          {
                            icon: Briefcase,
                            title: 'New job match found',
                            sub: 'Product Engineer',
                            color: 'text-indigo-300',
                            bg: 'bg-indigo-500/10',
                          },
                          {
                            icon: CheckCircle2,
                            title: 'Application added',
                            sub: 'Software Engineer',
                            color: 'text-emerald-300',
                            bg: 'bg-emerald-500/10',
                          },
                        ].map((activity) => {
                          const Icon = activity.icon;

                          return (
                            <div
                              key={activity.title}
                              className="mb-3 flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.018] p-3 last:mb-0"
                            >
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.bg}`}
                              >
                                <Icon
                                  size={14}
                                  className={activity.color}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[10px] font-semibold text-slate-200">
                                  {activity.title}
                                </p>

                                <p className="mt-1 text-[9px] text-slate-600">
                                  {activity.sub}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>


                      {/* AI Tailor card */}
                      <div className="relative overflow-hidden rounded-xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.09] via-purple-500/[0.05] to-transparent p-5">

                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-[45px]" />

                        <div className="relative">

                          <div className="mb-5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">
                              AI Tailor
                            </span>

                            <Sparkles
                              size={15}
                              className="text-violet-300"
                            />
                          </div>

                          <div className="mb-4 rounded-lg border border-white/[0.07] bg-black/20 p-3">

                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[9px] text-slate-500">
                                Current Resume
                              </span>

                              <span className="text-[9px] text-emerald-400">
                                Ready
                              </span>
                            </div>

                            <div className="h-2 w-3/4 rounded-full bg-white/10" />
                            <div className="mt-2 h-2 w-1/2 rounded-full bg-white/5" />
                          </div>

                          <div className="mb-5 text-[10px] leading-5 text-slate-500">
                            Tailor your resume to the exact job you're applying
                            for.
                          </div>

                          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 text-[10px] font-bold text-white shadow-[0_0_25px_rgba(99,102,241,0.25)]">
                            <Sparkles size={12} />
                            Tailor Resume
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Cinematic scan */}
                <motion.div
                  animate={{
                    y: ['-100%', '500%'],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-32 bg-gradient-to-b from-transparent via-indigo-400/[0.035] to-transparent"
                />
              </div>
            </motion.div>
          </div>


          {/* Floating AI node underneath dashboard */}
          <motion.div
            animate={{
              y: [0, -8, 0],
              opacity: [0.65, 1, 0.65],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="mx-auto mt-[-5px] h-12 w-24 rounded-b-[40px] border-x border-b border-indigo-400/20 bg-indigo-500/10 blur-[0.2px] shadow-[0_20px_60px_rgba(99,102,241,0.25)]"
          />
        </motion.div>


        {/* Bottom fade separator */}
        <div className="mt-12 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      </div>
    </section>
  );
}
