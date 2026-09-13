import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Schemes } from './Schemes';
import { schemesApi } from '../../services/api/schemesApi';

/**
 * This screen rendered a hardcoded two-scheme list, so every shop saw the same
 * verdict regardless of their profile. It now renders whatever /schemes matched
 * — and has to cope with `applyAt` being prose rather than a URL, which is what
 * it is for the schemes applied for in person.
 *
 * The rows below are the endpoint's real shape.
 */
const PORTAL_SCHEME = {
  id: 'udyam',
  name: 'Udyam Registration (MSME)',
  authority: 'Ministry of MSME',
  summary: 'Free online registration that unlocks priority-sector lending.',
  benefit: 'Free registration',
  documents: ['Aadhaar', 'PAN'],
  source: 'https://udyamregistration.gov.in/',
  applyAt: 'https://udyamregistration.gov.in/',
  checks: [{ label: 'Operating business', status: 'met', reason: 'Business name diya hua hai.' }],
  metCount: 1,
  totalCount: 1,
  verdict: 'Criteria poore lagte hain',
  verdictVariant: 'success',
  disclaimer: 'Final eligibility official portal decide karta hai.',
};

const IN_PERSON_SCHEME = {
  ...PORTAL_SCHEME,
  id: 'pmmy_shishu',
  name: 'PM MUDRA Yojana (Shishu)',
  authority: 'Govt. of India / MUDRA',
  source: 'https://www.mudra.org.in/',
  // Prose, not a URL — using it as an href produced a dead link.
  applyAt: 'Nearest bank branch or https://www.udyamimitra.in/',
};

describe('Schemes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the schemes the server matched', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({
      role: 'retailer',
      schemes: [PORTAL_SCHEME, IN_PERSON_SCHEME],
      totalCatalogued: 5,
    });

    render(<Schemes />);

    expect(await screen.findByText('Udyam Registration (MSME)')).toBeInTheDocument();
    expect(screen.getByText('PM MUDRA Yojana (Shishu)')).toBeInTheDocument();
  });

  it('links straight to the portal when applyAt is a URL', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [PORTAL_SCHEME] });

    render(<Schemes />);

    const link = await screen.findByRole('link', { name: /Official portal par jayein/ });
    expect(link).toHaveAttribute('href', 'https://udyamregistration.gov.in/');
  });

  it('lifts the URL out of applyAt when it is written as a sentence', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [IN_PERSON_SCHEME] });

    render(<Schemes />);

    const link = await screen.findByRole('link', { name: /Official portal par jayein/ });
    expect(link).toHaveAttribute('href', 'https://www.udyamimitra.in/');
  });

  it('keeps the rest of that sentence as instructions', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [IN_PERSON_SCHEME] });

    render(<Schemes />);

    expect(await screen.findByText(/Nearest bank branch/)).toBeInTheDocument();
  });

  it('shows the criteria the profile was scored against', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [PORTAL_SCHEME] });

    render(<Schemes />);

    expect(await screen.findByText('Operating business')).toBeInTheDocument();
    expect(screen.getByText('Business name diya hua hai.')).toBeInTheDocument();
  });

  it('surfaces a failed request rather than looking like no matches', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockRejectedValue(new Error('Not authenticated'));

    render(<Schemes />);

    expect(await screen.findByText('Not authenticated')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matched', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [] });

    render(<Schemes />);

    expect(await screen.findByText('Koi scheme match nahi hui')).toBeInTheDocument();
  });
});
