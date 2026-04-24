'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency, snapQuantity, groupByManufacturer, vendorSubtotal } from '@/lib/cart';

export default function CartModal({ open, onClose, cartItems = [], onUpdateQuantity, onRemove, onClear }) {
  // Trap Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const grouped = groupByManufacturer(cartItems);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const grandTotal = cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
          <h2 className="text-lg font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Cart ({totalItems})
          </h2>
          <div className="flex items-center gap-3">
            {cartItems.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs text-[#5f6980] hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5f6980] hover:bg-[#f7f8fa] transition-colors"
              aria-label="Close cart"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <svg className="w-16 h-16 text-[#eef0f4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-[#5f6980] font-medium">Your cart is empty</p>
              <Link
                href="/catalog"
                onClick={onClose}
                className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
              >
                Browse catalog
              </Link>
            </div>
          ) : (
            Object.values(grouped).map((group) => (
              <div key={group.manufacturerID}>
                <p className="text-xs font-bold text-[#5f6980] uppercase tracking-wider mb-3">
                  {group.manufacturerName}
                </p>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdateQuantity={onUpdateQuantity}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-sm font-semibold text-[#1a1d26]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(vendorSubtotal(group.items))}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-black/[0.06] px-5 py-4 space-y-3">
            <div className="flex justify-between font-bold text-[#1a1d26]">
              <span style={{ fontFamily: "'Baloo 2', cursive" }}>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <Link
              href="/cart"
              onClick={onClose}
              className="block w-full text-center py-3 rounded-xl font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive" }}
            >
              View cart & checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

function CartItem({ item, onUpdateQuantity, onRemove }) {
  const snappedUp = (qty) =>
    snapQuantity(qty, item.minimum_quantity, item.quantity_increment);

  const handleQtyChange = (delta) => {
    const next = item.quantity + delta * item.quantity_increment;
    if (next < item.minimum_quantity) {
      onRemove(item.id);
    } else {
      onUpdateQuantity(item.id, snappedUp(next));
    }
  };

  return (
    <div className="flex gap-3 items-start">
      {item.primary_image_url && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#f7f8fa] flex-shrink-0">
          <Image
            src={item.primary_image_url}
            alt={item.name}
            fill
            className="object-contain p-1"
            sizes="64px"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1a1d26] leading-snug line-clamp-2">{item.name}</p>
        <p className="text-xs text-[#5f6980] mt-0.5">{formatCurrency(item.unit_price)} each</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => handleQtyChange(-1)}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-[#1a1d26] hover:bg-[#f7f8fa] transition-colors text-base font-medium"
          >
            −
          </button>
          <span className="text-sm font-semibold text-[#1a1d26] w-8 text-center">{item.quantity}</span>
          <button
            onClick={() => handleQtyChange(1)}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-[#1a1d26] hover:bg-[#f7f8fa] transition-colors text-base font-medium"
          >
            +
          </button>
          <span className="ml-1 text-sm font-bold text-[#1a1d26]">
            {formatCurrency(item.unit_price * item.quantity)}
          </span>
        </div>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-[#5f6980] hover:text-red-500 transition-colors p-1 mt-0.5"
        aria-label="Remove item"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
