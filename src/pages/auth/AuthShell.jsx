import { Link } from 'react-router-dom';

/**
 * The frame around login, register and password recovery.
 *
 * The three screens had each built their own centring, their own card width and
 * their own heading sizes, so moving between them shifted the layout under the
 * user. One shell keeps them still.
 */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen animate-fade-in flex-col bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-text-inverse"
            aria-hidden="true"
          >
            N
          </span>
          <span className="text-lg font-bold tracking-tight text-text-primary">NEXGram</span>
        </Link>

        <div className="panel flex flex-col gap-5 p-6 shadow-sm">
          <header className="text-center">
            <h1 className="text-xl font-bold leading-tight text-text-primary">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
          </header>

          {children}
        </div>

        {footer && <p className="text-center text-sm text-text-muted">{footer}</p>}
      </div>
    </div>
  );
}
