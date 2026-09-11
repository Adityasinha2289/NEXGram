import { fetchApi } from './client';

export const categoriesApi = {
  getCategories: () => fetchApi('/categories'),
};
