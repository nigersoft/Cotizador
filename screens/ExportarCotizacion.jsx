// screens/ExportarCotizacion.jsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { getDBConnection, ExportarVentanasPorCotizacion } from '../ModuloDb/MDb';
import { formatearColones } from '../services/ModuloFunciones';

const ExportarCotizacion = ({ route, navigation }) => {
  const { cotizacion } = route.params;
  const [ventanas, setVentanas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const db = await getDBConnection();
        const datosVentanas = await ExportarVentanasPorCotizacion(db, cotizacion.Id);
        setVentanas(datosVentanas);
      } catch (error) {
        console.error("Error al cargar ventanas", error);
        Alert.alert("Error", "No se pudo cargar la información");
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const generarHTML = () => {
    const ventanasHtml = ventanas.map(v => `
      <tr>
        <td>${v.Descripcion}</td>
        <td>${(v.Base / 100).toFixed(2)} m x ${(v.Altura / 100).toFixed(2)} m</td>
        <td>${v.Vidrio}</td>
        <td>₡${Number(v.Costo).toLocaleString('es-CR')}</td>
      </tr>
    `).join('');

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
            h1, h2 {
              text-align: center;
              color: #2c3e50;
            }
            .section {
              margin-bottom: 30px;
            }
            .label {
              font-weight: bold;
              margin-right: 8px;
            }
            .data {
              margin-bottom: 6px;
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
          </style>
        </head>
        <body>
          <h1>Detalle de Cotización</h1>

          <div class="section">
            <div class="data"><span class="label">Cliente:</span> ${cotizacion.Nombre}</div>
            <div class="data"><span class="label">Teléfono:</span> ${cotizacion.Telefono}</div>
            <div class="data"><span class="label">Descripción:</span> ${cotizacion.Descripcion}</div>
            <div class="data total">Costo Total: ${formatearColones(cotizacion.Costo)}</div>
          </div>

          <h2>Ventanas Cotizadas</h2>
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
          <Text style={styles.title}>Vista Previa de Cotización</Text>
          <ScrollView style={styles.previewBox}>
            <Text style={styles.sectionTitle}>Cliente:</Text>
            <Text style={styles.info}>{cotizacion.Nombre}</Text>

            <Text style={styles.sectionTitle}>Teléfono:</Text>
            <Text style={styles.info}>{cotizacion.Telefono}</Text>

            <Text style={styles.sectionTitle}>Descripción:</Text>
            <Text style={styles.info}>{cotizacion.Descripcion}</Text>

            <Text style={styles.sectionTitle}>Costo Total:</Text>
            <Text style={styles.total}>{formatearColones(cotizacion.Costo)}</Text>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Detalle de Ventanas:</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, { flex: 2 }]}>Descripción</Text>
              <Text style={styles.cell}>Dimensiones</Text>
              <Text style={styles.cell}>Material</Text>
              <Text style={styles.cell}>Costo</Text>
            </View>
            {ventanas.map((v, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cell, { flex: 2 }]}>{v.Descripcion}</Text>
                <Text style={styles.cell}>
                  {(v.Base / 100).toFixed(2)} x {(v.Altura / 100).toFixed(2)} m
                </Text>
                <Text style={styles.cell}>{v.Vidrio}</Text>
                <Text style={styles.cell}>₡{Number(v.Costo).toLocaleString('es-CR')}</Text>
              </View>
            ))}
          </ScrollView>

          <Button
            mode="contained"
            style={{ marginTop: 20 }}
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
});

export default ExportarCotizacion;
