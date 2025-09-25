import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Text, TextInput } from 'react-native';
//import { Button } from 'react-native-elements';

import { Button } from 'react-native-paper';

import { getDBConnection, updateCliente } from '../ModuloDb/MDb.js';

const EditarClienteScreen = ({ route, navigation }) => {
  const { cliente } = route.params;
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [db, setDb] = useState(null);

  // Sincronizar el formulario con el cliente cada vez que cambie
  useEffect(() => {
    if (cliente) {
      setNombre(cliente.Nombre);
      setApellido(cliente.Apellido);
      setTelefono(cliente.Telefono);
      setEmail(cliente.Email);
    }
  }, [cliente]);

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
    if (!nombre.trim() || !apellido.trim() || !telefono.trim() || !email.trim()) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    try {
      const updatedCliente = {
        Id: cliente.Id,
        Nombre: nombre,
        Apellido: apellido,
        Telefono: telefono,
        Email: email,
      };

      await updateCliente(db, updatedCliente);
      Alert.alert('Éxito', 'Cliente actualizado correctamente');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating cliente', error);
      Alert.alert('Error', 'No se pudo actualizar el cliente');
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
          value={apellido}
          onChangeText={setApellido}
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

export default EditarClienteScreen;
