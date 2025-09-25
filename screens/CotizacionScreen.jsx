import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Alert, FlatList } from 'react-native';
import { Text, Divider } from 'react-native-paper';
//import { Button } from 'react-native-elements';
import { Button } from 'react-native-paper';
//import ClientesDropdown from '../components/ClientesDropdown';
//import VidriosDropdown from '../components/VidriosDropdown';
import VentanaItem from '../components/VentanaItem';
import FormularioVentana from '../components/FormularioVentana';

import {
  getDBConnection,
  EXPORTAR_DB,
  ACTUALIZAR_DB,
} from '../ModuloDb/MDb';

import {
  formatearColones,
  CalcularCostos,
  GuardarCotizacion,
  VerTABLA,
} from '../services/ModuloFunciones';

export default function CotizacionesScreen({ navigation }) {
  const [Altura, setAltura] = useState('');
  const [Base, setBase] = useState('');
  const [Descripcion, setDescripcion] = useState('');
  const [idCliente, setIdCliente] = useState(null);
  const [idVidrio, setIdVidrio] = useState(null);
  const [Ventanas, setVentanas] = useState([]);
  const [Total, setTotal] = useState(0);
  const [db, setDb] = useState(null);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const database = await getDBConnection();
        setDb(database);
      } catch (error) {
        console.error("Error cargando la base de datos", error);
        Alert.alert("Error", "No se pudo cargar la base de datos");
      }
    };
    loadDatabase();
  }, []);

  const Agregar = async () => {
    if (
      !Altura || isNaN(Altura) ||
      !Base || isNaN(Base) ||
      !Descripcion || Descripcion.trim() === '' ||
      !idCliente ||
      !idVidrio
    ) {
      alert("Por favor complete todos los campos.");
      return;
    }

    const Costo = await CalcularCostos(Base, Altura, idVidrio);
    const Precio = Costo * 1.30;

    const nuevaVentana = {
      Id: Date.now().toString(),
      IdVidrio: idVidrio,
      Descripcion,
      Costo: `${Precio}`,
      Base,
      Altura,
    };

    setVentanas(prev => [...prev, nuevaVentana]);
    setDescripcion('');
    setBase('');
    setAltura('');
    setTotal(prevTotal => prevTotal + Precio);

    Alert.alert(`Ventana agregada con ID: ${nuevaVentana.Id}`);
  };

  const Guardar = async () => {
    if (!Ventanas || Ventanas.length === 0) {
      Alert.alert("Error", "Debe ingresar al menos una ventana.");
      return;
    }

    try {
      await GuardarCotizacion(db, idCliente, Ventanas);
      Alert.alert("¡Cotización guardada exitosamente!");
      setVentanas([]);
      setTotal(0);
    } catch (error) {
      Alert.alert("Error al guardar", error.message);
    }
  };

  const handleEdit = (ventana) => {
    navigation.navigate('EdiVentana', {
      ventana,
      actualizarVentana: handleActualizarVentana,
    });
  };

  const handleActualizarVentana = (ventanaActualizada) => {
    const nuevasVentanas = Ventanas.map(v =>
      v.Id === ventanaActualizada.Id ? ventanaActualizada : v
    );
    setVentanas(nuevasVentanas);

    const nuevoTotal = nuevasVentanas.reduce((sum, v) => sum + parseFloat(v.Costo), 0);
    setTotal(nuevoTotal);
  };

const handleDelete = (Id) => {
  const ventanaEliminada = Ventanas.find(v => v.Id === Id);

  Alert.alert(
    "¿Eliminar ventana?",
    `¿Estás seguro de que deseas eliminar la ventana "${ventanaEliminada?.Nombre}"?`,
    [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          const nuevasVentanas = Ventanas.filter(v => v.Id !== Id);
          setVentanas(nuevasVentanas);

          const nuevoTotal = nuevasVentanas.reduce((sum, v) => sum + parseFloat(v.Costo), 0);
          setTotal(nuevoTotal);

          Alert.alert("✅ Eliminado", `La ventana "${ventanaEliminada?.Nombre}" fue eliminada.`);
        },
      },
    ]
  );
};


  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      <FormularioVentana
  Descripcion={Descripcion}
  setDescripcion={setDescripcion}
  Base={Base}
  setBase={setBase}
  Altura={Altura}
  setAltura={setAltura}
  idCliente={idCliente}
  setIdCliente={setIdCliente}
  idVidrio={idVidrio}
  setIdVidrio={setIdVidrio}
  onSubmit={Agregar}
  textoBoton="Agregar ventana"
  mostrarCliente={true}
  mostrarVidrio={true}
/>
      <Divider style={styles.divider} />

      <Text style={styles.sectionTitle}>Ventanas agregadas:</Text>

      <FlatList
        data={Ventanas}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <VentanaItem
            Ventana={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      />

      <Text style={styles.totalText}>TOTAL: {formatearColones(Total)}</Text>

      <Button mode="contained" style={styles.saveButton} onPress={Guardar}>
        Guardar Cotización
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 20,
    marginBottom: 10,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    marginBottom: 30,
  },
});
