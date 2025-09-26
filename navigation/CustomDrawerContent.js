// navigation/CustomDrawerContent.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackHandler } from 'react-native';

export default function CustomDrawerContent(props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <DrawerContentScrollView {...props}>

      <DrawerItem
        label="Cotizaciones"
        onPress={() => props.navigation.navigate('Cotizaciones')}
        icon={({ color, size }) => <MaterialIcons name="description" size={size} color={color} />}
      />

      <DrawerItem
        label="Cotizaciones Generadas"
        onPress={() => props.navigation.navigate('CotizacionesGen')}
        icon={({ color, size }) => <MaterialIcons name="list-alt" size={size} color={color} />}
      />

      {/* “Accordion” simple */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
      >
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color="#333" />
        <Text style={{ marginLeft: 8, fontWeight: '600', color: '#333' }}>Configuraciones</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingLeft: 32 }}>
          <DrawerItem
            label="Clientes"
            onPress={() => props.navigation.navigate('ListaClientes')}
            icon={({ color, size }) => <MaterialIcons name="people" size={size} color={color} />}
          />
          <DrawerItem
            label="Materiales"
            onPress={() => props.navigation.navigate('Materiales')}
            icon={({ color, size }) => <MaterialIcons name="category" size={size} color={color} />}
          />
          <DrawerItem
            label="Configuraciones"
            onPress={() => props.navigation.navigate('Configuraciones')}
            icon={({ color, size }) => <MaterialIcons name="settings" size={size} color={color} />}
          />
        </View>
      )}

      <DrawerItem
        label="Salir"
        onPress={() => BackHandler.exitApp()}
        icon={() => <MaterialCommunityIcons name="exit-to-app" size={24} color="red" />}
        labelStyle={{ color: 'red' }}
        style={{ borderTopWidth: 1, borderColor: '#eee', marginTop: 12 }}
      />
    </DrawerContentScrollView>
  );
}
