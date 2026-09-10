import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';

const CATEGORIES = ['Dairy', 'Staples', 'Snacks', 'Beverages', 'Spices', 'Personal Care', 'Household', 'Agriculture / Rural Products', 'Other'];
const UNITS = ['kg', 'litre', 'piece', 'packet', 'box', 'crate', 'carton'];
const STATUSES = ['Available', 'Low Stock', 'Out of Stock'];

import { APP_CONSTANTS } from '../../../../constants/appConstants';

export function ProductForm({ initialData = null, onSubmit, onCancel }) {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    name: '',
    category: 'Dairy',
    price: '',
    unit: 'packet',
    minimumOrderQuantity: '',
    availableStock: '',
    deliveryTime: '1 day'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || 'Dairy',
        price: initialData.price || '',
        unit: initialData.unit || 'packet',
        minimumOrderQuantity: initialData.minimumOrderQuantity || '',
        availableStock: initialData.availableStock || '',
        deliveryTime: initialData.deliveryTime || '1 day'
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product ka naam enter karein';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Sahi price enter karein';
    if (!formData.minimumOrderQuantity || formData.minimumOrderQuantity <= 0) newErrors.minimumOrderQuantity = 'MOQ enter karein';
    if (formData.availableStock === '' || formData.availableStock < 0) newErrors.availableStock = 'Stock quantity enter karein';
    if (!formData.deliveryTime.trim()) newErrors.deliveryTime = 'Delivery time enter karein';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const stock = Number(formData.availableStock);
      let status = APP_CONSTANTS.STOCK_STATUSES.AVAILABLE;
      if (stock === APP_CONSTANTS.STOCK_RULES.OUT_OF_STOCK_MAX) {
        status = APP_CONSTANTS.STOCK_STATUSES.OUT_OF_STOCK;
      } else if (stock <= APP_CONSTANTS.STOCK_RULES.LOW_STOCK_MAX) {
        status = APP_CONSTANTS.STOCK_STATUSES.LOW_STOCK;
      }

      onSubmit({
        ...formData,
        price: Number(formData.price),
        minimumOrderQuantity: Number(formData.minimumOrderQuantity),
        availableStock: stock,
        stockStatus: status
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center animate-fade-in pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 pointer-events-auto" 
        onClick={onCancel}
      />
      
      {/* Form Container */}
      <div className="bg-surface w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl flex flex-col pointer-events-auto shadow-lg relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-20">
          <h2 className="font-bold text-lg text-text-primary">
            {isEditing ? 'Edit Product' : 'Naya Product Add Karein'}
          </h2>
          <button onClick={onCancel} className="p-2 text-text-muted hover:bg-surface-muted rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 flex flex-col gap-4">
          <Input 
            label="Product Name" 
            placeholder="e.g. Paneer" 
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-text-primary ml-1">Category</label>
            <select 
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {APP_CONSTANTS.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Price (₹)" 
              type="number" 
              placeholder="0" 
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              error={errors.price}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-text-primary ml-1">Unit</label>
              <select 
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
              >
                {APP_CONSTANTS.UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <Input 
            label="Minimum Order Quantity (MOQ)" 
            type="number" 
            placeholder="0" 
            value={formData.minimumOrderQuantity}
            onChange={(e) => handleChange('minimumOrderQuantity', e.target.value)}
            error={errors.minimumOrderQuantity}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Available Stock" 
              type="number" 
              placeholder="0" 
              value={formData.availableStock}
              onChange={(e) => handleChange('availableStock', e.target.value)}
              error={errors.availableStock}
            />
            <div className="flex flex-col gap-1.5 justify-center mt-6">
              <p className="text-xs text-text-muted italic">
                Status is calculated automatically based on stock quantity.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-text-primary ml-1">Delivery Time</label>
            <select 
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
              value={formData.deliveryTime}
              onChange={(e) => handleChange('deliveryTime', e.target.value)}
            >
              {APP_CONSTANTS.DELIVERY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border sticky bottom-0 bg-surface z-20 pb-safe">
          <Button fullWidth onClick={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Product Add Karo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
