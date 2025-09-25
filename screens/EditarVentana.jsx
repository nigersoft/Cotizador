import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, StyleSheet } from 'react-native';
import FormularioVentana from '../components/FormularioVentana';
import { actualizarVentana } from '../services/ModuloFunciones';
import { getDBConnection } from '../ModuloDb/MDb';

const EditarVentana = ({ route, navigation }) => {
  const { ventana } = route.params;

  const [Descripcion, setDescripcion] = useState('');
  const [costo, setCosto] = useState('');
  const [base, setBase] = useState('');
  const [altura, setAltura] = useState('');
   const [db, setDb] = useState(null);

  useEffect(() => {
      const loadDatabase = async () => {
        try {
          const database = await getDBConnection();
          setDb(database);
          
        } catch (error) {
          console.error("Error al cargar la base de datos", error);
          Alert.alert("Error", "No se pudo cargar la base de datos");
        }
      };
  
      loadDatabase();
    }, []); 

  useEffect(() => {
    if (ventana) {
      setDescripcion(ventana.Descripcion ?? '');
      setCosto(String(ventana.Costo ?? ''));
      setBase(String(ventana.Base ?? ''));
      setAltura(String(ventana.Altura ?? ''));

    
    }
  }, [ventana]);

  const handleUpdate = () => {
    if (
      !Descripcion.trim() ||
      isNaN(base) || base === '' ||
      isNaN(altura) || altura === '' ||
      isNaN(costo) || costo === ''
    ) {
      Alert.alert('Error', 'Todos los campos deben estar completos y numéricos donde corresponde.');
      return;
    }

    const updatedVentana = {
      Id: ventana.Id,
      IdCotizacion: ventana.IdCotizacion,
      IdVidrio: ventana.IdVidrio,
      Descripcion: Descripcion.trim(),
      Costo: parseFloat(costo),
      Base: parseFloat(base),
      Altura: parseFloat(altura),
    };

    actualizarVentana(db,updatedVentana);
    Alert.alert('✅ Éxito', 'Ventana actualizada correctamente');
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FormularioVentana
        Descripcion={Descripcion}
        setDescripcion={setDescripcion}
        Base={base}
        setBase={setBase}
        Altura={altura}
        setAltura={setAltura}
        Costo={costo}
        setCosto={setCosto}
        onSubmit={handleUpdate}
        textoBoton="Actualizar ventana"
        mostrarCliente={false}
        mostrarVidrio={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
});

export default EditarVentana;
