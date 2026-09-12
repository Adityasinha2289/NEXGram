import styles from './Badge.module.css';

/**
 * A status chip.
 *
 * @param dot  Draws a filled dot in the chip's own colour. Worth setting
 *             wherever the colour is carrying meaning the words do not, so the
 *             distinction survives a colour-blind reader and a grey print-out.
 */
export function Badge({ children, variant = 'primary', dot = false, className = '' }) {
  const classes = [
    styles.badge,
    styles[`badge-${variant}`] || styles['badge-neutral'],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
