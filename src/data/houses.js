// src/data/houses.js
//
// All valid house numbers for every lane in Elmina Green Three.
// Centralised here so validation logic (in services/firestore.js)
// and the UI dropdown (in ui/picks.js) both use the SAME data.
//
// HELPER FUNCTIONS:
//   range(a, b)      → [a, a+1, ..., b]
//   even(a, b)       → [a, a+2, ..., b]  (even numbers only)
//   odd(a, b)        → [a, a+2, ..., b]  (odd numbers only)
//   excl(arr, ...ex) → arr without the excluded numbers

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const even  = (a, b) => range(a, b).filter(n => n % 2 === 0);
const odd   = (a, b) => range(a, b).filter(n => n % 2 !== 0);
const excl  = (arr, ...ex) => arr.filter(n => !ex.includes(n));

// Each key is the lane identifier used as the Firestore document prefix.
// Format: L{lane}-N{number} e.g. "L73-N35"
export const VALID_HOUSES = Object.freeze({
  'L68' : excl(range(1, 45), 44),
  'L68A': excl(range(1, 44), 39, 41, 43),
  'L68B': even(2, 38),
  'L69' : excl(range(1, 58), 53, 55, 57),
  'L69A': odd(1, 53),
  'L70' : excl(range(1, 46), 35, 43),
  'L71' : excl(range(1, 56), 55),
  'L72' : excl(range(1, 50), 45, 47, 49),
  'L73' : excl(range(1, 58), 57),
  'L74' : odd(1, 45),
});

// All lane keys as a sorted array — used to populate the dropdown.
export const LANES = Object.keys(VALID_HOUSES);

// Validate a lane + house number combination.
// Returns the composite house ID string, or null if invalid.
export const validateHouse = (lane, num) => {
  const number = parseInt(num, 10);
  if (!lane || !number) return null;
  const valid = VALID_HOUSES[lane];
  if (!valid || !valid.includes(number)) return null;
  return `${lane}-N${number}`;
};

// Total count — useful for admin dashboards.
export const totalHouses = () =>
  Object.values(VALID_HOUSES).reduce((sum, arr) => sum + arr.length, 0);
