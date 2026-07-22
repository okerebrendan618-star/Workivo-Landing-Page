import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus } from 'lucide-react';

const faqs = [
  {
    question: "Is Workivo free to use?",
    answer: "Yes, our Free plan includes 3 resume optimizations per month. No credit card required to start."
  },
  {
    question: "How does the ATS scoring work?",
    answer: "We analyze your resume against the job description using the same criteria ATS systems use: keyword matching, formatting, section structure, and relevance scoring."
  },
  {
    question: "Will my resume sound like me?",
    answer: "Yes. Our AI is trained to preserve your voice and experience while improving ATS compatibility and relevance."
  },
  {
    question: "What file formats are supported?",
    answer: "We support PDF, DOCX, and plain text. Your optimized resume can be downloaded in PDF or DOCX format perfectly formatted."
  },
  {
    question: "How long does optimization take?",
    answer: "Under 10 seconds. Seriously."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. Your data is encrypted with 256-bit AES encryption, never sold to third parties, and you can delete your account at any time."
  }
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 md:py-32 relative">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6"
          >
            FAQ
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white"
          >
            Common questions
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-white/[0.07] rounded-2xl bg-white/[0.02] px-6 data-[state=open]:bg-white/[0.04] data-[state=open]:border-indigo-500/25 transition-colors border-b-0"
              >
                <AccordionTrigger className="text-left text-white font-medium hover:no-underline py-5 text-base [&[data-state=open]>svg]:rotate-45 [&>svg]:hidden flex justify-between">
                  {faq.question}
                  <Plus className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ml-4 block!" />
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 text-sm leading-7 pb-5 pt-0">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}