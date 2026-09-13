import styles from './Button.module.css';

/**
 * @param type  Defaults to "button" rather than the HTML default of "submit".
 *              An untyped <button> inside a <form> submits it, so a Button
 *              added to a form for some unrelated action — "use my location",
 *              "add a runner" — would silently submit as well. Every button
 *              that really does submit already says so explicitly, so making
 *              that the requirement costs nothing and removes the trap.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  className = '',
  ...props
}) {
  const classes = [
    styles.btn,
    styles[`btn-${variant}`],
    styles[`btn-${size}`],
    fullWidth ? styles['btn-full'] : '',
    isLoading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className={styles.spinner}></span>
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
      ) : null}
      {children}
    </button>
  );
}
