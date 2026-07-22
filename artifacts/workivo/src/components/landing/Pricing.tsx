import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: '0',
      description: 'Perfect for casual job seekers.',
      features: [
        '3 resume optimizations/month',
        'Basic ATS scoring',
        'Basic cover letters',
        'PDF & DOCX export',
        'Community support',
      ],
      buttonText: 'Get Started Free',
      isPopular: false,
      isTeams: false,
    },
    {
      name: 'Pro',
      price: annual ? '15' : '19',
      description: 'For ambitious professionals.',
      features: [
        'Unlimited resume optimizations',
        'Advanced ATS scoring insights',
        'Tailored cover letters',
        'LinkedIn profile optimization',
        'Priority AI processing',
        '24/7 Email support'
      ],
      buttonText: 'Start Free Trial',
      isPopular: true,
      isTeams: false,
    },
    {
      name: 'Teams',
      price: annual ? '39' : '49',
      description: 'For career coaches & agencies.',
      features: [
        'Everything in Pro',
        'Up to 5 team seats',
        'Centralized client management',
        'Analytics dashboard',
        'Dedicated success manager',
      ],
      buttonText: 'Contact Sales',
      isPopular: false,
      isTeams: true,
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
            
            {/* Active Pill Background */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-600 rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                annual ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
              }`}
              style={{
                width: annual ? '130px' : '96px' // Approximate widths to fit content
              }}
            ></div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto mb-16">
          {plans.map((plan, index) => {
            const isPopular = plan.isPopular;
            
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

                <div className={`relative h-full flex flex-col ${
                  isPopular ? 'border-gradient p-[1px] rounded-[28px]' : ''
                }`}>
                  <div className={`flex-1 flex flex-col p-8 ${
                    isPopular 
                      ? 'bg-[#0f0f1a] rounded-[27px]' 
                      : plan.isTeams
                        ? 'bg-white/[0.04] border border-white/[0.12] rounded-[28px]'
                        : 'bg-white/[0.03] border border-white/[0.08] rounded-[28px]'
                  }`}>
                    
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider glow-indigo-sm flex items-center gap-1.5 whitespace-nowrap">
                        <Star size={12} fill="currentColor" /> Most Popular
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-5xl font-black text-white">${plan.price}</span>
                        <span className="text-slate-400 text-sm font-medium">/mo</span>
                      </div>
                      {isPopular ? (
                        <p className="text-slate-500 text-xs mb-4">14-day free trial · No credit card</p>
                      ) : plan.isTeams ? (
                        <p className="text-slate-500 text-xs mb-4">Custom pricing available</p>
                      ) : (
                        <p className="text-slate-500 text-xs mb-4 invisible">Spacer</p>
                      )}
                      <p className="text-slate-400 text-sm">{plan.description}</p>
                    </div>

                    <div className="flex-grow mb-8">
                      <ul className="space-y-4">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <Check 
                              size={18} 
                              className={`shrink-0 mt-0.5 ${
                                isPopular ? 'text-indigo-400' : 'text-slate-400/50'
                              }`} 
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
                          : plan.isTeams
                            ? 'bg-white/[0.04] border border-white/15 text-white hover:bg-white/8'
                            : 'bg-white/[0.04] border border-white/10 text-white hover:bg-white/8'
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

        {/* Social Proof Row */}
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