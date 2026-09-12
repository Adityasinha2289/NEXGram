import { renderHook, act } from '@testing-library/react';
import { expect, test, beforeEach, vi } from 'vitest';
import { BasketProvider } from '../BasketContext';
import { useBasket } from '../useBasket';

const wrapper = ({ children }) => <BasketProvider>{children}</BasketProvider>;

const mockProduct = {
  id: 'prod-1',
  name: 'Test Product',
  price: 100,
  minimumOrderQuantity: 10,
  availableStock: 100,
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

test('initializes empty basket from localStorage', () => {
  const { result } = renderHook(() => useBasket(), { wrapper });
  expect(result.current.basket).toEqual({});
});

test('adds item to basket with minimum order quantity', () => {
  const { result } = renderHook(() => useBasket(), { wrapper });
  
  act(() => {
    result.current.addItem(mockProduct, 'dist-1', 'Test Distributor');
  });

  expect(result.current.basket['dist-1'].distributorName).toBe('Test Distributor');
  expect(result.current.basket['dist-1'].items['prod-1'].quantity).toBe(10);
});

test('updates item quantity', () => {
  const { result } = renderHook(() => useBasket(), { wrapper });
  
  act(() => {
    result.current.addItem(mockProduct, 'dist-1', 'Test Distributor');
  });
  
  act(() => {
    result.current.updateQuantity('prod-1', 20, 'dist-1');
  });

  expect(result.current.basket['dist-1'].items['prod-1'].quantity).toBe(20);
});

test('removes item and cleans up distributor group if empty', () => {
  const { result } = renderHook(() => useBasket(), { wrapper });
  
  act(() => {
    result.current.addItem(mockProduct, 'dist-1', 'Test Distributor');
  });
  
  expect(result.current.basket['dist-1']).toBeDefined();
  
  act(() => {
    result.current.removeItem('prod-1', 'dist-1');
  });

  expect(result.current.basket['dist-1']).toBeUndefined();
});

test('getDistributorDraft returns simple key-value object', () => {
  const { result } = renderHook(() => useBasket(), { wrapper });
  
  act(() => {
    result.current.addItem(mockProduct, 'dist-1', 'Test Distributor');
  });
  
  let draft;
  act(() => {
    draft = result.current.getDistributorDraft('dist-1');
  });

  expect(draft).toEqual({ 'prod-1': 10 });
});

test('clearBasket clears specific distributor or entire basket', () => {
  const { result } = renderHook(() => useBasket(), { wrapper });
  
  act(() => {
    result.current.addItem(mockProduct, 'dist-1', 'Test Distributor 1');
    result.current.addItem({ ...mockProduct, id: 'prod-2' }, 'dist-2', 'Test Distributor 2');
  });
  
  expect(Object.keys(result.current.basket)).toHaveLength(2);
  
  act(() => {
    result.current.clearBasket('dist-1');
  });
  
  expect(result.current.basket['dist-1']).toBeUndefined();
  expect(result.current.basket['dist-2']).toBeDefined();
  
  act(() => {
    result.current.clearBasket();
  });
  
  expect(Object.keys(result.current.basket)).toHaveLength(0);
});
