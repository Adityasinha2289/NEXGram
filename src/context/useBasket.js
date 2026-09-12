import { useContext } from 'react';
import { BasketContext } from './BasketContextCore';

export function useBasket() {
  const context = useContext(BasketContext);
  if (context === undefined || context === null) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
}
