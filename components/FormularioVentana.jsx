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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 15,
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
    borderRadius: 12,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
