import styles from './Layout.module.css';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { ConnectionBanner } from './ConnectionBanner';

/**
 * The application shell.
 *
 * @param width  How wide the page column may grow on a large screen.
 *               'narrow' for forms and anything read as prose, 'wide' for the
 *               dashboards and list screens that lay out in columns, 'default'
 *               for detail pages. A single width for all three made forms span
 *               a metre of desk and dashboards waste half the window.
 */
export function Layout({
  children,
  title,
  showBottomNav = true,
  showBack = false,
  role = 'retailer',
  width = 'default',
}) {
  const classes = [
    styles.layout,
    width === 'narrow' ? styles.narrow : '',
    width === 'wide' ? styles.wide : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <TopNav title={title} showBack={showBack} />
      <div className={`${styles.content} ${showBottomNav ? styles.hasBottomNav : ''}`}>
        {/* Inside the content area, not above it: the header is fixed, so a
            banner placed before it in the flow sat underneath it, unread. */}
        <ConnectionBanner />
        <div className={styles.container}>
          {children}
        </div>
      </div>
      {showBottomNav && <BottomNav role={role} />}
    </div>
  );
}
