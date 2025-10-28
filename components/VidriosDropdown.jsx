import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useFocusEffect } from '@react-navigation/native';
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

// Usar useFocusEffect para recargar vidrios cuando la pantalla se enfoca
useFocusEffect(
  React.useCallback(() => {
    (async () => {
      try {
        const connection = await getDBConnection();
        await loadVidrios(connection);
      } catch (error) {
        console.error('Error cargando Vidrios:', error);
      }
    })();
  }, [])
);

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
    paddingVertical: 4,
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
  item: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});



export default VidriosDropdown;