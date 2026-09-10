/**
 * This file defines the explicit domain models for the Rural B2B MVP.
 * These are factory functions / schemas that help normalize data structures
 * across the frontend application.
 */

export const Models = {
  createRetailerProfile: (data = {}) => ({
    id: data.id || `RET_${Date.now()}`,
    name: data.name || '',
    mobile: data.mobile || '',
    location: {
      area: data.location?.area || '',
      block: data.location?.block || '',
      district: data.location?.district || '',
      state: data.location?.state || '',
      pin: data.location?.pin || ''
    },
    businessType: data.businessType || '',
    businessAge: data.businessAge || '',
    monthlySales: data.monthlySales || '',
    monthlyPurchaseRange: data.monthlyPurchaseRange || '',
    investmentBudget: data.investmentBudget || '',
    demandedCategories: data.demandedCategories || [],
    unmetNeeds: data.unmetNeeds || '',
    requirements: data.requirements || '',
    purchasingFrequency: data.purchasingFrequency || '',
    existingSupplierType: data.existingSupplierType || ''
  }),

  createDistributorProfile: (data = {}) => ({
    id: data.id || `DIST_${Date.now()}`,
    businessName: data.businessName || '',
    contactName: data.contactName || '',
    mobile: data.mobile || '',
    location: {
      area: data.location?.area || '',
      block: data.location?.block || '',
      district: data.location?.district || '',
      state: data.location?.state || '',
      pin: data.location?.pin || ''
    },
    businessCategory: data.businessCategory || '',
    serviceRadius: data.serviceRadius || '',
    productCategories: data.productCategories || [],
    deliveryCapabilities: data.deliveryCapabilities || '',
    minimumOrderRange: data.minimumOrderRange || '',
    stockCapacity: data.stockCapacity || '',
    retailerCoverage: data.retailerCoverage || ''
  }),

  createDistributorProduct: (data = {}) => ({
    id: data.id || `PROD_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    distributorId: data.distributorId || '',
    name: data.name || '',
    category: data.category || '',
    unit: data.unit || 'pieces',
    price: data.price || 0,
    minimumOrderQuantity: data.minimumOrderQuantity || 1,
    availableStock: data.availableStock || 0,
    stockStatus: data.stockStatus || 'Available',
    deliveryTime: data.deliveryTime || '1 day'
  }),

  createOrderRequest: (data = {}) => ({
    id: data.id || `ORD_${Date.now()}`,
    retailerId: data.retailerId || '',
    retailerName: data.retailerName || '',
    distributorId: data.distributorId || '',
    distributorName: data.distributorName || '',
    items: data.items || [], // Array of product objects
    estimatedTotal: data.estimatedTotal || 0,
    status: data.status || 'Pending Confirmation',
    createdAt: data.createdAt || new Date().toISOString()
  })
};
