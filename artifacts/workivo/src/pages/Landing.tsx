import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import ComingSoon from '@/components/landing/ComingSoon';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import FooterCTA from '@/components/landing/FooterCTA';
import Footer from '@/components/landing/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-50 font-sans selection:bg-indigo-500/30">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ComingSoon />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FooterCTA />
      </main>
      <Footer />
    </div>
  );
}
