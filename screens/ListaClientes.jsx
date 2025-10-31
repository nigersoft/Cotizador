// screens/ClientesListScreen.jsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Alert, Modal, TextInput, TouchableOpacity, Text as RNText, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';

import ClienteItem from '../components/ClienteItem.jsx';
import {
  getDBConnection,
  getAllClientes,
  deleteCliente,
  getCotizacionesCountByCliente,
  deleteCotizacionesByCliente,
  insertCliente
} from '../ModuloDb/MDb.js';

const ListaClientes = ({ navigation }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);

  // Estado para modal de agregar cliente
  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const database = await getDBConnection();
        setDb(database);
        await loadClientes(database);
      } catch (error) {
        console.error("Error loading database", error);
        Alert.alert("Error", "No se pudo cargar la base de datos");
      } finally {
        setLoading(false);
      }
    };

    loadDatabase();
  }, []);

  useEffect(() => {
    // Recargar los clientes cuando la pantalla reciba el foco
    const unsubscribe = navigation.addListener('focus', () => {
      if (db) {
        loadClientes(db);
      }
    });

    return unsubscribe;
  }, [navigation, db]);

  const loadClientes = async (database) => {
    try {
      const clientesData = await getAllClientes(database);
      setClientes(clientesData);
    } catch (error) {
      console.error("Error loading clientes", error);
      Alert.alert("Error", "No se pudieron cargar los clientes");
    }
  };

  const handleEdit = (cliente) => {
    navigation.navigate('EditarCliente', { cliente });
  };

  const handleDelete = async (id) => {
    try {
      // Verificar si el cliente tiene cotizaciones asociadas
      const cotizacionesCount = await getCotizacionesCountByCliente(db, id);

      if (cotizacionesCount > 0) {
        // Si tiene cotizaciones, mostrar advertencia detallada
        Alert.alert(
          "Advertencia",
          `Este cliente tiene ${cotizacionesCount} cotización(es) asociada(s).\n\n¿Deseas eliminar el cliente de todas formas?\n\nNOTA: Las cotizaciones asociadas también serán eliminadas permanentemente.`,
          [
            {
              text: "Cancelar",
              style: "cancel"
            },
            {
              text: "Eliminar todo",
              style: "destructive",
              onPress: async () => {
                try {
                  // Primero eliminar todas las cotizaciones asociadas
                  await deleteCotizacionesByCliente(db, id);
                  // Luego eliminar el cliente
                  await deleteCliente(db, id);
                  await loadClientes(db);
                  Alert.alert(
                    "Éxito",
                    `Cliente y ${cotizacionesCount} cotización(es) eliminadas correctamente`
                  );
                } catch (error) {
                  console.error("Error deleting cliente with cotizaciones", error);
                  Alert.alert("Error", "No se pudo eliminar el cliente y sus cotizaciones");
                }
              }
            }
          ]
        );
      } else {
        // Si no tiene cotizaciones, mostrar mensaje simple
        Alert.alert(
          "Confirmar eliminación",
          "¿Estás seguro de que deseas eliminar este cliente?",
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
                  await deleteCliente(db, id);
                  await loadClientes(db);
                  Alert.alert("Éxito", "Cliente eliminado correctamente");
                } catch (error) {
                  console.error("Error deleting cliente", error);
                  Alert.alert("Error", "No se pudo eliminar el cliente");
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error("Error checking cotizaciones count", error);
      Alert.alert("Error", "No se pudo verificar las cotizaciones del cliente");
    }
  };

  // Agregar nuevo cliente desde modal
  const handleAgregarCliente = async () => {
    // Validación: solo Nombre y Teléfono son obligatorios
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }

    if (!telefono.trim()) {
      Alert.alert("Error", "El teléfono es obligatorio");
      return;
    }

    try {
      const newCliente = {
        Nombre: nombre,
        Apellido: apellidos.trim() || null,
        Telefono: telefono,
        Email: email.trim() || null,
      };

      await insertCliente(db, newCliente);

      // Recargar lista
      await loadClientes(db);

      // Limpiar formulario
      setNombre('');
      setApellidos('');
      setTelefono('');
      setEmail('');

      // Cerrar modal
      setModalVisible(false);

      Alert.alert("Éxito", "Cliente agregado correctamente");
    } catch (error) {
      console.error("Error saving cliente", error);
      Alert.alert("Error", "No se pudo guardar el cliente");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <ClienteItem
            cliente={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={
          <Button
            mode="contained"
            style={styles.addButton}
            buttonColor="#FF9800"
            onPress={() => setModalVisible(true)}
            icon="plus"
          >
            Agregar Cliente
          </Button>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Modal para agregar cliente */}
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
            <RNText style={styles.modalTitle}>Nuevo Cliente</RNText>

            <RNText style={styles.inputLabel}>Nombre *</RNText>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre"
              style={styles.input}
              autoCapitalize="words"
            />

            <RNText style={styles.inputLabel}>Apellidos</RNText>
            <TextInput
              value={apellidos}
              onChangeText={setApellidos}
              placeholder="Apellidos"
              style={styles.input}
              autoCapitalize="words"
            />

            <RNText style={styles.inputLabel}>Teléfono *</RNText>
            <TextInput
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Teléfono"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <RNText style={styles.inputLabel}>Email</RNText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  // Limpiar formulario al cancelar
                  setNombre('');
                  setApellidos('');
                  setTelefono('');
                  setEmail('');
                }}
              >
                <RNText style={styles.actionText}>Cancelar</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={handleAgregarCliente}
              >
                <RNText style={styles.saveBtnText}>Guardar</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
  input: {
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

export default ListaClientes;
