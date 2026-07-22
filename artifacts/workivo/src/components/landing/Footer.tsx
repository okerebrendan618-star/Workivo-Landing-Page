import { Github, Twitter, Linkedin, ArrowRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0a0f] relative pt-16 pb-8">
      {/* Top Gradient Border */}
      <div className="absolute top-0 left-0 right-0 border-t border-transparent [border-image:linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent)_1]"></div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-white/10">
                W
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Workivo</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Land interviews faster with AI. The ultimate co-pilot for ambitious job seekers looking to beat the ATS and stand out.
            </p>
            
            {/* Newsletter Teaser */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-semibold text-white">Get resume tips weekly</h4>
              <div className="flex gap-2 max-w-sm">
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 flex-grow"
                />
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Subscribe
                </button>
              </div>
            </div>

          </div>

          {/* Links Cols */}
          <div>
            <h4 className="text-white font-semibold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#features" className="text-slate-400 hover:text-white text-sm transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-slate-400 hover:text-white text-sm transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="text-slate-400 hover:text-white text-sm transition-colors">Pricing</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2">Changelog <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">New</span></a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">About</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Blog</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Careers</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Linkedin size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Github size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-500 text-sm">
            © {currentYear} Workivo. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-500 hover:text-white text-sm transition-colors">Privacy</a>
            <a href="#" className="text-slate-500 hover:text-white text-sm transition-colors">Terms</a>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
              <span className="text-slate-400 text-xs font-medium">Status: Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}