import { ArrowLeft, RefreshCw, Store, Truck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './TopNav.module.css';
import { AlertsBell } from './AlertsBell';
import { useAuth } from '../../context/useAuth';

export function TopNav({ title = 'NEXGram', showBack = false }) {
  const navigate = useNavigate();
  const { currentUser, switchRole, isExplorationMode } = useAuth();

  const handleRoleToggle = async () => {
    const nextRole = currentUser?.role === 'retailer' ? 'distributor' : 'retailer';
    await switchRole(nextRole);
    navigate(`/${nextRole}/dashboard`);
  };

  return (
    <header className={styles.topnav}>
      <div className={styles.inner}>
        {showBack ? (
          <button className={styles.iconBtn} onClick={() => navigate(-1)} aria-label="Wapas jayein">
            <ArrowLeft size={22} />
          </button>
        ) : (
          <span className={styles.brand}>NEXGram</span>
        )}

        <h1 className={styles.title}>{title}</h1>

        {currentUser && (
          <div className={styles.actions}>
            {isExplorationMode && (
              <button
                type="button"
                onClick={handleRoleToggle}
                className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-2xs font-semibold text-text-secondary transition-colors hover:border-primary hover:bg-primary-light hover:text-primary sm:flex"
                title={`Switch to ${currentUser.role === 'retailer' ? 'Distributor' : 'Retailer'} mode`}
              >
                {currentUser.role === 'retailer' ? (
                  <>
                    <Store size={12} className="text-primary" />
                    <span>Retailer</span>
                    <RefreshCw size={10} className="text-text-muted" />
                  </>
                ) : (
                  <>
                    <Truck size={12} className="text-primary" />
                    <span>Distributor</span>
                    <RefreshCw size={10} className="text-text-muted" />
                  </>
                )}
              </button>
            )}
            <AlertsBell />
            <button
              className={styles.iconBtn}
              onClick={() => navigate(`/${currentUser.role}/profile`)}
              aria-label="Mera profile"
            >
              <User size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
