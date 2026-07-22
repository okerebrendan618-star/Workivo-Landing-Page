import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is Workivo free to use?",
    answer: "Yes, our Free plan includes 3 resume optimizations per month. No credit card required."
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
    answer: "We support PDF, DOCX, and plain text. Your optimized resume can be downloaded in PDF or DOCX format."
  },
  {
    question: "How long does optimization take?",
    answer: "Under 10 seconds. Seriously."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. Your data is encrypted, never sold, and you can delete it at any time."
  }
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 md:py-32 relative">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4"
          >
            FAQ
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white"
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
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-white/10 rounded-xl bg-[#111118] px-6 data-[state=open]:border-indigo-500/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-white font-medium hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 leading-relaxed pb-6">
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
