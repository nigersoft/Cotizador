// screens/EditarCotizacion.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, Alert, FlatList, TextInput, Modal,
  TouchableOpacity, Text as RNText, Switch, Keyboard, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getDBConnection,
  getVentanasPorCotizacion,
  deleteVentanas,
  UpdateCotizacion,
  insertVentana
} from '../ModuloDb/MDb';

import { CalcularCostos, actualizarVentana } from '../services/ModuloFunciones';

import VentanaItem from '../components/VentanaItem';
import ClientesDropdown from '../components/ClientesDropdown';
import FormularioVentana from '../components/FormularioVentana';

// ===== Helper de redondeo =====
const redondear = (valor, paso = 100) => {
  const n = Number(valor);
  if (Number.isNaN(n)) return valor;
  return Math.round(n / paso) * paso;
};

const EditarCotizacion = ({ route, navigation }) => {
  const { cotizacion } = route.params;
  const insets = useSafeAreaInsets();

  const [db, setDb] = useState(null);
  const [ventanas, setVentanas] = useState([]);
  const [idCliente, setIdCliente] = useState();
  const [Descripcion, setDescripcion] = useState('');

  // ====== Estado para nueva ventana ======
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaBase, setNuevaBase] = useState('');
  const [nuevaAltura, setNuevaAltura] = useState('');
  const [idVidrio, setIdVidrio] = useState(null);

  // ====== Estado para modal agregar ventana ======
  const [agregarVisible, setAgregarVisible] = useState(false);

  // ====== Estado para edición inline (modal nativo) ======
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [eDesc, setEDesc] = useState('');
  const [eBase, setEBase] = useState('');
  const [eAltura, setEAltura] = useState('');
  const [eCosto, setECosto] = useState('');
  const [autoCosto, setAutoCosto] = useState(true);
  const [pasoRedondeo, setPasoRedondeo] = useState(100);

  // Función auxiliar para normalizar números (acepta "." y ",")
  const normalizarNumero = (valor) => {
    if (!valor) return null;
    // Reemplazar coma por punto y eliminar espacios
    const normalizado = String(valor).trim().replace(',', '.');
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? null : numero;
  };

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
  }, [cotizacion, cargarDatos]);

  // === Cargar datos desde SQL ===
  const cargarDatos = useCallback(async (database) => {
    const v = await getVentanasPorCotizacion(database, cotizacion.Id);
    setIdCliente(cotizacion.IdCliente);
    setDescripcion(cotizacion.Descripcion ?? '');
    setVentanas(v);
  }, [cotizacion.Id, cotizacion.IdCliente, cotizacion.Descripcion]);

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

      // Normalizar y validar números
      const baseNormalizada = normalizarNumero(eBase);
      const alturaNormalizada = normalizarNumero(eAltura);

      if (!baseNormalizada || !alturaNormalizada) return;

      try {
        const costoBase = await CalcularCostos(baseNormalizada, alturaNormalizada, editItem.IdVidrio);
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

    // Normalizar valores numéricos
    const baseNormalizada = normalizarNumero(eBase);
    const alturaNormalizada = normalizarNumero(eAltura);
    const costoNormalizado = normalizarNumero(eCosto);

    // Validaciones
    if (!eDesc.trim()) {
      Alert.alert('Validación', 'La descripción es requerida.');
      return;
    }
    if (!baseNormalizada || !alturaNormalizada) {
      Alert.alert('Validación', 'Base y Altura deben ser valores numéricos válidos.');
      return;
    }
    if (!costoNormalizado) {
      Alert.alert('Validación', 'El Costo debe ser un valor numérico válido.');
      return;
    }

    const updated = {
      Id: editItem.Id,
      IdCotizacion: editItem.IdCotizacion,
      IdVidrio: editItem.IdVidrio,
      Descripcion: eDesc.trim(),
      Costo: costoNormalizado,
      Base: baseNormalizada,
      Altura: alturaNormalizada,
    };

    try {
      if (!db) throw new Error('BD no inicializada');
      await actualizarVentana(updated); // <-- persistir

      // Cerrar el teclado después de actualizar
      Keyboard.dismiss();

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
    Keyboard.dismiss();
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

  // ===== Agregar nueva ventana: inserta en SQL y recarga =====
  const agregarNuevaVentana = async () => {
    // Normalizar Base y Altura para aceptar "." y ","
    const baseNormalizada = normalizarNumero(nuevaBase);
    const alturaNormalizada = normalizarNumero(nuevaAltura);

    if (
      !baseNormalizada ||
      !alturaNormalizada ||
      !nuevaDescripcion || nuevaDescripcion.trim() === '' ||
      !idVidrio
    ) {
      Alert.alert("Validación", "Por favor complete todos los campos con valores válidos.");
      return;
    }

    try {
      if (!db) throw new Error('BD no inicializada');

      const costoBase = await CalcularCostos(baseNormalizada, alturaNormalizada, idVidrio);
      const precio = costoBase * 1.30;

      const nuevaVentana = {
        IdCotizacion: cotizacion.Id,
        IdVidrio: idVidrio,
        Descripcion: nuevaDescripcion.trim(),
        Costo: precio,
        Base: baseNormalizada,
        Altura: alturaNormalizada,
      };

      await insertVentana(db, nuevaVentana);

      // Cerrar el teclado después de agregar
      Keyboard.dismiss();

      // Cerrar el modal
      setAgregarVisible(false);

      // Limpiar formulario
      setNuevaDescripcion('');
      setNuevaBase('');
      setNuevaAltura('');
      setIdVidrio(null);

      // Recargar ventanas desde SQL
      await cargarDatos(db);
      Alert.alert('✅ Éxito', 'Ventana agregada correctamente');
    } catch (err) {
      console.error('Error al agregar ventana:', err);
      Alert.alert('❌ Error', 'No se pudo agregar la ventana.');
    }
  };

  const guardarCambios = async () => {
    try {
      if (!db) throw new Error('BD no inicializada');
      await UpdateCotizacion(db, cotizacion.Id, Descripcion);
      Alert.alert('✅ Guardado', 'Cambios de la cotización actualizados');
      navigation.navigate('CotizacionesGen');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Text style={styles.label}>Descripción:</Text>
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
        </View>

        <Text style={styles.sectionTitle}>Ventanas:</Text>

        <FlatList
          data={ventanas}
          keyExtractor={(item) => item.Id.toString()}
          renderItem={({ item }) => (
            <VentanaItem
              Ventana={item}
              onEdit={handleEdit}
              onDelete={handleDeleteVentana}
            />
          )}
          style={styles.ventanasList}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />

        <Button
          mode="outlined"
          style={styles.addButton}
          onPress={() => setAgregarVisible(true)}
          icon="plus"
        >
          Agregar Nueva Ventana
        </Button>

        <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Button
            mode="contained"
            style={styles.button}
            onPress={guardarCambios}
          >
            Guardar Cambios
          </Button>
        </View>
      </ScrollView>

      {/* ===== Modal para agregar nueva ventana ===== */}
      <Modal
        visible={agregarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAgregarVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <RNText style={styles.modalTitle}>Agregar Nueva Ventana</RNText>

            <FormularioVentana
              Descripcion={nuevaDescripcion}
              setDescripcion={setNuevaDescripcion}
              Base={nuevaBase}
              setBase={setNuevaBase}
              Altura={nuevaAltura}
              setAltura={setNuevaAltura}
              idCliente={idCliente}
              setIdCliente={setIdCliente}
              idVidrio={idVidrio}
              setIdVidrio={setIdVidrio}
              onSubmit={agregarNuevaVentana}
              textoBoton="Agregar ventana"
              mostrarCliente={false}
              mostrarVidrio={true}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => {
                  Keyboard.dismiss();
                  setAgregarVisible(false);
                }}
              >
                <RNText style={styles.actionText}>Cancelar</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== Modal nativo para edición inline ===== */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={cancelarEdicion}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
            <View style={styles.costoRow}>
              <TextInput
                value={eCosto}
                onChangeText={(t) => {
                  setECosto(t);
                  if (autoCosto) setAutoCosto(false); // al escribir, desactiva auto
                }}
                placeholder="Costo final"
                keyboardType="numeric"
                style={[styles.mInput, styles.costoInput]}
              />
              <TouchableOpacity
                style={[styles.actionBtn, styles.roundBtn]}
                onPress={() => setECosto(String(redondear(eCosto, pasoRedondeo)))}
              >
                <RNText style={styles.roundBtnText}>Redondear</RNText>
              </TouchableOpacity>
            </View>

            {/* Selector rápido del paso */}
            <View style={styles.stepPillContainer}>
              {[100, 500, 1000].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.stepPill,
                    pasoRedondeo === p && styles.stepPillActive
                  ]}
                  onPress={() => setPasoRedondeo(p)}
                >
                  <RNText style={pasoRedondeo === p ? styles.stepPillTextActive : styles.stepPillText}>
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
                <RNText style={styles.saveBtnText}>Guardar</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    backgroundColor: '#F5F7FA',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1A1C1E',
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ventanasList: {
    marginBottom: 16,
  },
  addButton: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  buttonContainer: {
    marginTop: 12,
  },
  button: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 15,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1A1C1E',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  mInput: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  switchRow: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
  roundBtn: {
    backgroundColor: '#2196F3',
  },
  stepPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
  },
  saveBtnText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
  },
  roundBtnText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
  costoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  costoInput: {
    flex: 1,
  },
  stepPillContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  stepPillActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  stepPillText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 13,
  },
  stepPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default EditarCotizacion;
