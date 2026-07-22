import { useRef, useEffect, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';

function AnimatedNumber({ value, isFloat = false, suffix = "", label }: { value: number, isFloat?: boolean, suffix?: string, label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [current, setCurrent] = useState("0");

  useEffect(() => {
    if (!inView) return;

    const controls = animate(0, value, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (v) => {
        if (isFloat) {
          setCurrent(v.toFixed(1));
        } else {
          setCurrent(Math.floor(v).toLocaleString());
        }
      }
    });
    return () => controls.stop();
  }, [inView, value, isFloat]);

  return (
    <div className="flex flex-col items-center text-center">
      <div ref={ref} className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
        {current}{suffix}
      </div>
      <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

const testimonials = [
  {
    quote: "I went from 2% to 68% ATS score on my first try. Got 3 interview calls within a week.",
    author: "Sarah K.",
    role: "Software Engineer",
    company: "Google",
    color: "bg-blue-500",
    initials: "SK"
  },
  {
    quote: "Workivo saved me 10+ hours of resume tweaking. The tailored cover letters are genuinely impressive.",
    author: "Marcus T.",
    role: "Product Manager",
    company: "Coinbase",
    color: "bg-emerald-500",
    initials: "MT"
  },
  {
    quote: "I was skeptical AI could match my voice. It did. And I landed a job at a FAANG company.",
    author: "Priya S.",
    role: "Data Analyst",
    company: "Amazon",
    color: "bg-purple-500",
    initials: "PS"
  },
  {
    quote: "Applied to 12 jobs, got 8 responses. Workivo completely changed how I approach job hunting.",
    author: "Alex R.",
    role: "UX Designer",
    company: "Meta",
    color: "bg-rose-500",
    initials: "AR"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Stat Bar */}
        <div className="mb-24 py-10 border-y border-white/[0.06] bg-white/[0.01]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            <AnimatedNumber value={10000} suffix="+" label="Job Seekers Helped" />
            <AnimatedNumber value={94} suffix="%" label="Avg. ATS Score Improvement" />
            <AnimatedNumber value={3.2} isFloat={true} suffix="x" label="More Interview Callbacks" />
          </div>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6"
          >
            Testimonials
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Loved by job seekers
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
            >
              <div className="flex gap-1 mb-4 text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-slate-300 text-base leading-relaxed mb-8 flex-grow">
                {t.quote}
              </p>
              
              <div className="flex items-center gap-4 mt-auto">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${t.color}`}>
                  {t.initials}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">{t.author}</h4>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                  at {t.company}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}