
/**
 * SRI Ecuador Utilities
 */

export const generateAccessKey = (
  date: string, // ddmmyyyy
  type: string, // 01 for Invoice
  ruc: string,
  environment: string, // 1 for Test, 2 for Prod
  establishment: string, // 001
  emissionPoint: string, // 001
  sequential: string, // 9 digits
  numericCode: string = '12345678', // 8 digits
  emissionType: string = '1' // 1 for Normal
): string => {
  // Format: ddmmyyyy + type + ruc + environment + establishment + point + sequential + numeric + emissionType
  let key = date.replace(/\//g, '') + type + ruc + environment + establishment + emissionPoint + sequential.padStart(9, '0') + numericCode + emissionType;
  
  const verifier = calculateModulo11(key);
  return key + verifier;
};

const calculateModulo11 = (key: string): number => {
  let factor = 2;
  let sum = 0;
  
  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  
  const checkDigit = 11 - (sum % 11);
  if (checkDigit === 11) return 0;
  if (checkDigit === 10) return 1;
  return checkDigit;
};
