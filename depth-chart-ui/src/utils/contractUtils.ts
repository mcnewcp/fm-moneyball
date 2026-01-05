/**
 * Contract type badge info for corner display
 */
export interface ContractBadge {
  label: string;
  className: string;
  fullText: string;
}

/**
 * Get contract type badge info for corner display
 * Only returns badge for Trial and Loan (not Full Contract)
 * @param type - Player's contract type
 * @returns Badge info or null if Full Contract
 */
export function getContractBadge(type: string): ContractBadge | null {
  if (type === 'Trial') {
    return { label: 'T', className: 'contract-badge-trial', fullText: 'Trial' };
  } else if (type === 'Loan') {
    return { label: 'L', className: 'contract-badge-loan', fullText: 'Loan' };
  }
  return null; // Full Contract - no badge
}
