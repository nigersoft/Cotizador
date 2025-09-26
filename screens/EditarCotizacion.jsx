// screens/EditarCotizacion.jsx
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Alert, FlatList, TextInput, Modal,
  TouchableOpacity, Text as RNText, Switch
} from 'react-native';
import { Text, Button } from 'react-native-paper';

import {
  getDBConnection,
  getVentanasPorCotizacion,
  deleteVentanas,
  UpdateCotizacion
} from '../ModuloDb/MDb';

import { CalcularCostos, actualizarVentana } from '../services/ModuloFunciones';

import VentanaItem from '../components/VentanaItem';
import ClientesDropdown from '../components/ClientesDropdown';

// ===== Helper de redondeo =====
const redondear = (valor, paso = 100) => {
  const n = Number(valor);
  if (Number.isNaN(n)) return valor;
  return Math.round(n / paso) * paso;
};

const EditarCotizacion = ({ route, navigation }) => {
  const { cotizacion } = route.params;

  const [db, setDb] = useState(null);
  const [ventanas, setVentanas] = useState([]);
  const [idCliente, setIdCliente] = useState();
  const [Descripcion, setDescripcion] = useState('');

  // ====== Estado para edición inline (modal nativo) ======
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [eDesc, setEDesc] = useState('');
  const [eBase, setEBase] = useState('');
  const [eAltura, setEAltura] = useState('');
  const [eCosto, setECosto] = useState('');
  const [autoCosto, setAutoCosto] = useState(true);
  const [pasoRedondeo, setPasoRedondeo] = useState(100);

  // === Inicialización ===
  useEffect(() => {
    const init = async () => {
      try {
        const database = await getDBConnection();
        setDb(database);
        setVentanas([]);
        await cargarDatos(database);
        setIdCliente(cotizacion.IdCliente);
        setDescripcion(cotizacion.Descripcion ?? '');
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudo cargar la cotización");
      }
    };
    init();
  }, [cotizacion]);

  // === Cargar datos desde SQL ===
  const cargarDatos = async (database) => {
    const v = await getVentanasPorCotizacion(database, cotizacion.Id);
    setIdCliente(cotizacion.IdCliente);
    setDescripcion(cotizacion.Descripcion ?? '');
    setVentanas(v);
  };

  // ====== Editar: abrir modal con datos del ítem ======
  const handleEdit = (ventana) => {
    setEditItem(ventana);
    setEDesc(ventana?.Descripcion ?? '');
    setEBase(String(ventana?.Base ?? ''));
    setEAltura(String(ventana?.Altura ?? ''));
    setECosto(String(ventana?.Costo ?? ''));
    setAutoCosto(true);
    setEditVisible(true);
  };

  // Recalcular costo en modal cuando cambian base/altura y hay autoCosto
  useEffect(() => {
    let cancelled = false;
    const recalc = async () => {
      if (!editVisible || !autoCosto || !editItem) return;
      if (!eBase || isNaN(eBase) || !eAltura || isNaN(eAltura)) return;
      try {
        const costoBase = await CalcularCostos(eBase, eAltura, editItem.IdVidrio);
        const precio = costoBase * 1.30; // margen fijo
        if (!cancelled) setECosto(String(precio));
      } catch {
        // noop
      }
    };
    recalc();
    return () => { cancelled = true; };
  }, [eBase, eAltura, autoCosto, editVisible, editItem]);

  // ====== Confirmar edición: guarda en SQL y recarga ======
  const confirmarEdicion = async () => {
    if (!editItem) return;

    // Validaciones
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

    const updated = {
      Id: editItem.Id,
      IdCotizacion: editItem.IdCotizacion,
      IdVidrio: editItem.IdVidrio,
      Descripcion: eDesc.trim(),
      Costo: parseFloat(eCosto),
      Base: parseFloat(eBase),
      Altura: parseFloat(eAltura),
    };

    try {
      if (!db) throw new Error('BD no inicializada');
      await actualizarVentana(db, updated); // <-- persistir
      setEditVisible(false);
      setEditItem(null);
      // 🔄 Releer SIEMPRE desde SQL para sincronía total
      await cargarDatos(db);
      Alert.alert('✅ Éxito', 'Ventana actualizada correctamente');
    } catch (err) {
      console.error('Error al actualizar ventana:', err);
      Alert.alert('❌ Error', 'No se pudo actualizar la ventana.');
    }
  };

  const cancelarEdicion = () => {
    setEditVisible(false);
    setEditItem(null);
  };

  // ===== Eliminar: borra en SQL y recarga =====
  const handleDeleteVentana = (id) => {
    const ventanaSeleccionada = ventanas.find(v => v.Id === id);

    Alert.alert(
      '¿Eliminar ventana?',
      `¿Deseas eliminar la ventana "${ventanaSeleccionada?.Nombre || ventanaSeleccionada?.Descripcion || 'sin nombre'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!db) throw new Error('BD no inicializada');
              await deleteVentanas(db, id);   // <-- pasar db
              // 🔄 Releer desde SQL para sincronía completa
              await cargarDatos(db);
              Alert.alert('✅ Eliminado', 'La ventana ha sido eliminada.');
            } catch (error) {
              console.error('Error al eliminar la ventana:', error);
              Alert.alert('❌ Error', 'No se pudo eliminar la ventana.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const guardarCambios = async () => {
    try {
      if (!db) throw new Error('BD no inicializada');
      await UpdateCotizacion(db, cotizacion.Id, Descripcion);
      Alert.alert('✅ Guardado', 'Cambios de la cotización actualizados');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Descripcion:</Text>
      <TextInput
        style={styles.input}
        value={Descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej: Ventana Principal"
      />

      <Text style={styles.label}>Cliente</Text>
      <ClientesDropdown
        key={idCliente}
        initialValue={idCliente}
        onChange={(item) => setIdCliente(item.value)}
      />

      <Text style={styles.label}>Ventanas:</Text>

      <FlatList
        data={ventanas}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <VentanaItem
            Ventana={item}
            onEdit={handleEdit}                 // abre modal inline
            onDelete={handleDeleteVentana}     // elimina en SQL y recarga
          />
        )}
      />

      <Button
        mode="contained"
        style={styles.button}
        onPress={guardarCambios}
      >
        Guardar Cambios
      </Button>

      {/* ===== Modal nativo para edición inline ===== */}
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
              style={styles.mInput}
              autoCapitalize="sentences"
            />

            <RNText style={styles.inputLabel}>Base (cm)</RNText>
            <TextInput
              value={eBase}
              onChangeText={setEBase}
              placeholder="Base"
              keyboardType="numeric"
              style={styles.mInput}
            />

            <RNText style={styles.inputLabel}>Altura (cm)</RNText>
            <TextInput
              value={eAltura}
              onChangeText={setEAltura}
              placeholder="Altura"
              keyboardType="numeric"
              style={styles.mInput}
            />

            <View style={styles.switchRow}>
              <RNText style={styles.switchLabel}>Actualizar costo automáticamente</RNText>
              <Switch value={autoCosto} onValueChange={setAutoCosto} />
            </View>

            <RNText style={styles.inputLabel}>Costo (editable)</RNText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={eCosto}
                onChangeText={(t) => {
                  setECosto(t);
                  if (autoCosto) setAutoCosto(false); // al escribir, desactiva auto
                }}
                placeholder="Costo final"
                keyboardType="numeric"
                style={[styles.mInput, { flex: 1 }]}
              />
              <TouchableOpacity
                style={[styles.actionBtn, styles.roundBtn]}
                onPress={() => setECosto(String(redondear(eCosto, pasoRedondeo)))}
              >
                <RNText style={[styles.actionText, { color: '#fff' }]}>Redondear</RNText>
              </TouchableOpacity>
            </View>

            {/* Selector rápido del paso */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {[100, 500, 1000].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.stepPill,
                    pasoRedondeo === p && { backgroundColor: '#2196F3' }
                  ]}
                  onPress={() => setPasoRedondeo(p)}
                >
                  <RNText style={{ color: pasoRedondeo === p ? '#fff' : '#222', fontWeight: '700' }}>
                    ₡{p}
                  </RNText>
                </TouchableOpacity>
              ))}
            </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: '#f9f9f9',
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  // Modal
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
  mInput: {
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
  roundBtn: {
    backgroundColor: '#2196F3',
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eee',
  },
  actionText: {
    fontWeight: '700',
    color: '#222',
  },
});

export default EditarCotizacion;
