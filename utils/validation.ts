
/**
 * Validaciones según normativa del SRI Ecuador
 * Basado en: Ficha Técnica Comprobantes Electrónicos v2.21
 */

/**
 * Valida RUC ecuatoriano (13 dígitos)
 */
export const validateRUC = (ruc: string): { valid: boolean; message?: string } => {
  if (!ruc || ruc.length !== 13) {
    return { valid: false, message: 'El RUC debe tener 13 dígitos' };
  }

  if (!/^\d+$/.test(ruc)) {
    return { valid: false, message: 'El RUC solo debe contener números' };
  }

  const provincia = parseInt(ruc.substring(0, 2));
  if (provincia < 1 || provincia > 24) {
    return { valid: false, message: 'Código de provincia inválido' };
  }

  const tercerDigito = parseInt(ruc.charAt(2));
  if (tercerDigito < 6) {
    if (!validateEcuadorianId(ruc.substring(0, 10))) {
      return { valid: false, message: 'Cédula dentro del RUC inválida' };
    }
  } else if (tercerDigito === 6) {
    // Sector Público
    if (!validateModulo11Special(ruc.substring(0, 9), [3, 2, 7, 6, 5, 4, 3, 2], parseInt(ruc.charAt(8)))) {
      return { valid: false, message: 'RUC de sector público inválido' };
    }
  } else if (tercerDigito === 9) {
    // Sociedad Privada
    if (!validateModulo11Special(ruc.substring(0, 10), [4, 3, 2, 7, 6, 5, 4, 3, 2], parseInt(ruc.charAt(9)))) {
      return { valid: false, message: 'RUC de sociedad privada inválido' };
    }
  }

  const establecimiento = ruc.substring(10);
  if (establecimiento === '000') {
    return { valid: false, message: 'Código de establecimiento no puede ser 000' };
  }

  return { valid: true };
};

const validateModulo11Special = (numero: string, coef: number[], checkDigit: number): boolean => {
  let suma = 0;
  for (let i = 0; i < coef.length; i++) {
    suma += parseInt(numero.charAt(i)) * coef[i];
  }
  const residuo = suma % 11;
  const resultado = residuo === 0 ? 0 : 11 - residuo;
  return resultado === checkDigit;
};

/**
 * Valida clave de acceso (49 dígitos)
 */
export const validateAccessKey = (accessKey: string): { valid: boolean; message?: string } => {
  if (!accessKey || accessKey.length !== 49) {
    return { valid: false, message: 'La clave de acceso debe tener 49 dígitos' };
  }

  if (!/^\d+$/.test(accessKey)) {
    return { valid: false, message: 'La clave de acceso solo debe contener números' };
  }

  const checkDigit = parseInt(accessKey.charAt(48));
  const base = accessKey.substring(0, 48);

  let factor = 2;
  let suma = 0;

  for (let i = base.length - 1; i >= 0; i--) {
    suma += parseInt(base.charAt(i)) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const resultado = 11 - (suma % 11);
  const esperado = resultado === 11 ? 0 : resultado === 10 ? 1 : resultado;

  if (checkDigit !== esperado) {
    return { valid: false, message: 'Dígito verificador inválido' };
  }

  return { valid: true };
};

/**
 * Valida email
 */
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Utilidades para validación de documentos de identidad en Ecuador
 */

export const validateEcuadorianId = (id: string): boolean => {
  if (!id || (id.length !== 10 && id.length !== 13)) return false;

  // Si es RUC de sociedad pública o extranjera, la lógica es distinta, 
  // pero para el 90% de casos (Persona Natural/Jurídica Privada):
  const digits = id.substring(0, 10).split('').map(Number);
  const province = digits[0] * 10 + digits[1];

  if (province < 1 || province > 24) return false;

  const lastDigit = digits[9];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let val = digits[i];
    if (i % 2 === 0) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    sum += val;
  }

  const verifier = (sum % 10 === 0) ? 0 : 10 - (sum % 10);
  
  const isBasicValid = verifier === lastDigit;
  
  if (id.length === 13) {
    return isBasicValid && id.endsWith('001');
  }
  
  return isBasicValid;
};

export const getEntityAvatarColor = (name: string) => {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-purple-500', 'bg-slate-700'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};
