import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, FlatList, View, Modal, TextInput, TouchableOpacity, Text as RNText, Switch } from 'react-native';
import { Text, Divider, Button } from 'react-native-paper';
import VentanaItem from '../components/VentanaItem';
import FormularioVentana from '../components/FormularioVentana';

import { getDBConnection } from '../ModuloDb/MDb';
import { formatearColones, CalcularCostos, GuardarCotizacion } from '../services/ModuloFunciones';

export default function CotizacionesScreen() {
  const [Altura, setAltura] = useState('');
  const [Base, setBase] = useState('');
  const [Descripcion, setDescripcion] = useState('');
  const [idCliente, setIdCliente] = useState(null);
  const [idVidrio, setIdVidrio] = useState(null);
  const [Ventanas, setVentanas] = useState([]);
  const [Total, setTotal] = useState(0);
  const [db, setDb] = useState(null);

  // ====== ESTADO PARA EDICIÓN INLINE (MODAL NATIVO) ======
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [eDesc, setEDesc] = useState('');
  const [eBase, setEBase] = useState('');
  const [eAltura, setEAltura] = useState('');
  const [eCosto, setECosto] = useState('');            // costo mostrado/editable
  const [autoCosto, setAutoCosto] = useState(true);    // recalcular automáticamente

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
      Alert.alert("Validación", "Por favor complete todos los campos.");
      return;
    }

    const costoBase = await CalcularCostos(Base, Altura, idVidrio);
    const precio = costoBase * 1.30;

    const nuevaVentana = {
      Id: Date.now().toString(),
      IdVidrio: idVidrio,
      Descripcion,
      Costo: `${precio}`, // en tu modelo "Costo" guarda el precio final
      Base,
      Altura,
    };

    setVentanas(prev => [...prev, nuevaVentana]);
    setDescripcion('');
    setBase('');
    setAltura('');
    setTotal(prevTotal => prevTotal + precio);

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

  // ====== EDITAR (abre el modal con los datos del item en memoria) ======
  const handleEdit = (ventana) => {
    setEditItem(ventana);
    setEDesc(ventana?.Descripcion ?? '');
    setEBase(String(ventana?.Base ?? ''));
    setEAltura(String(ventana?.Altura ?? ''));
    setECosto(String(ventana?.Costo ?? ''));
    setAutoCosto(true); // por defecto recalc activo; el usuario puede apagarlo o escribir costo manual
    setEditVisible(true);
  };

  const handleActualizarVentana = (ventanaActualizada) => {
    const nuevasVentanas = Ventanas.map(v =>
      v.Id === ventanaActualizada.Id ? ventanaActualizada : v
    );
    setVentanas(nuevasVentanas);
    const nuevoTotal = nuevasVentanas.reduce((sum, v) => sum + parseFloat(v.Costo), 0);
    setTotal(nuevoTotal);
  };

  // Recalcular costo automáticamente cuando cambian Base/Altura y autoCosto está activado
  useEffect(() => {
    let cancelled = false;
    const recalc = async () => {
      if (!editVisible || !autoCosto || !editItem) return;
      // Validamos números
      if (!eBase || isNaN(eBase) || !eAltura || isNaN(eAltura)) return;

      try {
        const costoBase = await CalcularCostos(eBase, eAltura, editItem.IdVidrio);
        const precio = costoBase * 1.30;
        if (!cancelled) setECosto(String(precio));
      } catch {
        // Silencioso: si falla el calc, no tocamos el costo actual
      }
    };
    recalc();
    return () => { cancelled = true; };
  }, [eBase, eAltura, autoCosto, editVisible, editItem]);

  const confirmarEdicion = async () => {
    if (!editItem) return;

    // Validaciones mínimas
    if (!eDesc.trim()) {
      Alert.alert('Validación', 'La descripción es requerida.');
      return;
    }
    if (!eBase || isNaN(eBase) || !eAltura || isNaN(eAltura)) {
      Alert.alert('Validación', 'Base y Altura deben ser numéricos.');
      return;
    }
    if (!eCosto || isNaN(eCosto)) {
      Alert.alert('Validación', 'El Costo debe ser numérico.');
      return;
    }

    try {
      const actualizado = {
        ...editItem,
        Descripcion: eDesc,
        Base: eBase,
        Altura: eAltura,
        // Conservamos IdVidrio original del item
        Costo: String(eCosto), // permitimos override manual
      };

      handleActualizarVentana(actualizado);
      setEditVisible(false);
      setEditItem(null);
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la ventana.');
    }
  };

  const cancelarEdicion = () => {
    setEditVisible(false);
    setEditItem(null);
  };

  const handleDelete = (Id) => {
    const ventanaEliminada = Ventanas.find(v => v.Id === Id);

    Alert.alert(
      "¿Eliminar ventana?",
      `¿Estás seguro de que deseas eliminar la ventana "${ventanaEliminada?.Nombre ?? ventanaEliminada?.Descripcion}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            const nuevasVentanas = Ventanas.filter(v => v.Id !== Id);
            setVentanas(nuevasVentanas);
            const nuevoTotal = nuevasVentanas.reduce((sum, v) => sum + parseFloat(v.Costo), 0);
            setTotal(nuevoTotal);
            Alert.alert("✅ Eliminado", `La ventana "${ventanaEliminada?.Nombre ?? ventanaEliminada?.Descripcion}" fue eliminada.`);
          },
        },
      ]
    );
  };

  return (
    <>
      <FlatList
        data={Ventanas}
        keyExtractor={(item) => String(item.Id)}
        renderItem={({ item }) => (
          <VentanaItem
            Ventana={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay ventanas agregadas aún.</Text>
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
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
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            <Text style={styles.totalText}>TOTAL: {formatearColones(Total)}</Text>
            <Button mode="contained" style={styles.saveButton} onPress={Guardar}>
              Guardar Cotización
            </Button>
          </View>
        }
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        removeClippedSubviews
      />

      {/* ===== MODAL NATIVO PARA EDICIÓN INLINE ===== */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={cancelarEdicion}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <RNText style={styles.modalTitle}>Editar ventana</RNText>

            <RNText style={styles.inputLabel}>Descripción</RNText>
            <TextInput
              value={eDesc}
              onChangeText={setEDesc}
              placeholder="Descripción"
              style={styles.input}
              autoCapitalize="sentences"
            />

            <RNText style={styles.inputLabel}>Base (cm)</RNText>
            <TextInput
              value={eBase}
              onChangeText={(t) => setEBase(t)}
              placeholder="Base"
              keyboardType="numeric"
              style={styles.input}
            />

            <RNText style={styles.inputLabel}>Altura (cm)</RNText>
            <TextInput
              value={eAltura}
              onChangeText={(t) => setEAltura(t)}
              placeholder="Altura"
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.switchRow}>
              <RNText style={styles.switchLabel}>Actualizar costo automáticamente</RNText>
              <Switch
                value={autoCosto}
                onValueChange={setAutoCosto}
              />
            </View>

            <RNText style={styles.inputLabel}>Costo (editable)</RNText>
            <TextInput
              value={eCosto}
              onChangeText={(t) => {
                setECosto(t);
                // Si el usuario escribe manualmente, desactivamos el auto-cálculo
                if (autoCosto) setAutoCosto(false);
              }}
              placeholder="Costo final"
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={cancelarEdicion}>
                <RNText style={styles.actionText}>Cancelar</RNText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={confirmarEdicion}>
                <RNText style={[styles.actionText, { color: '#fff' }]}>Guardar</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    paddingBottom: 32,
  },
  headerWrap: {
    marginBottom: 12,
  },
  footerWrap: {
    marginTop: 16,
    paddingBottom: 24,
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111',
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchRow: {
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtn: {
    backgroundColor: '#eee',
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
  actionText: {
    fontWeight: '700',
    color: '#222',
  },
});
