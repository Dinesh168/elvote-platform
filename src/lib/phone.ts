/** Indian mobile number: 10 digits starting 6–9 (TC-V3-9). */
export const isValidMobile = (s: string) => /^[6-9]\d{9}$/.test(s);
