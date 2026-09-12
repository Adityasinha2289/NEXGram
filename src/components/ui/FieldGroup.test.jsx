import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './FieldGroup';

/**
 * The multiselect drives a retailer's categories, which is what their demand
 * signal is built from, so toggling has to be exact.
 */
describe('Field multiselect', () => {
  const field = {
    key: 'categories',
    label: 'Categories',
    type: 'multiselect',
    options: ['Dairy', 'Staples', 'Snacks'],
  };

  it('adds a value on first press', async () => {
    const onChange = vi.fn();
    render(<Field field={field} value={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Dairy' }));
    expect(onChange).toHaveBeenCalledWith('categories', ['Dairy']);
  });

  it('removes a value on second press without touching the others', async () => {
    const onChange = vi.fn();
    render(<Field field={field} value={['Dairy', 'Staples']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /Dairy/ }));
    expect(onChange).toHaveBeenCalledWith('categories', ['Staples']);
  });

  it('marks selection for assistive technology, not just colour', () => {
    render(<Field field={field} value={['Dairy']} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Dairy/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Staples' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('treats a missing value as nothing selected', () => {
    render(<Field field={field} value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Dairy' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports options that carry a separate label and value', async () => {
    const onChange = vi.fn();
    render(
      <Field
        field={{ ...field, options: [{ value: 'own', label: 'Apni delivery' }] }}
        value={[]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Apni delivery' }));
    expect(onChange).toHaveBeenCalledWith('categories', ['own']);
  });
})
