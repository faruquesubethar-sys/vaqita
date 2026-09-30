"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateOrderStatus, type AdminResult } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-brass/50 px-4 py-2 text-[0.625rem] uppercase tracking-[0.15em] text-brass-lit transition-colors hover:bg-brass hover:text-ink disabled:opacity-50"
    >
      {pending ? "…" : "Update"}
    </button>
  );
}

/**
 * Status control for one order.
 *
 * A client component because the action returns a result to show inline — a
 * plain `<form action={...}>` discards the return value, so a failed update
 * would look identical to a successful one.
 */
export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [state, action] = useActionState<AdminResult | undefined, FormData>(
    async (_prev, fd) => updateOrderStatus(fd),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <select
          name="status"
          defaultValue={currentStatus}
          aria-label="Order status"
          className="border border-bone/20 bg-transparent px-3 py-2 text-[0.625rem] uppercase tracking-[0.15em] text-stone outline-none transition-colors focus:border-brass [&>option]:bg-obsidian"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Submit />
      </form>

      {state && (
        <p
          role="status"
          className={cn(
            "text-[0.625rem] leading-relaxed",
            state.ok ? "text-success" : "text-danger",
          )}
        >
          {state.ok ? state.message : state.error}
        </p>
      )}
    </div>
  );
}
