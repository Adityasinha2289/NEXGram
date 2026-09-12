export const schemesApi = {
  getSchemes: async () => {
    return {
      schemes: [
        {
          id: 'pm-mudra',
          authority: 'Ministry of Finance, Govt of India',
          name: 'Pradhan Mantri Mudra Yojana (PMMY)',
          summary: 'Non-corporate, non-farm small/micro enterprises ko ₹10 Lakh tak ka collateral-free loan.',
          benefit: '₹10 Lakh tak collateral-free',
          verdict: 'Shayad eligible hain',
          verdictVariant: 'success',
          metCount: 3,
          totalCount: 4,
          checks: [
            { label: 'Business type', status: 'met', reason: 'Retail/trading business hai' },
            { label: 'Funding need', status: 'met', reason: '₹10 Lakh ke andar hai' },
            { label: 'Incorporation', status: 'met', reason: 'Non-corporate entity (Proprietorship)' },
            { label: 'Past defaults', status: 'self_declare', reason: 'Aapko bank ko batana hoga ki past defaults nahi hain' },
          ],
          documents: ['Aadhaar', 'PAN', 'Business Address Proof', 'Bank Statement', 'Quotations'],
          disclaimer: 'Yeh scheme banks and NBFCs ke through milti hai. Approval bank ke rules par depend karega.',
          applyAt: 'https://www.mudra.org.in/',
        },
        {
          id: 'standup-india',
          authority: 'Ministry of Finance, Govt of India',
          name: 'Stand-Up India Scheme',
          summary: 'SC/ST aur Women entrepreneurs ke liye ₹10 Lakh se ₹1 Crore tak ka loan greenfield enterprise ke liye.',
          benefit: '₹10L - ₹1Cr tak',
          verdict: 'Details check karein',
          verdictVariant: 'warning',
          metCount: 1,
          totalCount: 3,
          checks: [
            { label: 'Business phase', status: 'met', reason: 'Manufacturing/Services/Trading' },
            { label: 'Greenfield', status: 'self_declare', reason: 'Kya yeh aapka pehla venture hai?' },
            { label: 'Applicant type', status: 'self_declare', reason: 'SC/ST ya Woman entrepreneur hona zaroori hai' },
          ],
          documents: ['Caste Certificate (if applicable)', 'Identity Proof', 'Project Report'],
          disclaimer: 'Sirf first-time ventures (greenfield) ke liye available hai.',
          applyAt: 'https://www.standupmitra.in/',
        }
      ]
    };
  }
};
