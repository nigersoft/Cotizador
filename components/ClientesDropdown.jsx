import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useFocusEffect } from '@react-navigation/native';
import { getDBConnection, getAllClientes } from '../ModuloDb/MDb.js';

const ClientesDropdown = ({ onChange, initialValue = null }) => {
  const [clientes, setClientes] = useState([]);
  const [selected, setSelected] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClientes = useCallback(async (cnx, isRefresh = false) => {
    try {
      const listaClientes = await getAllClientes(cnx);

      const dropdownData = listaClientes.map(client => ({
        label: client.Apellido ? `${client.Nombre} ${client.Apellido}` : client.Nombre,
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
  }, [initialValue, onChange, selected]);

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
  }, [loadClientes]);

  // Recargar clientes cuando la pantalla se enfoca
  useFocusEffect(
    React.useCallback(() => {
      // Solo refrescar si ya se cargó la primera vez
      if (!loading) {
        (async () => {
          try {
            const connection = await getDBConnection();
            await loadClientes(connection, true);
          } catch (error) {
            console.error('Error refrescando Clientes:', error);
          }
        })();
      }
    }, [loading, loadClientes])
  );

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
    paddingVertical: 4,
    position: 'relative',
  },
  dropdown: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: '#F5F5F5',
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