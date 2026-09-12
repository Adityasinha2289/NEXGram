import styles from './Layout.module.css';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { ConnectionBanner } from './ConnectionBanner';

export function Layout({ children, title, showBottomNav = true, showBack = false, role = 'retailer' }) {
  return (
    <div className={styles.layout}>
      <TopNav title={title} showBack={showBack} />
      {/* Sits directly under the header so a stale-data warning is never missed. */}
      <ConnectionBanner />
      <div className={`${styles.content} ${showBottomNav ? styles.hasBottomNav : ''}`}>
        <div className={styles.container}>
          {children}
        </div>
      </div>
      {showBottomNav && <BottomNav role={role} />}
    </div>
  );
}
