import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: "I went from 2% to 68% ATS score on my first try. Got 3 interview calls within a week.",
    author: "Sarah K.",
    role: "Software Engineer",
    color: "bg-blue-500"
  },
  {
    quote: "Workivo saved me 10+ hours of resume tweaking. The tailored cover letters are genuinely impressive.",
    author: "Marcus T.",
    role: "Product Manager",
    color: "bg-emerald-500"
  },
  {
    quote: "I was skeptical AI could match my voice. It did. And I landed a job at a FAANG company.",
    author: "Priya S.",
    role: "Data Analyst",
    color: "bg-purple-500"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 md:py-32 bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4"
          >
            Testimonials
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Loved by job seekers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            Real people. Real results.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-8 rounded-2xl bg-[#111118] border border-white/5 relative overflow-hidden group"
            >
              {/* Subtle gradient border effect on hover */}
              <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-indigo-500/30 transition-colors duration-500 pointer-events-none" />
              
              <div className="text-4xl text-indigo-500/20 font-serif absolute top-4 left-6">"</div>
              <p className="text-slate-300 text-lg leading-relaxed relative z-10 mb-8 pt-4">
                {t.quote}
              </p>
              
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${t.color}`}>
                  {t.author.charAt(0)}
                </div>
                <div>
                  <h4 className="text-white font-medium">{t.author}</h4>
                  <p className="text-slate-500 text-sm">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
