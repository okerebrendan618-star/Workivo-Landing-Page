import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Users } from 'lucide-react';

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      monthlyPrice: '0',
      annualPrice: '0',
      description: 'Perfect for casual job seekers.',
      features: [
        '3 ATS resume scans / month',
        '3 resume tailors / month',
        'Basic job application tracker',
        'PDF export',
        'Community support',
      ],
      buttonText: 'Get Started Free',
      isPopular: false,
    },
    {
      name: 'Pro',
      monthlyPrice: '10',
      annualPrice: '8',
      description: 'For serious job seekers who want results.',
      features: [
        'Unlimited ATS resume scans',
        'Unlimited resume tailoring',
        'Full job application tracker',
        'Priority AI processing',
        'Early access to new features',
        '24/7 email support',
      ],
      buttonText: 'Start Free Trial',
      isPopular: true,
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6"
          >
            Pricing
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Simple, honest pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400"
          >
            Start free. Upgrade when you're ready.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mb-16"
        >
          <div className="relative flex items-center p-1 bg-white/[0.04] border border-white/10 rounded-full">
            <button
              onClick={() => setAnnual(false)}
              className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-full transition-colors ${
                !annual ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 ${
                annual ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Save 20%
              </span>
            </button>

            {/* Active Pill */}
            <div
              className={`absolute top-1 bottom-1 bg-indigo-600 rounded-full shadow-md transition-all duration-300 ease-in-out`}
              style={{
                width: annual ? '130px' : '96px',
                transform: annual ? 'translateX(calc(100% - 34px))' : 'translateX(0)',
              }}
            />
          </div>
        </motion.div>

        {/* Plans Grid — 2 cards, centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-3xl mx-auto mb-12">
          {plans.map((plan, index) => {
            const isPopular = plan.isPopular;
            const price = annual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative h-full flex flex-col ${isPopular ? 'z-10' : 'z-0'}`}
              >
                {/* Glow behind popular card */}
                {isPopular && (
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-[28px] -z-10" />
                )}

                <div className={`relative h-full flex flex-col ${isPopular ? 'border-gradient p-[1px] rounded-[28px]' : ''}`}>
                  <div className={`flex-1 flex flex-col p-8 ${
                    isPopular
                      ? 'bg-[#0f0f1a] rounded-[27px]'
                      : 'bg-white/[0.03] border border-white/[0.08] rounded-[28px]'
                  }`}>

                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                        <Star size={12} fill="currentColor" /> Most Popular
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-5xl font-black text-white">${price}</span>
                        {plan.monthlyPrice !== '0' && (
                          <span className="text-slate-400 text-sm font-medium">/mo</span>
                        )}
                      </div>
                      {isPopular ? (
                        <p className="text-slate-500 text-xs mb-4">14-day free trial · No credit card</p>
                      ) : (
                        <p className="text-slate-500 text-xs mb-4 invisible">–</p>
                      )}
                      <p className="text-slate-400 text-sm">{plan.description}</p>
                    </div>

                    <div className="flex-grow mb-8">
                      <ul className="space-y-4">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <Check
                              size={18}
                              className={`shrink-0 mt-0.5 ${isPopular ? 'text-indigo-400' : 'text-slate-500'}`}
                            />
                            <span className={isPopular ? 'text-slate-200' : 'text-slate-400'}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      className={`w-full py-4 rounded-full font-semibold transition-all duration-200 mt-auto ${
                        isPopular
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:brightness-110 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]'
                          : 'bg-white/[0.04] border border-white/10 text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      {plan.buttonText}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Team Plans Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mb-16"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-slate-400">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Users size={15} className="text-violet-400" />
            </div>
            <span>
              <span className="text-white font-medium">Team plans</span>
              {' '}for career coaches &amp; agencies —{' '}
              <span className="text-violet-400 font-medium">coming soon</span>
            </span>
          </div>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={16} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
          <p className="text-slate-500 text-sm">
            Rated 4.9/5 from 2,300+ reviews on Product Hunt
          </p>
        </motion.div>
      </div>
    </section>
  );
}
