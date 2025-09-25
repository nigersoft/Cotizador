import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { ACTUALIZAR_DB, EXPORTAR_DB } from '../ModuloDb/MDb.js';

export default function Submenu33Screen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button
        mode="contained"
        style={styles.updateButton}
        onPress={EXPORTAR_DB}
      >
        Exportar DB
      </Button>

      <Button
        mode="contained"
        style={styles.importButton}
        onPress={ACTUALIZAR_DB}
      >
        Importar DB
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  updateButton: {
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#2089dc',
    margin: 10,
    padding: 10,
  },
  importButton: {
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#4CAF50',
    margin: 10,
    padding: 10,
  },
});
