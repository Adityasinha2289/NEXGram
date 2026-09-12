import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { DEMO_ACCOUNTS } from '../constants/demoAccounts';
import heroImage from '../assets/hero_illustration.jpg';

export function Landing() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      navigate(
        currentUser.role === 'retailer' ? '/retailer/dashboard' : '/distributor/dashboard',
        { replace: true }
      );
    }
  }, [currentUser, navigate]);

  const handleDemo = async (role) => {
    const account = DEMO_ACCOUNTS[role];
    setPending(role);
    setError(null);
    try {
      await login(account.mobile, account.password);
      navigate(role === 'retailer' ? '/retailer/dashboard' : '/distributor/dashboard');
    } catch (err) {
      setError(err?.message || 'Demo login failed. Please try from the login page.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 text-brand-900 font-sans selection:bg-brand-300 selection:text-brand-900">
      {/* 01 — NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-brand-50/95 backdrop-blur-sm border-b border-brand-900/5 transition-all">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold tracking-tight text-brand-900">NEXGram</span>
            <span className="hidden sm:inline-block text-sm font-medium text-brand-500">Gaon ka Growth Partner</span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-brand-900 font-medium">
            <button onClick={() => document.getElementById('story').scrollIntoView({behavior: 'smooth'})} className="hover:text-brand-500 transition-colors cursor-pointer">Retailers</button>
            <button onClick={() => document.getElementById('story').scrollIntoView({behavior: 'smooth'})} className="hover:text-brand-500 transition-colors cursor-pointer">Distributors</button>
            <button onClick={() => document.getElementById('connection').scrollIntoView({behavior: 'smooth'})} className="hover:text-brand-500 transition-colors cursor-pointer">About</button>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => document.getElementById('story').scrollIntoView({behavior: 'smooth'})}
              className="inline-flex items-center font-medium text-brand-900 hover:text-brand-500 transition-colors group cursor-pointer"
            >
              Explore NEXGram <ArrowRight size={16} className="ml-1.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </nav>

      {/* 02 — HERO */}
      <section className="mx-auto max-w-[1240px] px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <div className="max-w-[480px]">
            <p className="text-sm font-semibold tracking-widest uppercase text-brand-500 mb-6">
              Gaon ka Business. Ab Aur Bada.
            </p>
            <h1 className="font-display text-6xl sm:text-7xl font-bold leading-[1.05] text-brand-900 tracking-tight mb-8">
              Apni Dukaan.<br/>
              Ab Aur Bada Socho.
            </h1>
            <p className="text-lg text-brand-900/80 leading-relaxed mb-10">
              NEXGram retailers aur distributors ko local demand, sahi products aur trusted suppliers ke saath jodta hai.
            </p>
            <div className="flex flex-col items-start gap-4">
              <button 
                onClick={() => document.getElementById('story').scrollIntoView({behavior: 'smooth'})}
                className="inline-flex items-center justify-center rounded-lg bg-brand-900 text-brand-50 px-7 py-3.5 font-medium transition-all hover:bg-brand-800 hover:-translate-y-0.5 cursor-pointer shadow-sm"
              >
                Explore NEXGram <ArrowRight size={18} className="ml-2" />
              </button>
              <p className="text-sm text-brand-500 font-medium">
                Retailer ho ya distributor — apne business se shuru karo.
              </p>
            </div>
          </div>
          <div className="w-full lg:ml-auto">
            <img 
              src={heroImage} 
              alt="Rural Indian kirana store and supply chain" 
              className="w-full h-auto object-cover rounded-lg shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* 03 — FUNDING OPPORTUNITY */}
      <section className="border-t border-brand-900/5">
        <div className="mx-auto max-w-[1240px] px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center mb-20 lg:mb-24">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-500 mb-5">
              Business Badhane Ka Mauka
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-900 leading-tight">
              Apna business<br className="hidden sm:block" /> shuru ya badhane ke liye.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16 md:gap-24 relative max-w-4xl mx-auto">
            {/* Desktop Divider */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-brand-900/10 -translate-x-1/2"></div>
            
            {/* Retailer Funding */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left pr-0 md:pr-12">
              <p className="font-semibold text-brand-900 uppercase tracking-widest text-sm mb-6">Retailers</p>
              
              <div className="flex flex-col gap-1 mb-8">
                <span className="font-display text-5xl lg:text-6xl font-bold text-brand-900 tracking-tight">₹10 LAKH</span>
                <span className="font-display text-2xl font-bold text-brand-900 tracking-widest">TAK MILENGE</span>
              </div>
              
              <p className="text-lg text-brand-900/90 leading-relaxed mb-8 font-medium max-w-sm">
                Apni dukaan shuru ya badhane ke liye.
              </p>
              
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => handleDemo('retailer')}
                className="group inline-flex items-center font-medium text-brand-900 hover:text-brand-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pending === 'retailer' ? 'Khul raha hai...' : 'Retailer Bane'} <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Distributor Funding */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left pl-0 md:pl-12">
              <p className="font-semibold text-brand-900 uppercase tracking-widest text-sm mb-6">Distributors</p>
              
              <div className="flex flex-col gap-1 mb-8">
                <span className="font-display text-5xl lg:text-6xl font-bold text-brand-900 tracking-tight">₹50 LAKH</span>
                <span className="font-display text-2xl font-bold text-brand-900 tracking-widest">TAK MILENGE</span>
              </div>
              
              <p className="text-lg text-brand-900/90 leading-relaxed mb-8 font-medium max-w-sm">
                Apna distribution business shuru ya badhane ke liye.
              </p>
              
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => handleDemo('distributor')}
                className="group inline-flex items-center font-medium text-brand-900 hover:text-brand-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pending === 'distributor' ? 'Khul raha hai...' : 'Distributor Bane'} <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
          
          <div className="text-center mt-16 md:mt-24">
            <p className="text-sm font-medium text-brand-500">
              Eligible businesses ke liye sarkari financing. Eligibility aur scheme ke niyamon ke anusaar.
            </p>
          </div>
        </div>
      </section>

      {/* 04 — RETAILER + DISTRIBUTOR STORY */}
      <section id="story" className="border-t border-brand-900/5">
        <div className="mx-auto max-w-[1240px] px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-brand-900/5 -translate-x-1/2"></div>
            
            <div className="pr-0 md:pr-12">
              <p className="font-display text-2xl text-brand-900 mb-6 font-semibold">Retailer</p>
              <h2 className="text-3xl sm:text-4xl font-medium text-brand-900 leading-tight mb-6">
                Apni dukaan ke liye sahi maal dhoondo.
              </h2>
              <p className="text-lg text-brand-900/70 leading-relaxed mb-10 min-h-[84px] max-w-md">
                Customer jo maangta hai, wahi becho. Naye products asani se source karo aur sahi waqt par stock mangwao.
              </p>
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => handleDemo('retailer')}
                className="group inline-flex items-center text-lg font-medium text-brand-900 hover:text-brand-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pending === 'retailer' ? 'Khul raha hai...' : 'Retailer ke liye'} <ArrowRight size={20} className="ml-2 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="pl-0 md:pl-12">
              <p className="font-display text-2xl text-brand-900 mb-6 font-semibold">Distributor</p>
              <h2 className="text-3xl sm:text-4xl font-medium text-brand-900 leading-tight mb-6">
                Jahan demand hai, wahan apni supply pahuchao.
              </h2>
              <p className="text-lg text-brand-900/70 leading-relaxed mb-10 min-h-[84px] max-w-md">
                Naye retailers dhoondo aur apna inventory sahi jagah par, bina delay ke deliver karo.
              </p>
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => handleDemo('distributor')}
                className="group inline-flex items-center text-lg font-medium text-brand-900 hover:text-brand-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pending === 'distributor' ? 'Khul raha hai...' : 'Distributor ke liye'} <ArrowRight size={20} className="ml-2 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
          {error && <p className="text-center mt-12 text-brand-900 font-medium bg-brand-300/30 inline-block px-4 py-2 rounded-md">{error}</p>}
        </div>
      </section>

      {/* 05 — CONNECTION STORY & INTELLIGENCE PROOF */}
      <section id="connection" className="bg-brand-900 text-brand-50 py-24 lg:py-32 rounded-t-[3rem]">
        <div className="mx-auto max-w-[1024px] px-6 lg:px-8">
          <div className="text-center mb-20 lg:mb-24">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-300 mb-5">
              Demand Se Supply Tak
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-6">
              Jahan zaroorat hai,<br className="hidden sm:block" />wahan business ka mauka hai.
            </h2>
            <p className="text-lg text-brand-50/80 font-medium max-w-2xl mx-auto">
              Retailers ki zaroorat aur distributors ki supply ko NEXGram ek jagah laata hai.
            </p>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="hidden md:block relative">
              <div className="absolute top-8 left-0 right-0 h-px bg-brand-50/15"></div>
              
              <div className="grid grid-cols-3 gap-8 text-center relative z-10">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-brand-900 border-2 border-brand-300 mb-6"></div>
                  <h3 className="font-display text-xl font-bold mb-2">Retailers</h3>
                  <p className="text-brand-300 font-medium text-sm">"Kya chahiye?"</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-brand-300 mb-6 shadow-[0_0_12px_rgba(174,195,176,0.3)]"></div>
                  <h3 className="font-display text-xl font-bold mb-2">NEXGram</h3>
                  <p className="text-brand-300 font-medium text-sm">"Demand samjho"</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-brand-900 border-2 border-brand-300 mb-6"></div>
                  <h3 className="font-display text-xl font-bold mb-2">Distributors</h3>
                  <p className="text-brand-300 font-medium text-sm">"Supply pahuchao"</p>
                </div>
              </div>
            </div>

            <div className="md:hidden flex flex-col items-center text-center space-y-10 relative">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-brand-50/15 -translate-x-1/2"></div>
              
              <div className="relative z-10 flex flex-col items-center bg-brand-900 py-2">
                <div className="w-3 h-3 rounded-full bg-brand-900 border-2 border-brand-300 mb-3"></div>
                <h3 className="font-display text-lg font-bold mb-1">Retailers</h3>
                <p className="text-brand-300 text-xs font-medium">"Demand"</p>
              </div>

              <div className="relative z-10 flex flex-col items-center bg-brand-900 py-2">
                <div className="w-3 h-3 rounded-full bg-brand-300 mb-3"></div>
                <h3 className="font-display text-lg font-bold mb-1">NEXGram</h3>
              </div>

              <div className="relative z-10 flex flex-col items-center bg-brand-900 py-2">
                <div className="w-3 h-3 rounded-full bg-brand-900 border-2 border-brand-300 mb-3"></div>
                <h3 className="font-display text-lg font-bold mb-1">Distributors</h3>
                <p className="text-brand-300 text-xs font-medium">"Supply"</p>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-brand-50/10 max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-5">
                <span className="font-display text-xl font-bold text-brand-50">Paneer</span>
                <span className="text-xs font-medium text-brand-300 uppercase tracking-widest">Palampur Market</span>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-brand-50">
                  <span className="font-medium">6 retailers</span>
                  <span className="text-brand-300 text-sm">looking</span>
                </div>
                <div className="flex justify-between text-brand-50">
                  <span className="font-medium">2 suppliers</span>
                  <span className="text-brand-300 text-sm">nearby</span>
                </div>
              </div>
              <div className="text-sm font-medium text-brand-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-300"></span>
                Supply gap found → Business opportunity
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — FINAL CTA */}
      <section className="bg-brand-50 py-24 lg:py-32 text-center">
        <div className="mx-auto max-w-[800px] px-6 lg:px-8">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-900 mb-6">
            Apne area ke business ko<br className="hidden sm:block" /> aur aage badhao.
          </h2>
          <p className="text-lg text-brand-900/70 leading-relaxed mb-10 max-w-xl mx-auto">
            Retailer ho ya distributor — NEXGram ke saath local business ko smarter tareeke se grow karo.
          </p>
          <button 
            onClick={() => document.getElementById('story').scrollIntoView({behavior: 'smooth'})}
            className="inline-flex items-center justify-center rounded-lg bg-brand-900 text-brand-50 px-7 py-3.5 font-medium transition-all hover:bg-brand-800 hover:-translate-y-0.5 cursor-pointer shadow-sm"
          >
            Explore NEXGram <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      </section>
      
      <footer className="py-10 text-center text-sm font-medium text-brand-900/40 bg-brand-50 border-t border-brand-900/5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
          <span className="font-display font-bold text-brand-900/60">NEXGram</span>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-brand-900/20"></div>
          <span>Gaon ka Growth Partner</span>
        </div>
        <p>&copy; {new Date().getFullYear()} NEXGram. All rights reserved.</p>
      </footer>
    </div>
  );
}
