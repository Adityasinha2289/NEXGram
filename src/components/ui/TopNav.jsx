import { ArrowLeft, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './TopNav.module.css';
import { AlertsBell } from './AlertsBell';
import { useAuth } from '../../context/useAuth';

/**
 * The header.
 *
 * There used to be a role switcher here that signed you into a different demo
 * account in place. It was the wrong shape for the product — a shopkeeper does
 * not become a distributor — so a control that swapped identity mid-screen read
 * as a fault every time it was used. Leaving is now an explicit exit to the
 * home page, which is where the three demos live; you pick the next one there.
 */
export function TopNav({ title = 'NEXGram', showBack = false }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const exitToHome = () => {
    // The landing page sends a signed-in user straight back to their own
    // dashboard, so leaving has to actually end the session - otherwise the
    // click bounces off and appears to do nothing.
    logout();
    navigate('/', { replace: true });
  };

  // A household has no business profile; their address lives in the storefront.
  const profilePath = currentUser?.role === 'customer'
    ? '/shop/address'
    : `/${currentUser?.role}/profile`;

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
            {/* Alerts are derived from opportunities and orders, which a
                household has neither of — the endpoint refuses them. */}
            {currentUser.role !== 'customer' && <AlertsBell />}

            <button
              className={styles.iconBtn}
              onClick={() => navigate(profilePath)}
              aria-label="Mera profile"
            >
              <User size={20} />
            </button>

            <button
              className={styles.iconBtn}
              onClick={exitToHome}
              aria-label="Bahar niklein"
              title="Home page par wapas — wahaan se doosra demo khol sakte hain"
            >
              <LogOut size={19} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
