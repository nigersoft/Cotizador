/**
 * Constantes para tipos de impuesto
 * Centraliza los strings para evitar errores de tipeo y facilitar cambios futuros
 */

export const TIPOS_IMPUESTO = {
  AGREGADO: 'AGREGADO',
  INCLUIDO: 'INCLUIDO',
  SIN_IMPUESTO: 'SIN IMPUESTO'
};

/**
 * Mapeo de tipos de impuesto en UI (minúsculas) a BD (mayúsculas)
 */
export const MAPEO_UI_A_BD = {
  'agregado': TIPOS_IMPUESTO.AGREGADO,
  'incluido': TIPOS_IMPUESTO.INCLUIDO,
  'sin impuesto': TIPOS_IMPUESTO.SIN_IMPUESTO
};

/**
 * Mapeo de tipos de impuesto en BD (mayúsculas) a UI (minúsculas)
 */
export const MAPEO_BD_A_UI = {
  [TIPOS_IMPUESTO.AGREGADO]: 'agregado',
  [TIPOS_IMPUESTO.INCLUIDO]: 'incluido',
  [TIPOS_IMPUESTO.SIN_IMPUESTO]: 'sin impuesto'
};

/**
 * Valida si un tipo de impuesto es válido
 * @param {string} tipo - Tipo de impuesto a validar
 * @returns {boolean} - true si es válido
 */
export const esTipoImpuestoValido = (tipo) => {
  return Object.values(TIPOS_IMPUESTO).includes(tipo);
};

/**
 * Porcentaje de impuesto aplicado en Costa Rica
 */
export const PORCENTAJE_IMPUESTO = 0.13;
