// navigation/DrawerNavigator.js
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomDrawerContent from './CustomDrawerContent';
import CotizacionesScreen from '../screens/CotizacionScreen';
import CotizacionesGeneradas from '../screens/CotizacionesGeneradas';
import ListaClientes from '../screens/ListaClientes';
import MaterialesScreen from '../screens/MaterialesScreen';
import Submenu33Screen from '../screens/Submenu33Screen';
import NuevoClienteScreen from '../screens/NuevoClienteScreen';
import EditarClienteScreen from '../screens/EditarClienteScreen';
import EditarVidrioScrm from '../screens/EditarVidrioScreen';
import NuevoVidrio from '../screens/NuevoVidrio';
import EditarVentana from '../screens/EditarVentana';
import EditarCotizacion from '../screens/EditarCotizacion';
import ExportarCotizacion from '../screens/ExportarCotizacion';


const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator drawerContent={(props) => <CustomDrawerContent {...props} />}>
      <Drawer.Screen name="Cotizaciones" component={CotizacionesScreen} />
      <Drawer.Screen name="CotizacionesGen" component={CotizacionesGeneradas} />
      {/* Se registran las pantallas asociadas a los submenús de Menu3 */}
      <Drawer.Screen name="ListaClientes" component={ListaClientes} />
      <Drawer.Screen name="Materiales" component={MaterialesScreen} />
      <Drawer.Screen name="Submenu3.3" component={Submenu33Screen} />
      <Drawer.Screen name="NuevoCliente" component={NuevoClienteScreen} />
      <Drawer.Screen name="EditarCliente" component={EditarClienteScreen}  options={{ unmountOnBlur: true }} />
      <Drawer.Screen name="NuevoVidrio" component={NuevoVidrio} />
      <Drawer.Screen name="EditarVidrio" component={EditarVidrioScrm} />
      <Drawer.Screen name="EdiVentana" component={EditarVentana} />
      <Drawer.Screen name="EditarCotizacion" component={EditarCotizacion} />
      <Drawer.Screen name="ExportarCotizacion" component={ExportarCotizacion} />


    </Drawer.Navigator>
  );
}
