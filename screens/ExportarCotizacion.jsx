// screens/ExportarCotizacion.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { getDBConnection, ExportarVentanasPorCotizacion } from '../ModuloDb/MDb';
import { formatearColones, CalcularMontoImpuesto, GetInfoImpuestos, GuardarImpuesto } from '../services/ModuloFunciones';
import { TIPOS_IMPUESTO } from '../constants/TiposImpuesto';

const ExportarCotizacion = ({ route, navigation }) => {
  const { cotizacion } = route.params;
  const [ventanas, setVentanas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [impuestoAplicado, setImpuestoAplicado] = useState(null); // 'agregado', 'incluido', o null
  const [montoImpuesto, setMontoImpuesto] = useState(0);
  const [costoSinImpuesto, setCostoSinImpuesto] = useState(0);
  const [costoTotal, setCostoTotal] = useState(cotizacion.Costo);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDBConnection();
      const datosVentanas = await ExportarVentanasPorCotizacion(db, cotizacion.Id);
      setVentanas(datosVentanas);

      // Cargar información de impuestos usando la nueva función
      const infoImpuestos = await GetInfoImpuestos(cotizacion.Id);
      const costoBase = infoImpuestos.costoTotal;
      const tipoImpuesto = infoImpuestos.tipoImpuesto;

      if (tipoImpuesto) {
        // Calcular monto e impuesto usando la nueva función
        const { monto, impuesto } = CalcularMontoImpuesto(costoBase, tipoImpuesto);

        setImpuestoAplicado(tipoImpuesto === TIPOS_IMPUESTO.AGREGADO ? 'agregado' : tipoImpuesto === TIPOS_IMPUESTO.INCLUIDO ? 'incluido' : null);
        setMontoImpuesto(impuesto);
        setCostoSinImpuesto(tipoImpuesto === TIPOS_IMPUESTO.AGREGADO ? costoBase : costoBase / 1.13);
        setCostoTotal(monto);
      } else {
        // Si no hay impuesto guardado, usar solo el costo base
        setImpuestoAplicado(null);
        setMontoImpuesto(0);
        setCostoSinImpuesto(0);
        setCostoTotal(costoBase);
      }

      // Resetear cambios pendientes al cargar datos desde la BD
      setCambiosPendientes(false);
    } catch (error) {
      console.error("Error al cargar ventanas", error);
      Alert.alert("Error", "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }, [cotizacion.Id]);

  // Recargar datos cada vez que la pantalla recibe el foco
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const agregarImpuesto = () => {
    // Usar el costoTotal actual del estado, que es el costo sin impuestos
    const costoBase = costoTotal;
    const { monto, impuesto } = CalcularMontoImpuesto(costoBase, 'AGREGADO');

    setImpuestoAplicado('agregado');
    setMontoImpuesto(impuesto);
    setCostoSinImpuesto(costoBase);
    setCostoTotal(monto);
    setCambiosPendientes(true);
  };

  const incluirImpuesto = () => {
    // Usar el costoTotal actual del estado, que es el costo sin impuestos
    const costoConImpuesto = costoTotal;
    const { monto, impuesto } = CalcularMontoImpuesto(costoConImpuesto, 'INCLUIDO');

    setImpuestoAplicado('incluido');
    setMontoImpuesto(impuesto);
    setCostoSinImpuesto(costoConImpuesto / 1.13);
    setCostoTotal(monto);
    setCambiosPendientes(true);
  };

  const resetearImpuesto = () => {
    // Si había impuestos aplicados, usar el costoSinImpuesto guardado
    // Si no había impuestos, usar el costo total actual
    const costoBase = costoSinImpuesto > 0 ? costoSinImpuesto : costoTotal;

    setImpuestoAplicado(null);
    setMontoImpuesto(0);
    setCostoSinImpuesto(0);
    setCostoTotal(costoBase);
    setCambiosPendientes(true);
  };

  const guardarCambios = async () => {
    try {
      // Guardar información de impuestos si hay un tipo aplicado
      if (impuestoAplicado) {
        // Mapear el tipo de impuesto al formato esperado en BD
        const tipoImpuestoBD = impuestoAplicado === 'agregado' ? TIPOS_IMPUESTO.AGREGADO
                               : impuestoAplicado === 'incluido' ? TIPOS_IMPUESTO.INCLUIDO
                               : TIPOS_IMPUESTO.SIN_IMPUESTO;
        await GuardarImpuesto(cotizacion.Id, tipoImpuestoBD);
      }

      setCambiosPendientes(false);
      Alert.alert("Éxito", "Los cambios de impuestos se han guardado correctamente");
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      Alert.alert("Error", "No se pudieron guardar los cambios");
    }
  };

  const generarHTML = () => {
    const ventanasHtml = ventanas.map(v => `
      <tr>
        <td>${v.Descripcion}</td>
        <td>${(v.Base / 100).toFixed(2)} cm x ${(v.Altura / 100).toFixed(2)} cm</td>
        <td>${v.Vidrio}</td>
        <td>₡${Number(v.Costo).toLocaleString('es-CR')}</td>
      </tr>
    `).join('');

    // Generar el desglose de impuestos si está aplicado y es mayor a 0
    let desgloseCostos = '';
    if (impuestoAplicado && montoImpuesto > 0) {
      if (impuestoAplicado === 'agregado' || impuestoAplicado === 'incluido') {
        desgloseCostos = `
          <div class="data"><span class="label">Subtotal:</span> ${formatearColones(costoSinImpuesto)}</div>
          <div class="data"><span class="label">Impuesto de ventas (13%):</span> ${formatearColones(montoImpuesto)}</div>
        `;
      }
    }

    return `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              background-color: #f9f9f9;
              color: #333;
            }
            .empresa-info {
              text-align: right;
              font-size: 14px;
              color: #2c3e50;
              font-weight: bold;
            }
            h1, h2 {
              text-align: center;
              color: #2c3e50;
            }
            .section {
              margin-bottom: 30px;
            }
            .info-container {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-cliente {
              flex: 1;
              padding-right: 20px;
            }
            .info-empresa {
              flex: 1;
              text-align: right;
              padding-left: 20px;
            }
            .label {
              font-weight: bold;
              margin-right: 8px;
            }
            .data {
              margin-bottom: 4px;
              line-height: 1.2;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              background-color: #fff;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              font-size: 14px;
            }
            th {
              background-color: #ecf0f1;
              color: #2c3e50;
            }
            tr:nth-child(even) {
              background-color: #f2f2f2;
            }
            .total {
              font-size: 18px;
              font-weight: bold;
              text-align: right;
              margin-top: 20px;
            }
            .costos-section {
              margin-top: 20px;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <h1>Detalle de Cotización</h1>
          <br><br>

          <div class="info-container">
            <div class="info-cliente">
              <div class="data"><span class="label">Cliente:</span> ${cotizacion.Nombre}</div>
              <div class="data"><span class="label">Teléfono:</span> ${cotizacion.Telefono}</div>
              <div class="data"><span class="label">Descripción:</span> ${cotizacion.Descripcion}</div>
            </div>
            <div class="info-empresa">
              <div class="data">Vidrios y Portones Araya</div>
              <div class="data">Teléfono: (506) 8490-9790</div>
            </div>
          </div>

          <h2>Detalle de Ventanas</h2>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Dimensiones</th>
                <th>Material</th>
                <th>Costo Unitario</th>
              </tr>
            </thead>
            <tbody>
              ${ventanasHtml}
            </tbody>
          </table>

          <div class="costos-section">
            ${desgloseCostos}
            <div class="data total">Costo Total: ${formatearColones(costoTotal)}</div>
          </div>
        </body>
      </html>
    `;
  };

  const exportarPDF = async () => {
    try {
      const htmlContent = generarHTML();

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Compartir no disponible", "No se puede compartir el archivo.");
      }
    } catch (error) {
      console.error("Error exportando PDF:", error);
      Alert.alert("Error", "No se pudo exportar la cotización.");
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text>Cargando cotización...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Vista Previa de la Cotización</Text>
          <ScrollView style={styles.previewBox}>
            <Text style={styles.sectionTitle}>Cliente:</Text>
            <Text style={styles.info}>{cotizacion.Nombre}</Text>

            <Text style={styles.sectionTitle}>Teléfono:</Text>
            <Text style={styles.info}>{cotizacion.Telefono}</Text>

            <Text style={styles.sectionTitle}>Descripción:</Text>
            <Text style={styles.info}>{cotizacion.Descripcion}</Text>

            <Text style={styles.detalleTitle}>Detalle de Ventanas:</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.cellHeader}>Descripción</Text>
              <Text style={styles.cell}>Dimensiones</Text>
              <Text style={styles.cell}>Material</Text>
              <Text style={styles.cell}>Costo</Text>
            </View>
            {ventanas.map((v, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.cellHeader}>{v.Descripcion}</Text>
                <Text style={styles.cell}>
                  {(v.Base / 100).toFixed(2)} x {(v.Altura / 100).toFixed(2)} m
                </Text>
                <Text style={styles.cell}>{v.Vidrio}</Text>
                <Text style={styles.cell}>₡{Number(v.Costo).toLocaleString('es-CR')}</Text>
              </View>
            ))}

            {/* Sección de impuestos - Solo mostrar si hay impuesto aplicado y es mayor a 0 */}
            {impuestoAplicado && montoImpuesto > 0 && (
              <View style={styles.impuestoSection}>
                <View style={styles.impuestoRow}>
                  <Text style={styles.impuestoLabel}>Subtotal:</Text>
                  <Text style={styles.impuestoValue}>{formatearColones(costoSinImpuesto)}</Text>
                </View>
                <View style={styles.impuestoRow}>
                  <Text style={styles.impuestoLabel}>Impuesto de ventas (13%):</Text>
                  <Text style={styles.impuestoValue}>{formatearColones(montoImpuesto)}</Text>
                </View>
              </View>
            )}

            {/* Costo Total debajo de la tabla */}
            <View style={styles.costoTotalSection}>
              <Text style={styles.sectionTitle}>Costo Total:</Text>
              <Text style={styles.total}>{formatearColones(costoTotal)}</Text>

              {/* Botones de impuesto */}
              <View style={styles.botonesImpuesto}>
                {!impuestoAplicado ? (
                  <>
                    <Button
                      mode="outlined"
                      compact
                      onPress={agregarImpuesto}
                      style={styles.botonImpuesto}
                      labelStyle={styles.botonImpuestoLabel}
                    >
                      + Agregar impuesto
                    </Button>
                    <Button
                      mode="outlined"
                      compact
                      onPress={incluirImpuesto}
                      style={styles.botonImpuesto}
                      labelStyle={styles.botonImpuestoLabel}
                    >
                      Incluir impuesto
                    </Button>
                  </>
                ) : (
                  <Button
                    mode="outlined"
                    compact
                    onPress={resetearImpuesto}
                    style={styles.botonImpuesto}
                    labelStyle={styles.botonImpuestoLabel}
                  >
                    Quitar impuesto
                  </Button>
                )}
                {cambiosPendientes && (
                  <Button
                    mode="outlined"
                    compact
                    onPress={guardarCambios}
                    style={styles.botonGuardar}
                    labelStyle={styles.botonGuardarLabel}
                  >
                    Guardar
                  </Button>
                )}
              </View>
            </View>
          </ScrollView>

          <Button
            mode="contained"
            style={styles.exportButton}
            onPress={exportarPDF}
          >
            Generar y Compartir PDF
          </Button>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  previewBox: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 10,
    color: '#2c3e50',
  },
  info: {
    fontSize: 15,
    color: '#34495e',
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1abc9c',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ecf0f1',
    padding: 6,
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 4,
    color: '#2c3e50',
  },
  cellHeader: {
    flex: 2,
    fontSize: 13,
    paddingHorizontal: 4,
    color: '#2c3e50',
  },
  detalleTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 20,
    color: '#2c3e50',
  },
  exportButton: {
    marginTop: 20,
  },
  impuestoSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#bdc3c7',
  },
  impuestoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  impuestoLabel: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
  },
  impuestoValue: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: 'bold',
  },
  costoTotalSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#1abc9c',
  },
  botonesImpuesto: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  botonImpuesto: {
    marginRight: 8,
    marginBottom: 8,
    borderColor: '#3498db',
  },
  botonImpuestoLabel: {
    fontSize: 11,
    textTransform: 'none',
  },
  botonGuardar: {
    marginRight: 8,
    marginBottom: 8,
    borderColor: '#ff9800',
  },
  botonGuardarLabel: {
    fontSize: 11,
    textTransform: 'none',
    color: '#f44336',
  },
});

export default ExportarCotizacion;
