// screens/ClientesListScreen.jsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Alert } from 'react-native';
//import { Button } from 'react-native-elements';
import { Button } from 'react-native-paper';

import ClienteItem from '../components/ClienteItem.jsx';
import {
  getDBConnection,
  getAllClientes,
  deleteCliente,
  getCotizacionesCountByCliente,
  deleteCotizacionesByCliente
} from '../ModuloDb/MDb.js';

const ListaClientes = ({ navigation }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);

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
    //navigation.push('EditarCliente', { cliente });
    
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
      />
  
  <Button
   mode="contained"
   style={styles.addButton}
   onPress={() => navigation.navigate('NuevoCliente')}
  >
   Agregar Cliente
  </Button>
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
  addButton: {
    position: 'relative',
    margin: 50,
    marginBottom:80,
    borderRadius: 8,
    paddingBottom: 10,
  },
});

export default ListaClientes;


