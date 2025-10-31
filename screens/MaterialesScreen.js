import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ActivityIndicator, StyleSheet, TextInput, Alert, FlatList, Modal, TouchableOpacity, Text as RNText, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import VidrioItem from '../components/VidrioItem.jsx';
import { Button, Divider } from 'react-native-paper';

import { getDBConnection, getAllVidrios, deleteVidrio, getAllMateriales, update_Material, insertVidrio } from '../ModuloDb/MDb.js';

const MaterialesScreen = ({ navigation }) => {
  const [db, setDb] = useState(null);
  const [materiales, setMateriales] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [costo, setCosto] = useState('');
  const [vidrios, setVidrios] = useState([]);

  // Estado para modal de agregar vidrio
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevoCosto, setNuevoCosto] = useState('');

  // Cargar los vidrios de la DB
  const LoadVidrios = async (cnx) => {
    const listaVidrios = await getAllVidrios(cnx)
    setVidrios(listaVidrios);
  }

  useEffect(() => {
    (async () => {
      try {
        const connection = await getDBConnection();
        setDb(connection);
        // Carga los materiales desde la db
        const lista = await getAllMateriales(connection);
        // Prepara los datos para el dropdown de materiales
        const dropdownData = lista.map(mat => ({
          label: mat.Descripcion,
          value: mat.Id,
          Costo: mat.Costo,
        }));
        setMateriales(dropdownData);
        await LoadVidrios(connection);

        // Controla los errores
      } catch (error) {
        console.error('Error cargando materiales:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Actualizar el flatlist
  useFocusEffect(
    useCallback(() => {
      if (db)
        LoadVidrios(db);
    }, [db])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleSelect = item => {
    setSelectedMaterial(item.value);
    setCosto(item.Costo.toString());
  };

  // Actualizar vidrios
  const handleDeleteVid = (id) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar este Vidrio?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVidrio(db, id);
              await LoadVidrios(db);
              Alert.alert("Éxito", "Vidrio eliminado correctamente");
            } catch (error) {
              console.error("Error Eliminando vidrio", error);
              Alert.alert("Error", "No se pudo eliminar el vidrio");
            }
          }
        }
      ]
    );
  };

  // Editar vidrios
  const handleEditVid = (Vidrio) => {
    navigation.navigate('EditarVidrio', { Vidrio });
  };

  const handleUpdate = async () => {
    // Validación simple
    if (!costo.trim()) {
      Alert.alert('Error', 'Debe digitar un valor');
      return;
    }

    try {
      const updatedMaterial = {
        Id: selectedMaterial,
        Costo: parseFloat(costo),
      };

      await update_Material(db, updatedMaterial);
      Alert.alert('Éxito', 'Costo actualizado correctamente');

      // Actualiza el costo para verlo en el dropdown
      setMateriales(prev =>
        prev.map(item =>
          item.value === selectedMaterial
            ? { ...item, Costo: updatedMaterial.Costo }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating cliente', error);
      Alert.alert('Error', 'No se pudo actualizar el costo');
    }
  };

  // Agregar nuevo vidrio desde modal
  const handleAgregarVidrio = async () => {
    // Validación
    if (!nuevaDescripcion.trim() || !nuevoCosto.trim()) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    try {
      const newVidrio = {
        Descripcion: nuevaDescripcion,
        Costo: nuevoCosto,
      };

      await insertVidrio(db, newVidrio);

      // Recargar lista
      await LoadVidrios(db);

      // Limpiar formulario
      setNuevaDescripcion('');
      setNuevoCosto('');

      // Cerrar modal
      setModalVisible(false);

      Alert.alert("Éxito", "Vidrio agregado correctamente");
    } catch (error) {
      console.error("Error Guardando Vidrio", error);
      Alert.alert("Error", "No se pudo guardar el Vidrio");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Selecciona un material:</Text>

        <Dropdown
          style={styles.dropdown}
          data={materiales}
          search
          labelField="label"
          valueField="value"
          placeholder="-- Elige un material --"
          renderItem={item => (
            <View style={styles.item}>
              <Text>{item.label}</Text>
              <Text style={styles.costoText}>₡{item.Costo}</Text>
            </View>
          )}
          value={selectedMaterial}
          onChange={handleSelect}
        />
        <Text style={styles.label}>Costo:</Text>
        <TextInput
          style={styles.input}
          value={costo}
          onChangeText={text => setCosto(text)}
          keyboardType="numeric"
          autoCapitalize="none"
          placeholder="Costo del material"
        />

        <Button
          mode="contained"
          style={styles.updateButton}
          onPress={handleUpdate}
        >
          Actualizar
        </Button>

        <Divider style={styles.divider} />

        <Text style={styles.sectionTitle}>Vidrios:</Text>

        {/* Botón agregar vidrio */}
        <Button
          mode="outlined"
          style={styles.addButton}
          textColor="#FF9800"
          onPress={() => setModalVisible(true)}
          icon="plus"
        >
          Agregar Nuevo Vidrio
        </Button>

        <FlatList
          data={vidrios}
          keyExtractor={(item) => item.Id.toString()}
          renderItem={({ item }) => (
            <VidrioItem
              Vidrio={item}
              onEdit={handleEditVid}
              onDelete={handleDeleteVid}
            />
          )}
          scrollEnabled={false}
        />
      </View>

      {/* Modal para agregar vidrio */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <RNText style={styles.modalTitle}>Nuevo Vidrio</RNText>

            <RNText style={styles.inputLabel}>Descripción *</RNText>
            <TextInput
              value={nuevaDescripcion}
              onChangeText={setNuevaDescripcion}
              placeholder="Descripción del vidrio"
              style={styles.modalInput}
              autoCapitalize="words"
            />

            <RNText style={styles.inputLabel}>Costo *</RNText>
            <TextInput
              value={nuevoCosto}
              onChangeText={setNuevoCosto}
              placeholder="Precio de costo"
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  // Limpiar formulario al cancelar
                  setNuevaDescripcion('');
                  setNuevoCosto('');
                }}
              >
                <RNText style={styles.actionText}>Cancelar</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={handleAgregarVidrio}
              >
                <RNText style={styles.saveBtnText}>Guardar</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    color: '#1A1C1E',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  updateButton: {
    borderRadius: 12,
    marginTop: 16,
  },
  addButton: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  costoText: {
    fontWeight: 'bold',
  },
  divider: {
    backgroundColor: '#CED0CE',
    marginVertical: 20,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1A1C1E',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
  actionText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
  },
  saveBtnText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

export default MaterialesScreen;
