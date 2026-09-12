import { ArrowLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './TopNav.module.css';
import { AlertsBell } from './AlertsBell';
import { useAuth } from '../../context/AuthContext';

export function TopNav({ title = 'NEXGram', showBack = false }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // The old hamburger opened nothing. A control that does nothing when tapped
  // is worse than no control, so the slot carries the brand instead.
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
