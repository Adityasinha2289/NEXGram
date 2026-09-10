import { useState, useMemo } from 'react';

const INITIAL_CATALOGUE = [
  {
    id: 'prod_1',
    name: 'Amul Taaza Milk (1L)',
    category: 'Dairy',
    unit: 'packet',
    price: 68,
    minimumOrderQuantity: 10,
    availableStock: 50,
    stockStatus: 'Available',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_2',
    name: 'Amul Butter (500g)',
    category: 'Dairy',
    unit: 'piece',
    price: 250,
    minimumOrderQuantity: 5,
    availableStock: 20,
    stockStatus: 'Available',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_3',
    name: 'Aashirvaad Atta (5kg)',
    category: 'Staples',
    unit: 'packet',
    price: 220,
    minimumOrderQuantity: 10,
    availableStock: 100,
    stockStatus: 'Available',
    deliveryTime: '2 days'
  },
  {
    id: 'prod_4',
    name: 'Tata Salt (1kg)',
    category: 'Staples',
    unit: 'packet',
    price: 25,
    minimumOrderQuantity: 50,
    availableStock: 200,
    stockStatus: 'Available',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_5',
    name: 'Parle-G (800g)',
    category: 'Snacks',
    unit: 'packet',
    price: 80,
    minimumOrderQuantity: 20,
    availableStock: 50,
    stockStatus: 'Available',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_6',
    name: 'Haldiram Bhujia (400g)',
    category: 'Snacks',
    unit: 'packet',
    price: 95,
    minimumOrderQuantity: 10,
    availableStock: 30,
    stockStatus: 'Available',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_7',
    name: 'Coca-Cola (2L)',
    category: 'Beverages',
    unit: 'bottle',
    price: 90,
    minimumOrderQuantity: 12,
    availableStock: 5,
    stockStatus: 'Low Stock',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_8',
    name: 'Taj Mahal Tea (500g)',
    category: 'Beverages',
    unit: 'packet',
    price: 320,
    minimumOrderQuantity: 5,
    availableStock: 0,
    stockStatus: 'Out of Stock',
    deliveryTime: '3 days'
  },
  {
    id: 'prod_9',
    name: 'MDH Garam Masala (100g)',
    category: 'Spices',
    unit: 'box',
    price: 85,
    minimumOrderQuantity: 20,
    availableStock: 150,
    stockStatus: 'Available',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_10',
    name: 'Everest Turmeric (500g)',
    category: 'Spices',
    unit: 'packet',
    price: 130,
    minimumOrderQuantity: 10,
    availableStock: 80,
    stockStatus: 'Available',
    deliveryTime: '1 day'
  },
  {
    id: 'prod_11',
    name: 'Lifebuoy Soap (Pack of 4)',
    category: 'Personal Care',
    unit: 'piece',
    price: 110,
    minimumOrderQuantity: 24,
    availableStock: 60,
    stockStatus: 'Available',
    deliveryTime: '2 days'
  },
  {
    id: 'prod_12',
    name: 'Surf Excel Quick Wash (1kg)',
    category: 'Household',
    unit: 'packet',
    price: 180,
    minimumOrderQuantity: 15,
    availableStock: 40,
    stockStatus: 'Available',
    deliveryTime: '2 days'
  }
];

export function useCatalogue() {
  const [products, setProducts] = useState(INITIAL_CATALOGUE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Derived state
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const summary = useMemo(() => {
    return {
      totalProducts: products.length,
      totalCategories: new Set(products.map(p => p.category)).size,
      lowestMOQ: products.length > 0 ? Math.min(...products.map(p => p.minimumOrderQuantity * p.price)) : 0
    };
  }, [products]);

  // Actions
  const addProduct = (product) => {
    const newProduct = {
      ...product,
      id: `prod_${Date.now()}`
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (id, updatedFields) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };

  const removeProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return {
    products: filteredProducts,
    allProductsCount: products.length,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    summary,
    addProduct,
    updateProduct,
    removeProduct
  };
}
