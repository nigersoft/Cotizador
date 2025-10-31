/**
 * Custom Hook para manejar la lógica de impuestos en cotizaciones
 * Centraliza el estado y las acciones relacionadas con impuestos
 */

import { useState, useCallback } from 'react';
import { CalcularMontoImpuesto } from '../services/ModuloFunciones';
import { TIPOS_IMPUESTO, MAPEO_UI_A_BD, PORCENTAJE_IMPUESTO } from '../constants/TiposImpuesto';

export const useImpuestos = (obtenerCostoBase) => {
  const [impuestoAplicado, setImpuestoAplicado] = useState(null);
  const [montoImpuesto, setMontoImpuesto] = useState(0);
  const [costoSinImpuesto, setCostoSinImpuesto] = useState(0);
  const [costoTotal, setCostoTotal] = useState(0);

  /**
   * Aplica impuesto agregado (13% adicional al costo)
   */
  const agregarImpuesto = useCallback(() => {
    const costoBase = obtenerCostoBase();
    const { monto, impuesto } = CalcularMontoImpuesto(costoBase, TIPOS_IMPUESTO.AGREGADO);

    setImpuestoAplicado('agregado');
    setMontoImpuesto(impuesto);
    setCostoSinImpuesto(costoBase);
    setCostoTotal(monto);
  }, [obtenerCostoBase]);

  /**
   * Aplica impuesto incluido (costo ya tiene 13% incluido)
   */
  const incluirImpuesto = useCallback(() => {
    const costoConImpuesto = obtenerCostoBase();
    const { monto, impuesto } = CalcularMontoImpuesto(costoConImpuesto, TIPOS_IMPUESTO.INCLUIDO);

    const divisor = 1 + PORCENTAJE_IMPUESTO;
    const costoBase = costoConImpuesto / divisor;

    setImpuestoAplicado('incluido');
    setMontoImpuesto(impuesto);
    setCostoSinImpuesto(costoBase);
    setCostoTotal(monto);
  }, [obtenerCostoBase]);

  /**
   * Quita el impuesto aplicado
   */
  const resetearImpuesto = useCallback(() => {
    const costoBase = costoSinImpuesto > 0 ? costoSinImpuesto : obtenerCostoBase();

    setImpuestoAplicado(null);
    setMontoImpuesto(0);
    setCostoSinImpuesto(0);
    setCostoTotal(costoBase);
  }, [costoSinImpuesto, obtenerCostoBase]);

  /**
   * Carga datos de impuesto desde la BD (formato mayúsculas) y los convierte a formato UI (minúsculas)
   * @param {string} tipoImpuestoBD - Tipo de impuesto en formato BD (AGREGADO, INCLUIDO, SIN IMPUESTO)
   * @param {number} costoBase - Costo base sin impuesto
   */
  const cargarImpuesto = useCallback((tipoImpuestoBD, costoBase) => {
    if (!tipoImpuestoBD) {
      setCostoTotal(costoBase);
      resetearImpuesto();
      return;
    }

    const { monto, impuesto } = CalcularMontoImpuesto(costoBase, tipoImpuestoBD);

    // Mapear de BD (mayúsculas) a UI (minúsculas)
    const tipoUI = tipoImpuestoBD === TIPOS_IMPUESTO.AGREGADO ? 'agregado'
                 : tipoImpuestoBD === TIPOS_IMPUESTO.INCLUIDO ? 'incluido'
                 : null;

    setImpuestoAplicado(tipoUI);
    setMontoImpuesto(impuesto);

    if (tipoImpuestoBD === TIPOS_IMPUESTO.AGREGADO) {
      setCostoSinImpuesto(costoBase);
      setCostoTotal(monto);
    } else if (tipoImpuestoBD === TIPOS_IMPUESTO.INCLUIDO) {
      const divisor = 1 + PORCENTAJE_IMPUESTO;
      setCostoSinImpuesto(costoBase / divisor);
      setCostoTotal(monto);
    } else {
      setCostoSinImpuesto(0);
      setCostoTotal(costoBase);
    }
  }, [resetearImpuesto]);

  /**
   * Obtiene el tipo de impuesto en formato BD (mayúsculas) para guardar
   * @returns {string|null} - Tipo de impuesto en formato BD o null
   */
  const obtenerTipoImpuestoBD = useCallback(() => {
    if (!impuestoAplicado) return null;
    return MAPEO_UI_A_BD[impuestoAplicado] || null;
  }, [impuestoAplicado]);

  return {
    // Estado
    impuestoAplicado,
    montoImpuesto,
    costoSinImpuesto,
    costoTotal,

    // Acciones
    agregarImpuesto,
    incluirImpuesto,
    resetearImpuesto,
    cargarImpuesto,
    obtenerTipoImpuestoBD,

    // Setters directos (para casos especiales)
    setImpuestoAplicado,
    setMontoImpuesto,
    setCostoSinImpuesto,
    setCostoTotal,
  };
};
