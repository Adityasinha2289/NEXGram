import styles from './TopNav.module.css';
import { Menu, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TopNav({ title = 'App', showBack = false }) {
  const navigate = useNavigate();

  return (
    <header className={styles.topnav}>
      {showBack ? (
        <button className={styles.iconBtn} onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
      ) : (
        <button className={styles.iconBtn} aria-label="Menu">
          <Menu size={24} />
        </button>
      )}
      
      <h1 className={styles.title}>{title}</h1>
      
      <div className={styles.placeholder}></div> {/* For flex-between centering */}
    </header>
  );
}
