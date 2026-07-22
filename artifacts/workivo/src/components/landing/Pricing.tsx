import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';

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
    ],
    buttonText: 'Get Started Free',
    isPopular: false,
  },
  {
    name: 'Pro',
    price: '19',
    description: 'For ambitious professionals.',
    features: [
      'Unlimited resume optimizations',
      'Advanced ATS scoring insights',
      'Tailored cover letters',
      'LinkedIn profile optimization',
      'Priority AI processing',
    ],
    buttonText: 'Start Free Trial',
    isPopular: true,
  },
  {
    name: 'Teams',
    price: '49',
    description: 'For career coaches & agencies.',
    features: [
      'Everything in Pro',
      'Up to 5 team seats',
      'Centralized client management',
      'Analytics dashboard',
      'Priority support',
    ],
    buttonText: 'Contact Sales',
    isPopular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4"
          >
            Pricing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl flex flex-col h-full bg-[#111118] transition-transform duration-300 hover:-translate-y-2 ${
                plan.isPopular
                  ? 'border border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.15)] scale-100 md:scale-105 z-10'
                  : 'border border-white/10 scale-100'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                  <Star size={12} fill="currentColor" /> Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-slate-400">/mo</span>
                </div>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </div>

              <div className="flex-grow">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                      <Check size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full py-3.5 rounded-full font-semibold transition-all duration-200 ${
                  plan.isPopular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]'
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                {plan.buttonText}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
