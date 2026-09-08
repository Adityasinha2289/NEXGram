import styles from './Badge.module.css';

export function Badge({ children, variant = 'primary', className = '' }) {
  return (
    <span className={`${styles.badge} ${styles[`badge-${variant}`]} ${className}`}>
      {children}
    </span>
  );
}
