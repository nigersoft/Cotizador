// screens/NuevoClienteScreen.jsx
import React, { useState, useEffect,useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, Text, TextInput } from 'react-native';
//import { Button } from 'react-native-elements';

import { Button } from 'react-native-paper';

import { useFocusEffect } from '@react-navigation/native';
import { getDBConnection, insertVidrio } from '../ModuloDb/MDb.js';

const NuevoVidrio = ({ navigation }) => {
  const [Descripcion, setDescripcion] = useState('');
  const [Costo, setCosto] = useState('');

  const [db, setDb] = useState(null);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const database = await getDBConnection();
        setDb(database);
      } catch (error) {
        console.error("Error loading database", error);
        Alert.alert("Error", "No se pudo cargar la base de datos");
      }
    };
    
    loadDatabase();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setDescripcion('');
      setCosto('');
    
    }, [])
  );

  const handleSave = async () => {
    // Validación simple
    if (!Descripcion.trim() || !Costo.trim()) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    try {
      const newVidrio = {
        Descripcion: Descripcion,
        Costo: Costo,
        
      };

      await insertVidrio(db, newVidrio);
      Alert.alert("Éxito", "Vidrio agregado correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error Guardanto Vidrio", error);
      Alert.alert("Error", "No se pudo guardar el Vidrio");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Descripcion</Text>
        <TextInput
          style={styles.input}
          value={Descripcion}
          onChangeText={setDescripcion}
          placeholder="Descripción del vidrio"
        />

        <Text style={styles.label}>Costo</Text>
        <TextInput
          style={styles.input}
          value={Costo}
          onChangeText={setCosto}
          keyboardType="numeric"
          placeholder="Precio de Costo"
        />

        
         <Button
          mode="contained"
          style={styles.saveButton}
          onPress={handleSave}
          >
            Guardar
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
  saveButton: {
    borderRadius: 8,
    marginTop: 16,
  },
});

export default NuevoVidrio;
