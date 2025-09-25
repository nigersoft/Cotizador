import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { getDBConnection,getAllVidrios} from '../ModuloDb/MDb.js';



const VidriosDropdown = ({ onChange }) => {

const [vidrios, setVidrios] = useState([]);
const [selected, setSelected] = useState(null);

const loadVidrios = async(cnx)=>{
 const listaVidrios= await getAllVidrios(cnx)
 
  const dropdownData = listaVidrios.map(vid => ({
          label:vid.Descripcion,
          value: vid.Id,
          //apellido: client.Apellido,
        }));

  setVidrios(dropdownData);      
}


//////////////////////////////

useEffect(() => {
    (async () => {
      try {
        const connection = await getDBConnection();
        
       await loadVidrios(connection);

        // Controla los errores
      } catch (error) {
        console.error('Error cargando Vidrios:', error);
      } 
    })();
  }, []);

/////////////// handleSelect

 const handleSelect = (item) => {
    setSelected(item.value);
    if (onChange) onChange(item); // comunica selección si se necesita
  };

////////////////////////////////
return (

    <View style={styles.container}>
      
        <Dropdown
          style={styles.dropdown}
          data={vidrios}
          search
          labelField="label"
          valueField="value"
          placeholder="-- Elige un Vidrio --"
          renderItem={item => (
            <View style={styles.item}>
              <Text>{item.label}</Text>
             
            </View>
          )}
          value={selected}
          onChange={handleSelect}
        />
    
    </View>
)


}

const styles = StyleSheet.create({
  container: {
    //flex: 1,
   padding: 5,
    
  },
 
 
  dropdown: {
    width: '100%',            // <- esto es lo que garantiza el ancho completo
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    //marginBottom: 16,
    backgroundColor: '#fff',
  },
  
});



export default VidriosDropdown;