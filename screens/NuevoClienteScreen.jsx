// screens/NuevoClienteScreen.jsx
import React, { useState, useEffect,useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, Text, TextInput } from 'react-native';
//import { Button } from 'react-native-elements';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getDBConnection, insertCliente } from '../ModuloDb/MDb.js';

const NuevoClienteScreen = ({ navigation }) => {
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
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
      setNombre('');
      setApellidos('');
      setTelefono('');
      setEmail('');
    }, [])
  );

  const handleSave = async () => {
    // Validación simple
    if (!nombre.trim() || !apellidos.trim() || !telefono.trim() || !email.trim()) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    try {
      const newCliente = {
        Nombre: nombre,
        Apellido: apellidos,
        Telefono: telefono,
        Email: email,
      };

      await insertCliente(db, newCliente);
      Alert.alert("Éxito", "Cliente agregado correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error saving cliente", error);
      Alert.alert("Error", "No se pudo guardar el cliente");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
        />

        <Text style={styles.label}>Apellidos</Text>
        <TextInput
          style={styles.input}
          value={apellidos}
          onChangeText={setApellidos}
          placeholder="Apellidos"
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          placeholder="Teléfono"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
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

export default NuevoClienteScreen;
