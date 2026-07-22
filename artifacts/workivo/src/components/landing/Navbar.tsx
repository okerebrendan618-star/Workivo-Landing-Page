import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features', badge: 'New' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        isScrolled
          ? 'bg-[#07070c]/80 backdrop-blur-xl border-white/[0.06] py-4 shadow-sm'
          : 'bg-transparent border-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 z-50 relative group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-[0_0_18px_rgba(99,102,241,0.5)] border border-white/10 group-hover:scale-105 transition-transform duration-300">
            W
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-slate-200 transition-colors">
            Workivo
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          <div className="flex items-center gap-8 text-sm font-medium text-slate-300">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="relative group py-2 flex items-center gap-2 text-slate-300 hover:text-white transition-colors duration-200"
              >
                <span>{link.name}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {link.badge}
                  </span>
                )}
                <span className="absolute left-0 bottom-0 w-0 h-px bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <a
              href="#"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Log in
            </a>
            <a
              href="#"
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all transform hover:-translate-y-0.5 duration-200"
            >
              Start Free
            </a>
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-slate-300 hover:text-white z-50 relative p-2 rounded-lg bg-white/5 border border-white/10"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile Menu */}
        <div
          className={`fixed inset-0 bg-[#07070c]/95 backdrop-blur-2xl z-40 flex flex-col justify-center px-8 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } md:hidden`}
        >
          <div className="flex flex-col gap-6 text-2xl font-bold text-slate-300">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                className="hover:text-white transition-colors flex items-center gap-3 opacity-0 animate-[slideIn_0.5s_forwards]"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
                {link.badge && (
                  <span className="px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {link.badge}
                  </span>
                )}
              </a>
            ))}
            <div className="h-px w-full bg-white/10 my-4 opacity-0 animate-[slideIn_0.5s_forwards]" style={{ animationDelay: '0.4s' }}></div>
            <a 
              href="#" 
              className="text-xl hover:text-white opacity-0 animate-[slideIn_0.5s_forwards]" 
              style={{ animationDelay: '0.5s' }}
            >
              Log in
            </a>
            <a
              href="#"
              className="mt-4 px-6 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-lg font-semibold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] text-center w-full block opacity-0 animate-[slideIn_0.5s_forwards]"
              style={{ animationDelay: '0.6s' }}
            >
              Start Free
            </a>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}} />
    </nav>
  );
}