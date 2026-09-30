"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";

import {
  addToCart as addToCartAction,
  removeCartLine as removeCartLineAction,
  updateCartLine as updateCartLineAction,
} from "@/app/actions/cart";
import type { CartView } from "@/lib/cart";
import { totalsFor } from "@/lib/money";

type CartContextValue = {
  cart: CartView;
  isPending: boolean;
  isOpen: boolean;
  notice: string | null;
  open: () => void;
  close: () => void;
  add: (variantId: string, quantity?: number) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  dismissNotice: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Holds cart state for the whole app.
 *
 * Quantity changes and removals are applied optimistically — waiting on a round
 * trip to see a line disappear feels broken. Adds are not optimistic, because
 * the server is what decides whether stock allows it, and showing an item that
 * then vanishes is worse than a brief spinner.
 */
export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartView;
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<CartView>(initialCart);
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticCart, applyOptimistic] = useOptimistic(
    cart,
    (current: CartView, patch: { itemId: string; quantity: number }): CartView => {
      const lines = current.lines
        .map((line) =>
          line.id === patch.itemId
            ? {
                ...line,
                quantity: patch.quantity,
                lineTotalCents: line.unitPriceCents * patch.quantity,
              }
            : line,
        )
        .filter((line) => line.quantity > 0);

      const subtotal = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);

      // Recomputed with the same helper the server uses, so the optimistic
      // totals cannot drift from the authoritative ones.
      return {
        ...current,
        lines,
        itemCount: lines.reduce((n, l) => n + l.quantity, 0),
        ...totalsFor(subtotal),
      };
    },
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const add = useCallback(async (variantId: string, quantity = 1) => {
    const result = await addToCartAction(variantId, quantity);
    if (result.ok) {
      setCart(result.cart);
      setNotice(result.message ?? null);
      setIsOpen(true);
    } else {
      setNotice(result.error);
    }
  }, []);

  const update = useCallback(
    async (itemId: string, quantity: number) => {
      startTransition(async () => {
        applyOptimistic({ itemId, quantity });
        const result = await updateCartLineAction(itemId, quantity);
        if (result.ok) {
          setCart(result.cart);
          if (result.message) setNotice(result.message);
        } else {
          setNotice(result.error);
        }
      });
    },
    [applyOptimistic],
  );

  const remove = useCallback(
    async (itemId: string) => {
      startTransition(async () => {
        applyOptimistic({ itemId, quantity: 0 });
        const result = await removeCartLineAction(itemId);
        if (result.ok) setCart(result.cart);
        else setNotice(result.error);
      });
    },
    [applyOptimistic],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart: optimisticCart,
      isPending,
      isOpen,
      notice,
      open,
      close,
      add,
      update,
      remove,
      dismissNotice,
    }),
    [optimisticCart, isPending, isOpen, notice, open, close, add, update, remove, dismissNotice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
