/**
 * Age badge info for corner display
 */
export interface AgeBadge {
  label: string;
  className: string;
}

/**
 * Get age badge info for corner display
 * @param age - Player's age
 * @returns Badge label and CSS class
 */
export function getAgeBadge(age: number): AgeBadge {
  if (age <= 20) {
    return { label: 'Y', className: 'age-badge-young' };
  } else if (age <= 25) {
    return { label: 'D', className: 'age-badge-developing' };
  } else if (age <= 30) {
    return { label: 'P', className: 'age-badge-prime' };
  } else {
    return { label: 'V', className: 'age-badge-veteran' };
  }
}

/**
 * Get age category label for display
 * @param age - Player's age
 * @returns Human-readable age category
 */
export function getAgeCategory(age: number): string {
  if (age <= 20) {
    return 'Youth';
  } else if (age <= 25) {
    return 'Developing';
  } else if (age <= 30) {
    return 'Prime';
  } else {
    return 'Veteran';
  }
}
