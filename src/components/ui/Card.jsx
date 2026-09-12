import styles from './Card.module.css';

/**
 * A bordered surface.
 *
 * @param elevated     Adds a shadow. One per screen at most — it is how the
 *                     page says "this is the thing", and it stops meaning that
 *                     the moment two elements claim it.
 * @param interactive  The whole card is a control: hover feedback and a cursor.
 * @param clip         Clips content to the rounded corners. Needed only when
 *                     something inside paints to the edge, such as a divided
 *                     list or an image.
 */
export function Card({
  children,
  className = '',
  interactive = false,
  elevated = false,
  clip = false,
  ...props
}) {
  const classes = [
    styles.card,
    interactive ? styles.interactive : '',
    elevated ? styles.elevated : '',
    clip ? styles.clip : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props}>{children}</div>;
}

export function CardHeader({ children, className = '', action }) {
  return (
    <div className={`${styles.header} ${className}`}>
      <div className={styles.headerContent}>{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`${styles.title} ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`${styles.content} ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`${styles.footer} ${className}`}>{children}</div>;
}
