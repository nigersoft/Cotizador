import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatearColones } from '../services/ModuloFunciones';

const CotizacionItem = ({ cotizacion, onEdit, onDelete, onExport }) => {
  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{cotizacion.Descripcion}</Text>
        <Text style={styles.details}>
          {cotizacion.Nombre} {cotizacion.Telefono}
        </Text>
        <Text style={styles.details}>{formatearColones(cotizacion.Costo)}</Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity onPress={() => onEdit(cotizacion)} style={styles.actionButton}>
          <MaterialIcons name="edit" size={24} color="#2089dc" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(cotizacion.Id)} style={styles.actionButton}>
          <MaterialIcons name="delete" size={24} color="#ff0000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onExport(cotizacion)} style={styles.actionButton}>
          <MaterialIcons name="share" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  details: {
    fontSize: 14,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 15,
  },
});

export default CotizacionItem;
