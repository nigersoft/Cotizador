import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { getDBConnection, getAllClientes } from '../ModuloDb/MDb.js';

const ClientesDropdown = ({ onChange, initialValue = null }) => {
  const [clientes, setClientes] = useState([]);
  const [selected, setSelected] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClientes = async (cnx, isRefresh = false) => {
    try {
      const listaClientes = await getAllClientes(cnx);

      const dropdownData = listaClientes.map(client => ({
        label: `${client.Nombre} ${client.Apellido}`,
        value: client.Id,
      }));

      setClientes(dropdownData);

      // Selección inicial si hay `initialValue` y no es un refresh
      if (initialValue && !isRefresh) {
        const found = dropdownData.find(item => item.value === initialValue);
        if (found) {
          setSelected(initialValue);
          if (onChange) onChange(found);
        }
      } else if (isRefresh && selected) {
        // En caso de refresh, verificar si el elemento seleccionado aún existe
        const stillExists = dropdownData.find(item => item.value === selected);
        if (!stillExists) {
          // Si el elemento seleccionado ya no existe, limpiar la selección
          setSelected(null);
          if (onChange) onChange(null);
        }
      }

      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error cargando Clientes:', error);
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const connection = await getDBConnection();
        await loadClientes(connection);
      } catch (error) {
        console.error('Error cargando Clientes:', error);
        setLoading(false);
      }
    })();
  }, []);

  // Función que se ejecuta cuando el dropdown recibe el foco
  const handleFocus = async () => {
    // Evitar múltiples recargas simultáneas
    if (refreshing || loading) return;
    
    setRefreshing(true);
    try {
      const connection = await getDBConnection();
      await loadClientes(connection, true);
    } catch (error) {
      console.error('Error refrescando Clientes:', error);
      setRefreshing(false);
    }
  };

  const handleSelect = (item) => {
    setSelected(item.value);
    if (onChange) onChange(item);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Dropdown
        style={[styles.dropdown, refreshing && styles.refreshing]}
        data={clientes}
        search
        labelField="label"
        valueField="value"
        placeholder="-- Elige cliente --"
        value={selected}
        onChange={handleSelect}
        onFocus={handleFocus}
        searchPlaceholder="Buscar cliente"
        disable={refreshing} // Opcional: deshabilitar mientras se actualiza
      />
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#0000ff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 5,
    position: 'relative',
  },
  dropdown: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#fff',
  },
  refreshing: {
    opacity: 0.7,
  },
  refreshIndicator: {
    position: 'absolute',
    right: 15,
    top: 20,
  },
});

export default ClientesDropdown;