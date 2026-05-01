'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function Navbar({ cartCount = 0, onCartOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
        }`}
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logos/toys_2000_logo.png"
              alt="Toys2000"
              width={140}
              height={46}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/catalog"
              className="text-sm font-semibold text-[#1a1d26] hover:text-[#f15a24] transition-colors"
            >
              Shop All
            </Link>
            <Link
              href="/catalog"
              className="text-sm font-semibold text-[#1a1d26] hover:text-[#f15a24] transition-colors"
            >
              Brands
            </Link>
            {user && (
              <Link
                href="/orders"
                className="text-sm font-semibold text-[#1a1d26] hover:text-[#f15a24] transition-colors"
              >
                My Orders
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Cart button */}
            {user && (
              <button
                onClick={onCartOpen}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-[#1a1d26] hover:bg-[#f7f8fa] transition-colors"
                aria-label="Open cart"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: '#f15a24' }}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Auth */}
            {user ? (
              <button
                onClick={handleSignOut}
                className="hidden md:block text-sm font-semibold text-[#5f6980] hover:text-[#f15a24] transition-colors"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="hidden md:block text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
              >
                Sign in
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-[#1a1d26] hover:bg-[#f7f8fa]"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-black/[0.06] bg-white px-4 py-4 space-y-3">
            <Link href="/catalog" className="block text-sm font-semibold text-[#1a1d26] py-2">Shop All</Link>
            <Link href="/catalog" className="block text-sm font-semibold text-[#1a1d26] py-2">Brands</Link>
            {user && (
              <Link href="/orders" className="block text-sm font-semibold text-[#1a1d26] py-2">My Orders</Link>
            )}
            <div className="pt-2 border-t border-black/[0.06]">
              {user ? (
                <button onClick={handleSignOut} className="text-sm font-semibold text-[#5f6980]">
                  Sign out
                </button>
              ) : (
                <Link href="/login" className="text-sm font-semibold text-[#f15a24]">Sign in</Link>
              )}
            </div>
          </div>
        )}
      </nav>
      {/* Spacer so content doesn't hide under fixed nav */}
      <div className="h-16" />
    </>
  );
}
