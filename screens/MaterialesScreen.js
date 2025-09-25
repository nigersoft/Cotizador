import React, { useState, useEffect,useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ActivityIndicator, StyleSheet, TextInput,Alert, FlatList } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import VidrioItem from '../components/VidrioItem.jsx';
//import { Button , Divider} from 'react-native-elements';
import { Button, Divider } from 'react-native-paper';

import { getDBConnection, getAllVidrios, deleteVidrio,getAllMateriales, update_Material} from '../ModuloDb/MDb.js';



  const MaterialesScreen = ({ navigation }) =>  {
  const [db, setDb] = useState(null);
  const [materiales, setMateriales] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  //const [selectedVidrio,setSelectedVidrio] = useState (null)
  const [loading, setLoading] = useState(true);
  const [costo, setCosto] = useState('');
  //const [costoVid, setCostoVid]= useState('')
  const [vidrios,setVidrios] = useState([]);

 ///// Cargar los vidrios de la DB ///
const LoadVidrios = async(cnx)=>{
 const listaVidrios= await getAllVidrios(cnx)
 setVidrios(listaVidrios);
}

  useEffect(() => {
    (async () => {
      try {
        const connection = await getDBConnection();
        setDb(connection);
        //Carga los materiales desde la db
        const lista = await getAllMateriales(connection);
        // Carga los vidrios desde la db
        //const listaVidrios= await getAllVidrios(connection)
        // Prepara los datos para el dropdown de materiales
        const dropdownData = lista.map(mat => ({
          label: mat.Descripcion,
          value: mat.Id,
          Costo: mat.Costo,
        }));
        setMateriales(dropdownData);
        //Prepara los datos para el dropdown de vidrios
        // const dropdownDataVid = listaVidrios.map(vid => ({
        //   label: vid.Descripcion,
        //   value: vid.Id,
        //   Costo: vid.Costo,
        // }));
        // setVidrios(dropdownDataVid);
       await LoadVidrios(connection);

        // Controla los errores
      } catch (error) {
        console.error('Error cargando materiales:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
///////////////////////////// actualizar el flatlist

 useFocusEffect(
    useCallback(() => {
      if (db) 
        LoadVidrios(db);
    }, [db])
  );
////////////////////////////////////////////////////
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleSelect = item => {
    setSelectedMaterial(item.value);
    setCosto(item.Costo.toString());
  };

  /* const handleSelectVid = item => {
    setSelectedVidrio(item.value);
    setCostoVid(item.Costo.toString());
  }; */

 

//////////////////////////////////////////////// actualizar vidrios

const handleDeleteVid = (id) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar este Vidrio?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVidrio(db, id);
              await LoadVidrios(db); 
              Alert.alert("Éxito", "Vidrio eliminado correctamente");
            } catch (error) {
              console.error("Error Eliminando vidrio", error);
              Alert.alert("Error", "No se pudo eliminar el vidrio");
            }
          }
        }
      ]
    );
  };

//////////////////////// Editar vidrios ///////////////////////////////////////

const handleEditVid = (Vidrio) => {
    navigation.navigate('EditarVidrio', { Vidrio });
    
    
  };
////////////////////////////////////////////////////////////////////

  const handleUpdate = async () => {
      // Validación simple
      if (!costo.trim()) {
        Alert.alert('Error', 'Debe digitar un valor');
        return;
      }
  
      try {
        const updatedMaterial = {
          Id: selectedMaterial,
          Costo: parseFloat(costo),
          
        };

              
              await update_Material(db, updatedMaterial);
              Alert.alert('Éxito', 'Costo actualizado correctamente');
              
              //Actualiza el costo para verlo en el dropdown
              setMateriales(prev =>
                prev.map(item =>
                  item.value === selectedMaterial
                    ? { ...item, Costo: updatedMaterial.Costo }
                    : item
                )
              );
              //Alert.alert(`Id: ${updatedMaterial.Id} , Costo: ${updatedMaterial.Costo}`)
            } catch (error) {
              console.error('Error updating cliente', error);
              Alert.alert('Error', 'No se pudo actualizar el costo');
            }
          };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selecciona un material:</Text>
      
      <Dropdown
        style={styles.dropdown}
        data={materiales}
        search
        labelField="label"
        valueField="value"
        placeholder="-- Elige un material --"
        renderItem={item => (
          <View style={styles.item}>
            <Text>{item.label}</Text>
            <Text style={styles.costo}>₡{item.Costo}</Text>
          </View>
        )}
        value={selectedMaterial}
        onChange={handleSelect}
      />
      <Text style={styles.label}>Costo:</Text>
      <TextInput
        style={styles.input}
        value={costo}
        onChangeText={text => setCosto(text)}
        keyboardType="numeric"
        autoCapitalize="none"
        placeholder="Costo del material"
      />

        <Button
          mode="contained"
          style={styles.updateButton}
          onPress={handleUpdate}
      >
             Actualizar
       </Button>
       <Divider style={{ backgroundColor: '#CED0CE', marginVertical: 12 }} />
       
       <FlatList
               data={vidrios}
               keyExtractor={(item) => item.Id.toString()}
               
               renderItem={({ item }) => (
                 <VidrioItem
                   Vidrio={item}
                   onEdit={handleEditVid}
                   onDelete={handleDeleteVid}
                   
                 />
               )}
             />

        <Button
          mode="contained"
          style={styles.VidButton}
         onPress={() => navigation.navigate('NuevoVidrio')}
         >
         Agregar nuevo Vidrio
        </Button>   
      
       {/* <Dropdown
        style={styles.dropdown}
        data={vidrios}
        search
        labelField="label"
        valueField="value"
        placeholder="-- Elige un Vidrio --"
        renderItem={item => (
          <View style={styles.item}>
            <Text>{item.label}</Text>
            <Text style={styles.costo}>₡{item.Costo}</Text>
          </View>
        )}
        value={selectedVidrio}
        onChange={handleSelectVid}
      />       
     <Text style={styles.label}>Costo:</Text>
      <TextInput
        style={styles.input}
        value={costo}
        onChangeText={text => setCosto(text)}
        keyboardType="numeric"
        autoCapitalize="none"
        placeholder="Costo del material"
      />

       

       <Button
                title="Actualizar"
                buttonStyle={styles.updateButton}
                onPress={handleUpdate}
              />


              <Button
                title="Agregar"
                buttonStyle={styles.updateButton}
                onPress={handleUpdate}
              /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  updateButton: {
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: '#2089dc',
  },
  VidButton: {
    
    borderRadius: 8,
    marginBottom:50,
    backgroundColor: '#2089dc',
  },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 8 },
  costo: { fontWeight: 'bold' },
});

export default MaterialesScreen;