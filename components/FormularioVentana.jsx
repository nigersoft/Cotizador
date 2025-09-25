// components/FormularioVentana.jsx
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import ClientesDropdown from './ClientesDropdown';
import VidriosDropdown from './VidriosDropdown';

export default function FormularioVentana({
  Descripcion,
  setDescripcion,
  Base,
  setBase,
  Altura,
  setAltura,
  Costo,
  setCosto,
  idCliente,
  setIdCliente,
  idVidrio,
  setIdVidrio,
  onSubmit,
  textoBoton = 'Guardar',
  mostrarCliente = true,
  mostrarVidrio = true,
}) {
  return (
    <View style={styles.card}>
      {mostrarCliente && (
        <>
          <Text style={styles.label}>Cliente</Text>
          <ClientesDropdown onChange={(item) => setIdCliente(item.value)} />
        </>
      )}

      {mostrarVidrio && (
        <>
          <Text style={styles.label}>Vidrio</Text>
          <VidriosDropdown onChange={(item) => setIdVidrio(item.value)} />
        </>
      )}

      <Text style={styles.label}>Descripcion</Text>
      <TextInput
        style={styles.input}
        value={Descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej: Ventana Principal"
      />

      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Base</Text>
          <TextInput
            style={styles.input}
            value={Base}
            onChangeText={setBase}
            keyboardType="numeric"
            placeholder="Ej: 100"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Altura</Text>
          <TextInput
            style={styles.input}
            value={Altura}
            onChangeText={setAltura}
            keyboardType="numeric"
            placeholder="Ej: 80"
          />
        </View>
      </View>

      {setCosto && (
        <>
          <Text style={styles.label}>Costo (₡)</Text>
          <TextInput
            style={styles.input}
            value={Costo}
            onChangeText={setCosto}
            keyboardType="numeric"
            placeholder="Ej: 35000"
          />
        </>
      )}

      <Button
        mode="contained"
        style={styles.button}
        onPress={onSubmit}
      >
        {textoBoton}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginTop: 10,
  },
});
