import { forwardRef, useId } from 'react';
import styles from './Input.module.css';

/**
 * A labelled text field.
 *
 * `icon` was already being passed by callers before this component accepted it,
 * which meant React was forwarding it to the DOM as an unknown attribute and
 * the icon never appeared.
 */
export const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  fullWidth = true,
  className = '',
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`${styles.wrapper} ${fullWidth ? styles['w-full'] : ''} ${className}`}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <div className={styles.field}>
        {Icon && (
          <span className={styles.icon}>
            <Icon size={17} strokeWidth={2} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            styles.input,
            Icon ? styles.hasIcon : '',
            error ? styles.error : '',
          ].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {error && <span className={styles.errorText} id={errorId}>{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
