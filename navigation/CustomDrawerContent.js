// navigation/CustomDrawerContent.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackHandler } from 'react-native';

// Icon components defined outside render to prevent recreation
const DescriptionIcon = ({ color, size }) => <MaterialIcons name="description" size={size} color={color} />;
const ListAltIcon = ({ color, size }) => <MaterialIcons name="list-alt" size={size} color={color} />;
const PeopleIcon = ({ color, size }) => <MaterialIcons name="people" size={size} color={color} />;
const CategoryIcon = ({ color, size }) => <MaterialIcons name="category" size={size} color={color} />;
const SettingsIcon = ({ color, size }) => <MaterialIcons name="settings" size={size} color={color} />;
const ExitIcon = () => <MaterialCommunityIcons name="exit-to-app" size={24} color="red" />;

export default function CustomDrawerContent(props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <DrawerContentScrollView {...props}>

      <DrawerItem
        label="Cotizaciones"
        onPress={() => props.navigation.navigate('Cotizaciones')}
        icon={DescriptionIcon}
      />

      <DrawerItem
        label="Cotizaciones Generadas"
        onPress={() => props.navigation.navigate('CotizacionesGen')}
        icon={ListAltIcon}
      />

      {/* "Accordion" simple */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.accordionHeader}
      >
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color="#333" />
        <Text style={styles.accordionText}>Configuraciones</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordionContent}>
          <DrawerItem
            label="Clientes"
            onPress={() => props.navigation.navigate('ListaClientes')}
            icon={PeopleIcon}
          />
          <DrawerItem
            label="Materiales"
            onPress={() => props.navigation.navigate('Materiales')}
            icon={CategoryIcon}
          />
          <DrawerItem
            label="Configuraciones"
            onPress={() => props.navigation.navigate('Configuraciones')}
            icon={SettingsIcon}
          />
        </View>
      )}

      <DrawerItem
        label="Salir"
        onPress={() => BackHandler.exitApp()}
        icon={ExitIcon}
        labelStyle={styles.exitLabel}
        style={styles.exitItem}
      />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  accordionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#333',
  },
  accordionContent: {
    paddingLeft: 32,
  },
  exitLabel: {
    color: 'red',
  },
  exitItem: {
    borderTopWidth: 1,
    borderColor: '#eee',
    marginTop: 12,
  },
});
