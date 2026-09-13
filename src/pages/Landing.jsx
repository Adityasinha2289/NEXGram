import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ROLE_LIST, ROLES, homeFor } from '../constants/roles';
import heroImage from '../assets/hero_illustration.jpg';

/**
 * The front door.
 *
 * Rebuilt because it kept saying the same thing. "Retailer bane" appeared in
 * the hero, again under a funding heading, and again under a story heading —
 * three buttons, three sets of words, one destination. The retailer-and-
 * distributor two-column split with its centre divider was hand-written twice,
 * the three-step diagram was written twice more (once for phones, once for
 * desktop, and the two had already drifted apart), and "Explore NEXGram"
 * scrolled to the same section from three places.
 *
 * Now each role is described once, from one table, and a demo is offered in
 * exactly one place. Everything below the hero explains what is behind those
 * three doors instead of offering them again.
 */
const PITCH = {
  retailer: {
    heading: 'Apni dukaan ke liye sahi maal.',
    body: 'Customer jo maangta hai wahi rakho. Stock, sale aur delivery ek jagah — '
      + 'aur mangwane se pehle poore area ke daam compare.',
    funding: '₹10 lakh',
  },
  distributor: {
    heading: 'Jahan demand hai, wahan supply.',
    body: 'Aas-paas ke retailers kya maang rahe hain aur koi de nahi paa raha — '
      + 'wahi aapka agla order hai.',
    funding: '₹50 lakh',
  },
  customer: {
    heading: 'Paas ki dukaan, ghar par.',
    body: 'Dukaan mein abhi jo hai wahi dikhta hai. Shop ka apna ladka cycle par '
      + 'pahucha deta hai.',
    funding: null,
  },
};

/** The demand-to-supply diagram, in the one markup both shapes need. */
const FLOW = [
  { who: 'Retailers', says: 'Kya chahiye' },
  { who: 'NEXGram', says: 'Demand samjho', lit: true },
  { who: 'Distributors', says: 'Supply pahuchao' },
];

export function Landing() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) navigate(homeFor(currentUser.role), { replace: true });
  }, [currentUser, navigate]);

  const handleDemo = async (roleKey) => {
    const role = ROLES[roleKey];
    if (!role) return;
    setPending(roleKey);
    setError(null);
    try {
      // Routed by what the server says the account is, not by which button
      // was pressed.
      const user = await login(role.demo.mobile, role.demo.password);
      navigate(homeFor(user?.role || roleKey));
    } catch (err) {
      setError(err?.message || 'Demo login failed. Please try from the login page.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 text-brand-900 font-sans selection:bg-brand-300 selection:text-brand-900">
      {/* 01 — NAVIGATION. Three menu items scrolled between two sections; one
          link now covers the whole explanation below. */}
      <nav className="sticky top-0 z-50 bg-brand-50/95 backdrop-blur-sm border-b border-brand-900/5">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold tracking-tight text-brand-900">NEXGram</span>
            <span className="hidden sm:inline-block text-sm font-medium text-brand-500">Gaon ka Growth Partner</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#kaise"
              className="hidden font-medium text-brand-900 transition-colors hover:text-brand-500 sm:inline-block"
            >
              Kaise kaam karta hai
            </a>
            {/* Signing in was reachable only by typing /login. A returning
                shopkeeper should not have to know the URL of their own app. */}
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg bg-brand-900 px-5 py-2.5 font-medium text-brand-50 transition-all hover:bg-brand-800"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* 02 — HERO. The only place a demo is offered. */}
      <section className="mx-auto max-w-[1240px] px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-12 items-center">
          <div className="max-w-[520px]">
            <p className="text-sm font-semibold tracking-widest uppercase text-brand-500 mb-6">
              Gaon ka business. Ab aur bada.
            </p>
            <h1 className="font-display text-5xl sm:text-6xl font-bold leading-[1.05] text-brand-900 tracking-tight mb-6">
              Apni dukaan.<br />
              Ab aur bada socho.
            </h1>
            <p className="text-lg text-brand-900/80 leading-relaxed mb-10">
              Local demand, sahi products aur bharosemand suppliers — ek hi jagah.
            </p>

            {/*
              * The three doors, on the first screen.
              *
              * A visitor is one of three things and knows which; making them
              * scroll to find out where they belong is a question the page can
              * answer for them. Each card signs in to that world's demo, with
              * a real login underneath for people who already have an account.
              */}
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-500 mb-4">
              Aap kaun hain?
            </p>

            <div className="flex flex-col gap-2.5">
              {ROLE_LIST.map((role) => {
                const Icon = role.icon;
                const isPending = pending === role.key;
                return (
                  <div
                    key={role.key}
                    className="flex items-center gap-4 rounded-lg border border-brand-900/10 bg-white/60 px-4 py-3.5 transition-all hover:border-brand-900/25 hover:bg-white"
                  >
                    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-brand-900 text-brand-50">
                      <Icon size={18} strokeWidth={2} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand-900">{role.label}</p>
                      <p className="text-sm leading-snug text-brand-900/70">{role.tagline}</p>
                    </div>

                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <button
                        type="button"
                        disabled={Boolean(pending)}
                        onClick={() => handleDemo(role.key)}
                        className="inline-flex items-center rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-brand-50 transition-all hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
                      >
                        {isPending ? 'Khul raha hai...' : 'Demo kholo'}
                        {!isPending && <ArrowRight size={15} className="ml-1.5" />}
                      </button>
                      <Link
                        to={role.loginPath}
                        className="text-xs font-medium text-brand-500 hover:text-brand-900 hover:underline"
                      >
                        Login karein
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Beside the buttons that can fail, rather than two sections
                further down where it used to sit. */}
            {error && (
              <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error}</p>
            )}
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

      {/* 03 — WHAT IS BEHIND EACH DOOR. Replaces two sections that both split
          retailer from distributor and both ended in a button the hero already
          has. The funding numbers now sit with the role they apply to instead
          of owning a headline of their own. */}
      <section id="kaise" className="border-t border-brand-900/5">
        <div className="mx-auto max-w-[1240px] px-6 lg:px-8 py-20 lg:py-28">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-900 leading-tight mb-16 max-w-2xl">
            Teen taraf ka business, ek jagah.
          </h2>

          <div className="grid md:grid-cols-3 gap-12 md:gap-10">
            {ROLE_LIST.map((role) => {
              const pitch = PITCH[role.key];
              const Icon = role.icon;
              return (
                <div key={role.key} className="flex flex-col">
                  <span className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-brand-900/5 text-brand-900">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-widest text-brand-500 mb-3">
                    {role.label}
                  </p>
                  <h3 className="text-2xl font-medium text-brand-900 leading-snug mb-4">
                    {pitch.heading}
                  </h3>
                  <p className="text-brand-900/70 leading-relaxed">{pitch.body}</p>

                  {pitch.funding && (
                    <p className="mt-5 border-t border-brand-900/10 pt-5">
                      <span className="font-display text-3xl font-bold tracking-tight text-brand-900">
                        {pitch.funding}
                      </span>
                      <span className="ml-2 text-sm font-medium text-brand-900/60">
                        tak ka sarkari loan
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-14 text-sm font-medium text-brand-500">
            Sarkari financing eligibility aur scheme ke niyamon ke anusaar. NEXGram khud loan nahi
            deta — hum aapko sahi scheme tak pahuchate hain.
          </p>
        </div>
      </section>

      {/* 04 — HOW THE THREE MEET. */}
      <section className="bg-brand-900 text-brand-50 py-20 lg:py-28 rounded-t-[3rem]">
        <div className="mx-auto max-w-[1024px] px-6 lg:px-8">
          <div className="mb-16 max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-300 mb-5">
              Demand se supply tak
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-5">
              Jahan zaroorat hai, wahan mauka hai.
            </h2>
            <p className="text-lg text-brand-50/80 font-medium">
              Har dukaan jo batati hai ki uske paas kya nahi hai, wahi aas-paas ke
              distributor ka agla order ban jata hai.
            </p>
          </div>

          {/* One markup for both shapes — a row on a desktop, a column on a
              phone. It used to be written out twice and the copies had drifted:
              the phone version had quietly lost a label. */}
          <ol className="grid md:grid-cols-3 gap-8 md:gap-6 mb-16">
            {FLOW.map((step) => (
              <li key={step.who} className="flex items-center gap-4 md:flex-col md:text-center">
                <span
                  className={[
                    'h-3.5 w-3.5 flex-shrink-0 rounded-full md:mb-4',
                    step.lit
                      ? 'bg-brand-300 shadow-[0_0_12px_rgba(174,195,176,0.4)]'
                      : 'border-2 border-brand-300 bg-brand-900',
                  ].join(' ')}
                />
                <span>
                  <span className="block font-display text-xl font-bold">{step.who}</span>
                  <span className="block text-sm font-medium text-brand-300">{step.says}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="max-w-sm rounded-xl border border-brand-50/15 p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="font-display text-xl font-bold text-brand-50">Paneer</span>
              <span className="text-xs font-medium text-brand-300 uppercase tracking-widest">Palampur Market</span>
            </div>
            <div className="space-y-3 mb-5">
              <p className="flex justify-between text-brand-50">
                <span className="font-medium">6 retailers</span>
                <span className="text-brand-300 text-sm">maang rahe hain</span>
              </p>
              <p className="flex justify-between text-brand-50">
                <span className="font-medium">2 suppliers</span>
                <span className="text-brand-300 text-sm">aas-paas</span>
              </p>
            </div>
            <p className="text-sm font-medium text-brand-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-300"></span>
              Supply gap mila → business ka mauka
            </p>
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm font-medium text-brand-900/40 bg-brand-50 border-t border-brand-900/5">
        <p className="mb-2">
          <span className="font-display font-bold text-brand-900/60">NEXGram</span>
          <span className="mx-2 text-brand-900/20">·</span>
          Gaon ka Growth Partner
        </p>
        <p>&copy; {new Date().getFullYear()} NEXGram. All rights reserved.</p>
      </footer>
    </div>
  );
}
