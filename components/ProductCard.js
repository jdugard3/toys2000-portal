'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/cart';

export default function ProductCard({ product, onQuickView }) {
  const {
    record_id,
    item_number,
    name,
    manufacturer_name,
    unit_price,
    primary_image_url,
    is_available,
    discontinued,
    discount_percent,
    minimum_quantity,
  } = product;

  const hasDiscount = discount_percent > 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-black/[0.06] overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col">
      {/* Image */}
      <Link href={`/product/${record_id}`} className="block relative aspect-square overflow-hidden bg-[#f7f8fa]">
        {primary_image_url ? (
          <Image
            src={primary_image_url}
            alt={name}
            fill
            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#5f6980] text-xs">
            No image
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: '#f15a24' }}>
              {discount_percent}% off
            </span>
          )}
          {!is_available && (
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-gray-400">
              Out of stock
            </span>
          )}
        </div>

        {/* Quick view on hover */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onQuickView?.(product);
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs font-semibold text-white px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{ background: 'rgba(26,29,38,0.85)' }}
        >
          Quick view
        </button>
      </Link>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-xs text-[#5f6980]">{manufacturer_name}</p>
        <Link href={`/product/${record_id}`} className="text-sm font-semibold text-[#1a1d26] leading-snug hover:text-[#f15a24] line-clamp-2">
          {name}
        </Link>
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          <span className="font-bold text-[#1a1d26]">{formatCurrency(unit_price)}</span>
          {minimum_quantity > 1 && (
            <span className="text-xs text-[#5f6980]">min {minimum_quantity}</span>
          )}
        </div>
      </div>
    </div>
  );
}
