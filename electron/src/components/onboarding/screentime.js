/*
 * The screentime question and the arithmetic the next step does with it.
 * Kept out of the step components so both can import it.
 */

/* `hours` is the middle of each bracket, which is what the next step counts. */
export const OPTIONS = [
  { id: '0-2', label: '0-2 Hours', hours: 1, x: 456, y: 277 },
  { id: '6-8', label: '6-8 Hours', hours: 7, x: 1171, y: 277 },
  { id: '2-4', label: '2-4 Hours', hours: 3, x: 456, y: 492 },
  { id: '8-10', label: '8-10 Hours', hours: 9, x: 1171, y: 492 },
  { id: '4-6', label: '4-6 Hours', hours: 5, x: 456, y: 707 },
  { id: '10+', label: '10 > Hours', hours: 11, x: 1171, y: 707 },
];

/** Hours a day for a bracket id, defaulting to the middle of the range. */
export const hoursForBracket = (id) => OPTIONS.find((o) => o.id === id)?.hours ?? 5;

/*
 * Hours a day, over a 60-year stretch of adult life, as whole years. ZenTap's
 * claim is that it gives back two thirds of that.
 */
const HORIZON_YEARS = 60;
const SAVED_SHARE = 2 / 3;

export const yearsOnComputer = (hoursPerDay) =>
  Math.max(1, Math.round((hoursPerDay * HORIZON_YEARS) / 24));

export const yearsSaved = (spendYears) => Math.max(1, Math.round(spendYears * SAVED_SHARE));
