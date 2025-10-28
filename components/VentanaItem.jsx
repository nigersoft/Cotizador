import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatearColones } from '../services/ModuloFunciones';

const VentanaItem = ({ Ventana, onEdit, onDelete }) => {
  const TotalColones = formatearColones(Ventana.Costo);

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{Ventana.Descripcion}</Text>
        <Text style={styles.details}>{TotalColones}</Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity onPress={() => onEdit(Ventana)} style={styles.actionButton}>
          <MaterialIcons name="edit" size={24} color="#2089dc" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(Ventana.Id)} style={styles.actionButton}>
          <MaterialIcons name="delete" size={24} color="#ff0000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1A1C1E',
  },
  details: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
});

export default VentanaItem;
