import { Ban, Check, ChefHat, Clock, PackageCheck, Send, Truck, XCircle } from 'lucide-react';
import { Card, CardContent } from './Card';

/**
 * An order's lifecycle, drawn from order_status_history.
 *
 * Shows the steps still to come as well as the ones already taken, because the
 * question a shopkeeper actually has is "where is my order" - and a log that
 * stops at the present tense does not answer it. Stops short on a terminal
 * status: there is no "next" after a rejection.
 */
const STEPS = [
  { status: 'requested', label: 'Order bheja', icon: Send },
  { status: 'accepted', label: 'Distributor ne accept kiya', icon: Check },
  { status: 'preparing', label: 'Taiyari ho rahi hai', icon: ChefHat },
  { status: 'ready', label: 'Delivery ke liye ready', icon: Truck },
  { status: 'completed', label: 'Poora hua', icon: PackageCheck },
];

const TERMINAL = {
  cancelled: { label: 'Cancel ho gaya', icon: Ban },
  rejected: { label: 'Distributor ne reject kiya', icon: XCircle },
};

const formatWhen = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

export function OrderTimeline({ history = [], currentStatus }) {
  const reached = new Map();
  history.forEach((entry) => {
    if (!reached.has(entry.new_status)) reached.set(entry.new_status, entry);
  });

  const terminal = TERMINAL[currentStatus];
  const currentIndex = STEPS.findIndex((step) => step.status === currentStatus);

  // A terminated order shows how far it got, then why it stopped.
  const steps = terminal
    ? STEPS.filter((step) => reached.has(step.status))
    : STEPS;

  const rows = [
    ...steps.map((step, index) => {
      const entry = reached.get(step.status);
      return {
        key: step.status,
        label: step.label,
        icon: step.icon,
        when: entry ? formatWhen(entry.created_at) : null,
        reason: entry?.reason,
        state: entry ? 'done' : index === currentIndex + 1 ? 'next' : 'pending',
      };
    }),
    ...(terminal
      ? [{
          key: currentStatus,
          label: terminal.label,
          icon: terminal.icon,
          when: reached.get(currentStatus) ? formatWhen(reached.get(currentStatus).created_at) : null,
          reason: reached.get(currentStatus)?.reason,
          state: 'terminal',
        }]
      : []),
  ];

  const STATE_STYLES = {
    done: { dot: 'bg-primary text-text-inverse', text: 'text-text-primary', line: 'bg-primary' },
    next: { dot: 'bg-surface border-2 border-primary text-primary', text: 'text-text-primary', line: 'bg-border' },
    pending: { dot: 'bg-surface border border-border text-text-muted', text: 'text-text-muted', line: 'bg-border' },
    terminal: { dot: 'bg-danger text-text-inverse', text: 'text-danger', line: 'bg-border' },
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <h3 className="font-bold text-md text-text-primary mb-4">Order Kahan Hai?</h3>
        <ol className="flex flex-col">
          {rows.map((row, index) => {
            const style = STATE_STYLES[row.state];
            const Icon = row.icon;
            const isLast = index === rows.length - 1;
            return (
              <li key={row.key} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`w-7 h-7 rounded-full grid place-items-center ${style.dot}`}>
                    <Icon size={14} />
                  </span>
                  {!isLast && <span className={`w-0.5 flex-1 min-h-[18px] ${style.line}`} />}
                </div>
                <div className={`pb-4 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                  <p className={`text-sm font-medium leading-tight ${style.text}`}>{row.label}</p>
                  {row.when ? (
                    <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                      <Clock size={11} /> {row.when}
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted mt-0.5">
                      {row.state === 'next' ? 'Agla step' : 'Abhi baaki hai'}
                    </p>
                  )}
                  {row.reason && <p className="text-xs text-text-muted mt-0.5">{row.reason}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
