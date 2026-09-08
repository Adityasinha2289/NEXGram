import styles from './Input.module.css';
import { forwardRef } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  fullWidth = true,
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className={`${styles.wrapper} ${fullWidth ? styles['w-full'] : ''} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <input 
        ref={ref}
        className={`${styles.input} ${error ? styles.error : ''}`} 
        {...props} 
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
