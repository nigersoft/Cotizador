import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Text, TextInput } from 'react-native';
//import { Button } from 'react-native-elements';

import { Button } from 'react-native-paper';

import { getDBConnection, updateVidrio } from '../ModuloDb/MDb.js';

const EditarVidrioScrm = ({ route, navigation }) => {
  const { Vidrio } = route.params;
  const [Descripcion, setDescripcion] = useState('');
  const [Costo, setCosto] = useState('');
 
  const [db, setDb] = useState(null);

  // Sincronizar el formulario con el cliente cada vez que cambie
  useEffect(() => {
    if (Vidrio) {
      setDescripcion(Vidrio.Descripcion);
      setCosto(String(Vidrio.Costo));
     // Alert.alert(`Costo: ${Costo}, Descripcion: ${Descripcion}`)
    }
  }, [Vidrio]);

  // Cargar la base de datos
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const database = await getDBConnection();
        setDb(database);
      } catch (error) {
        console.error('Error loading database', error);
        Alert.alert('Error', 'No se pudo cargar la base de datos');
      }
    };
    loadDatabase();
  }, []);

  const handleUpdate = async () => {
    // Validación simple
    if (!Descripcion.trim() || !Costo.trim() ) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    try {
      const updatedVidrio = {
        Id: Vidrio.Id,
        Descripcion: Descripcion,
        Costo: Costo,
        
      };

      await updateVidrio(db, updatedVidrio);
      Alert.alert('Éxito', 'Vidrio actualizado correctamente');
      navigation.goBack();
    } catch (error) {
      console.error('Error actualizando vidrio', error);
      Alert.alert('Error', 'No se pudo actualizar el Vidrio');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={styles.input}
          value={Descripcion}
          onChangeText={setDescripcion}
          placeholder="Descripción"
        />

        <Text style={styles.label}>Costo</Text>
        <TextInput
          style={styles.input}
          value={Costo}
          onChangeText={setCosto}
          keyboardType="numeric"
          placeholder="Costo"
        />

      
        <Button
         mode="contained"
         style={styles.updateButton}
         onPress={handleUpdate}
         >
          Actualizar
        </Button>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
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
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: '#2089dc',
  },
});

export default EditarVidrioScrm;
