import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Loans } from './Loans';
import { loansApi } from '../../services/api/loansApi';
import { schemesApi } from '../../services/api/schemesApi';

const SHISHU = {
  id: 'pmmy_shishu',
  name: 'PM MUDRA Yojana (Shishu)',
  authority: 'Govt. of India / MUDRA',
  summary: 'Collateral-free working capital loan up to Rs 50,000.',
  benefit: 'Up to Rs 50,000',
  minAmount: 5000,
  maxAmount: 50000,
  isLoan: true,
  documents: ['Aadhaar', 'PAN'],
  source: 'https://www.mudra.org.in/',
  applyAt: 'Nearest bank branch or https://www.udyamimitra.in/',
  checks: [{ label: 'Non-farm micro enterprise', status: 'met', reason: 'Kirana MSME micro hai.' }],
  metCount: 1,
  totalCount: 1,
  verdict: 'Criteria poore lagte hain',
  verdictVariant: 'success',
  disclaimer: 'Final eligibility official portal decide karta hai.',
  coversAmount: true,
  amountNote: null,
};

const STANDUP = {
  ...SHISHU,
  id: 'standup_india',
  name: 'Stand-Up India',
  minAmount: 1000000,
  maxAmount: 10000000,
  applyAt: 'https://www.standupmitra.in/',
  coversAmount: false,
  amountNote: 'Yeh scheme Rs 10,00,000 se shuru hoti hai.',
};

const UDYAM = {
  ...SHISHU,
  id: 'udyam',
  name: 'Udyam Registration (MSME)',
  minAmount: null,
  maxAmount: null,
  isLoan: false,
  applyAt: 'https://udyamregistration.gov.in/',
  coversAmount: false,
  amountNote: 'Yeh loan nahi, registration hai.',
};

const APPLICATION = {
  id: 'app-1',
  reference: 'NXL-202609-16393',
  schemeId: 'pmmy_shishu',
  schemeName: 'PM MUDRA Yojana (Shishu)',
  amount: 30000,
  tenureMonths: 24,
  status: 'submitted',
  statusLabel: 'Bank ko bheja gaya',
  criteriaAtSubmission: [],
  estimate: { monthlyInstalment: 1384.35, totalRepayable: 33224, totalInterest: 3224 },
  canWithdraw: true,
  submittedAt: '2026-09-13T04:00:00',
  decidedAt: null,
  decisionNote: null,
};

const noApplications = () =>
  vi.spyOn(loansApi, 'getApplications').mockResolvedValue({ items: [] });

describe('Loans', () => {
  it('lists the schemes matched against the profile', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU, STANDUP] });
    noApplications();

    render(<Loans />);

    expect(await screen.findByText('PM MUDRA Yojana (Shishu)')).toBeInTheDocument();
    expect(screen.getByText('Stand-Up India')).toBeInTheDocument();
  });

  it('says why a scheme cannot cover the amount rather than hiding it', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU, STANDUP] });
    noApplications();

    render(<Loans />);

    expect(await screen.findByText('Yeh scheme Rs 10,00,000 se shuru hoti hai.')).toBeInTheDocument();
  });

  it('asks the server again when an amount is typed', async () => {
    const spy = vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU] });
    noApplications();
    const user = userEvent.setup();

    render(<Loans />);
    await screen.findByText('PM MUDRA Yojana (Shishu)');
    await user.type(screen.getByLabelText('Kitne ka loan chahiye?'), '30000');

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ amount: 30000 }));
  });

  it('never offers to apply for something that is not a loan', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [UDYAM] });
    noApplications();
    const user = userEvent.setup();

    render(<Loans />);
    await user.click(await screen.findByRole('button', { name: /Udyam Registration/ }));

    expect(
      screen.queryByRole('button', { name: /NEXGram se apply karein/ }),
    ).not.toBeInTheDocument();
  });

  it('lifts the portal URL out of a prose applyAt', async () => {
    // "Nearest bank branch or https://..." as an href is a dead link.
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU] });
    noApplications();
    const user = userEvent.setup();

    render(<Loans />);
    await user.click(await screen.findByRole('button', { name: /PM MUDRA Yojana/ }));

    expect(screen.getByRole('link', { name: /Official portal/ }))
      .toHaveAttribute('href', 'https://www.udyamimitra.in/');
    expect(screen.getByText(/Nearest bank branch/)).toBeInTheDocument();
  });

  it('shows an existing application above the scheme list', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU] });
    vi.spyOn(loansApi, 'getApplications').mockResolvedValue({ items: [APPLICATION] });

    render(<Loans />);

    expect(await screen.findByText('Aapki applications')).toBeInTheDocument();
    expect(screen.getByText(/NXL-202609-16393/)).toBeInTheDocument();
    expect(screen.getByText(/EMI ~₹1,384/)).toBeInTheDocument();
  });

  it('will not offer a duplicate apply for a live application', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU] });
    vi.spyOn(loansApi, 'getApplications').mockResolvedValue({ items: [APPLICATION] });
    const user = userEvent.setup();

    render(<Loans />);
    await user.click(await screen.findByRole('button', { name: /PM MUDRA Yojana/ }));

    expect(screen.getByRole('button', { name: 'Application chal rahi hai' })).toBeDisabled();
  });

  it('withdraws an application', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU] });
    vi.spyOn(loansApi, 'getApplications').mockResolvedValue({ items: [APPLICATION] });
    const spy = vi.spyOn(loansApi, 'withdraw').mockResolvedValue({});
    const user = userEvent.setup();

    render(<Loans />);
    await user.click(await screen.findByRole('button', { name: 'Wapas lein' }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('app-1'));
  });

  it('never claims eligibility', async () => {
    vi.spyOn(schemesApi, 'getSchemes').mockResolvedValue({ schemes: [SHISHU] });
    noApplications();

    render(<Loans />);

    expect(await screen.findByText(/NEXGram loan nahi deta/)).toBeInTheDocument();
  });
});
