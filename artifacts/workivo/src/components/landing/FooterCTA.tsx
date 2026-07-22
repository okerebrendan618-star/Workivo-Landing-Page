import { motion } from 'framer-motion';

export default function FooterCTA() {
  return (
    <section className="py-32 relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Dramatic Background */}
      <div className="absolute inset-0 bg-[#07070c] -z-20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(99,102,241,0.12),rgba(168,85,247,0.08),transparent)] -z-10 pointer-events-none"></div>
      
      {/* Top Gradient Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-8"
        >
          Join 10,000+ professionals
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]"
        >
          Ready to land your next{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 block sm:inline">
            interview?
          </span>
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto"
        >
          Stop guessing. Start getting callbacks. Workivo is free to start.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center w-full"
        >
          <button className="px-10 py-5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-lg font-bold hover:opacity-90 transition-all shadow-[0_0_60px_rgba(99,102,241,0.4)] hover:shadow-[0_0_80px_rgba(99,102,241,0.6)] hover:scale-[1.02] transform duration-300 w-full sm:w-auto">
            Get Started Free
          </button>
          <p className="mt-4 text-sm text-slate-600">
            No credit card required · Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}