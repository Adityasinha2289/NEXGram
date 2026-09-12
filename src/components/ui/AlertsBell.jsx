import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { intelligenceApi } from '../../services/api/intelligenceApi';
import styles from './AlertsBell.module.css';

const SEEN_KEY = 'nexgram_alerts_seen_at';

/**
 * What changed since this user last looked.
 *
 * The "last looked" timestamp lives in this browser rather than on the server:
 * it is a per-device convenience, and syncing it would mean opening the app on a
 * phone silently marked things read on the shop counter's tablet.
 */
export function AlertsBell() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const panelRef = useRef(null);

  const readSeenAt = () => {
    try {
      return localStorage.getItem(SEEN_KEY);
    } catch {
      return null;
    }
  };

  const load = () => {
    intelligenceApi.getAlerts()
      .then((res) => {
        const items = res.items || [];
        setAlerts(items);
        const seenAt = readSeenAt();
        setUnseen(
          seenAt ? items.filter((a) => a.at && a.at > seenAt).length : items.length,
        );
      })
      .catch(() => setAlerts([]));
  };

  useEffect(() => {
    load();
    // Rural connections are expensive; poll rarely rather than live.
    const timer = setInterval(load, 120000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onClickAway = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    const onEscape = (e) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  const open = () => {
    setIsOpen(true);
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      // A private window just keeps showing the badge; harmless.
    }
    setUnseen(0);
  };

  const go = (alert) => {
    setIsOpen(false);
    navigate(alert.link);
  };

  return (
    <div className={styles.wrapper} ref={panelRef}>
      <button
        className={styles.bellBtn}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-label={unseen ? `${unseen} nayi cheezein` : 'Alerts'}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unseen > 0 && <span className={styles.badge}>{unseen > 9 ? '9+' : unseen}</span>}
      </button>

      {isOpen && (
        <div className={styles.panel} role="dialog" aria-label="Alerts">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Kya naya hai</span>
            <button onClick={() => setIsOpen(false)} aria-label="Band karein" className={styles.closeBtn}>
              <X size={16} />
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className={styles.empty}>Abhi kuch naya nahi hai.</p>
          ) : (
            <ul className={styles.list}>
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <button className={styles.item} onClick={() => go(alert)}>
                    <span className={`${styles.dot} ${styles[alert.severity] || ''}`} />
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>{alert.title}</span>
                      <span className={styles.itemText}>{alert.body}</span>
                      <span className={styles.itemMeta}>
                        {alert.age}
                        {alert.confidence ? ` · ${alert.confidence} confidence` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
