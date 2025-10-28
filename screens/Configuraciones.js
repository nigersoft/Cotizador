import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Alert, Text, Modal } from 'react-native';
import { Button } from 'react-native-paper';
import { ACTUALIZAR_DB, EXPORTAR_DB, getDBConnection, getPorcentajeGanancia, updatePorcentajeGanancia } from '../ModuloDb/MDb.js';

export default function Configuraciones() {
  const [db, setDb] = useState(null);
  const [porcentajeGanancia, setPorcentajeGanancia] = useState('');
  const [porcentajeTemporal, setPorcentajeTemporal] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const connection = await getDBConnection();
        setDb(connection);

        // Cargar el porcentaje de ganancia
        const porcentaje = await getPorcentajeGanancia(connection);
        setPorcentajeGanancia(porcentaje.toString());
      } catch (error) {
        console.error('Error cargando configuración:', error);
        Alert.alert('Error', 'No se pudo cargar la configuración');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleOpenModal = () => {
    setPorcentajeTemporal(porcentajeGanancia);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setPorcentajeTemporal('');
  };

  const handleUpdatePorcentaje = async () => {
    // Validación
    if (!porcentajeTemporal.trim()) {
      Alert.alert('Error', 'Debe digitar un valor para el porcentaje');
      return;
    }

    const porcentaje = parseFloat(porcentajeTemporal);

    if (isNaN(porcentaje) || porcentaje < 0) {
      Alert.alert('Error', 'Debe digitar un porcentaje válido (mayor o igual a 0)');
      return;
    }

    try {
      await updatePorcentajeGanancia(db, porcentaje);
      setPorcentajeGanancia(porcentaje.toString());
      setModalVisible(false);
      Alert.alert('Éxito', `Porcentaje de ganancia actualizado a ${porcentaje}%`);
    } catch (error) {
      console.error('Error actualizando porcentaje de ganancia', error);
      Alert.alert('Error', 'No se pudo actualizar el porcentaje de ganancia');
    }
  };

  return (
    <View style={styles.container}>
      {!loading && (
        <Button
          mode="contained"
          style={styles.porcentajeButton}
          onPress={handleOpenModal}
        >
          Porcentaje de Ganancia: {porcentajeGanancia}%
        </Button>
      )}

      <Button
        mode="contained"
        style={styles.updateButton}
        onPress={EXPORTAR_DB}
      >
        Exportar DB
      </Button>

      <Button
        mode="contained"
        style={styles.importButton}
        onPress={ACTUALIZAR_DB}
      >
        Importar DB
      </Button>

      {/* Modal para editar porcentaje */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Porcentaje de Ganancia</Text>

            <Text style={styles.label}>Porcentaje (%):</Text>
            <TextInput
              style={styles.input}
              value={porcentajeTemporal}
              onChangeText={text => setPorcentajeTemporal(text)}
              keyboardType="numeric"
              autoCapitalize="none"
              placeholder="Porcentaje de ganancia"
            />

            <View style={styles.modalButtons}>
              <Button
                mode="contained"
                style={styles.modalButton}
                onPress={handleUpdatePorcentaje}
              >
                Guardar
              </Button>

              <Button
                mode="outlined"
                style={styles.modalButton}
                onPress={handleCloseModal}
              >
                Cancelar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  porcentajeButton: {
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#FF9800',
    margin: 10,
    padding: 10,
  },
  updateButton: {
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#2089dc',
    margin: 10,
    padding: 10,
  },
  importButton: {
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#4CAF50',
    margin: 10,
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
  },
});
