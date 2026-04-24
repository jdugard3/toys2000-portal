'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const SLIDES = [
  {
    tag: 'Water Fun',
    headline: 'Where Every Splash Begins',
    subheadline: 'Premium pool floats, towables, and water toys for resorts, hotels, and retailers.',
    cta: { text: 'Shop Water Toys', href: '/catalog?category=pool' },
    image: '/brands/aqua_leisure/aqua_leisure_hero_1.png',
    accent: '#00aeef',
  },
  {
    tag: 'Musical Instruments',
    headline: 'Where Every Note Begins',
    subheadline: "Kid-friendly ukuleles, recorders, and percussion — music programs love them.",
    cta: { text: 'Shop Instruments', href: '/catalog?category=music' },
    image: '/brands/trophy_music/trophy_music_hero_3.png',
    accent: '#ffb600',
  },
  {
    tag: 'Outdoor Play',
    headline: 'Where Every Moment Begins',
    subheadline: 'Splash pads, sprinklers, and outdoor water play that keep kids smiling all day.',
    cta: { text: 'Shop Outdoor Play', href: '/catalog?category=outdoor' },
    image: '/brands/boss_play/boss_play_hero_4.png',
    accent: '#8cc63f',
  },
  {
    tag: 'Puzzles & Games',
    headline: 'Where Every Discovery Begins',
    subheadline: 'Jigsaw puzzles, board games, and family entertainment for every age group.',
    cta: { text: 'Shop Puzzles', href: '/catalog' },
    image: '/brands/masterpieces/masterpieces_hero_3.png',
    accent: '#ffb600',
  },
  {
    tag: 'Towables & Tubes',
    headline: 'Where Every Thrill Begins',
    subheadline: 'From 1-rider rockets to 4-person party decks — wholesale pricing for your fleet.',
    cta: { text: 'Browse Towables', href: '/catalog' },
    image: '/brands/airhead/airhead_hero_1.png',
    accent: '#f15a24',
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), []);
  const prev = () => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = SLIDES[current];

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: 'clamp(420px, 60vh, 640px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          key={current}
          src={slide.image}
          alt={slide.headline}
          fill
          className="object-cover"
          priority={current === 0}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-center">
        <div className="max-w-xl animate-fade-in" key={current}>
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{ background: slide.accent + '33', color: slide.accent, border: `1px solid ${slide.accent}66` }}
          >
            {slide.tag}
          </span>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            {slide.headline}
          </h1>
          <p className="text-white/85 text-base sm:text-lg mb-6 leading-relaxed">
            {slide.subheadline}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-block font-bold px-6 py-3 rounded-xl text-sm text-white transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive" }}
            >
              {slide.cta.text}
            </Link>
            <Link
              href="/login"
              className="inline-block font-semibold px-6 py-3 rounded-xl text-sm text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
            >
              Sign in to order
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              background: i === current ? '#f15a24' : 'rgba(255,255,255,0.5)',
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center"
        aria-label="Previous slide"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center"
        aria-label="Next slide"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </section>
  );
}
