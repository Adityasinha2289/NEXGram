/**
 * One description of an order's status, for every screen that shows one.
 *
 * These are the only statuses the API uses. The pages previously branched on
 * "pending", "processing" and "delivered", none of which exist server-side, so
 * every order rendered in the same amber "in progress" colour and the
 * distributor's fulfilment panel — gated on `status === "pending"` — never
 * appeared at all.
 */
export type OrderStatus =
  | "draft"
  | "requested"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "rejected";

export interface StatusPresentation {
  label: string;
  /** Tailwind classes for a status pill. */
  className: string;
}

const PRESENTATION: Record<OrderStatus, StatusPresentation> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  requested: { label: "Requested", className: "bg-orange-500/10 text-orange-600" },
  accepted: { label: "Accepted", className: "bg-primary/10 text-primary" },
  preparing: { label: "Preparing", className: "bg-primary/10 text-primary" },
  ready: { label: "Ready", className: "bg-sky-500/10 text-sky-600" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600" },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600" },
};

const UNKNOWN: StatusPresentation = {
  label: "Unknown",
  className: "bg-muted text-muted-foreground",
};

export function statusFor(status: string | undefined): StatusPresentation {
  if (!status) return UNKNOWN;
  return PRESENTATION[status.toLowerCase() as OrderStatus] ?? UNKNOWN;
}

/**
 * The transitions the API will accept, mirrored from its own table so a button
 * never offers a move the server is going to refuse with a 400.
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: [],
  requested: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export interface Move {
  to: OrderStatus;
  label: string;
  tone: "primary" | "danger" | "success";
}

/** What the distributor who owns this order can do next. */
export function distributorMoves(status: string | undefined): Move[] {
  switch (status) {
    case "requested":
      return [
        { to: "accepted", label: "Accept order", tone: "primary" },
        { to: "rejected", label: "Reject order", tone: "danger" },
      ];
    case "accepted":
      return [
        { to: "preparing", label: "Start preparing", tone: "primary" },
        { to: "cancelled", label: "Cancel order", tone: "danger" },
      ];
    case "preparing":
      return [
        { to: "ready", label: "Mark ready", tone: "primary" },
        { to: "cancelled", label: "Cancel order", tone: "danger" },
      ];
    case "ready":
      return [{ to: "completed", label: "Mark completed", tone: "success" }];
    default:
      return [];
  }
}

/** A retailer may only ever call their own order back. */
export function retailerCanCancel(status: string | undefined): boolean {
  return status === "requested" || status === "accepted" || status === "preparing";
}
