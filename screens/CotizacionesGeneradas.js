import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Alert, Text } from 'react-native';
//import { Button } from 'react-native-elements';

import { Button } from 'react-native-paper';
import CotizacionItem from '../components/CotizacionItem.jsx';
import {
  getDBConnection,
  getAllCotizaciones,
  deleteCotizacionConVentanas
} from '../ModuloDb/MDb.js';

const CotizacionesGeneradas = ({ navigation }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const database = await getDBConnection();
        setDb(database);
        await cargarCotizaciones(database);
      } catch (error) {
        console.error("Error al cargar la base de datos", error);
        Alert.alert("Error", "No se pudo cargar la base de datos");
      } finally {
        setLoading(false);
      }
    };

    loadDatabase();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (db) {
        cargarCotizaciones(db);
      }
    });
    return unsubscribe;
  }, [navigation, db]);

  const cargarCotizaciones = async (database) => {
    try {
      const data = await getAllCotizaciones(database);
      setCotizaciones(data);
    } catch (error) {
      console.error("Error cargando cotizaciones", error);
      Alert.alert("Error", "No se pudieron cargar las cotizaciones");
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Deseas eliminar esta cotización y todas sus ventanas asociadas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCotizacionConVentanas(db, id);
              await cargarCotizaciones(db);
              Alert.alert("✅ Eliminado", "Cotización eliminada correctamente");
            } catch (error) {
              console.error("Error eliminando cotización", error);
              Alert.alert("Error", "No se pudo eliminar la cotización");
            }
          }
        }
      ]
    );
  };

  const handleEdit = (cotizacion) => {
    navigation.navigate('EditarCotizacion', { cotizacion});
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const handleExport = (cotizacion) => {
  navigation.navigate('ExportarCotizacion', { cotizacion });
};


  return (
    <View style={styles.container}>
      <FlatList
        data={cotizaciones}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <CotizacionItem
            cotizacion={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExport={handleExport}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay cotizaciones generadas aún</Text>
          </View>
        }
      />
      <Button  mode="contained"   style={styles.addButton}   onPress={() => navigation.navigate('Cotizaciones')}  >
        Nueva Cotización
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    marginHorizontal: 30,
    marginTop: 30,
    marginBottom: 45,
    borderRadius: 10,
    backgroundColor: '#2196F3',
  },
});

export default CotizacionesGeneradas;
