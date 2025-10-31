import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, FlatList, View, Modal, TextInput, TouchableOpacity, Text as RNText, Switch, Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VentanaItem from '../components/VentanaItem';
import ClientesDropdown from '../components/ClientesDropdown';
import FormularioVentana from '../components/FormularioVentana';

import { getDBConnection } from '../ModuloDb/MDb';
import { formatearColones, CalcularCostos, GuardarCotizacion } from '../services/ModuloFunciones';

// ===== Helper de redondeo =====
const redondear = (valor, paso = 100) => {
  const n = Number(valor);
  if (Number.isNaN(n)) return valor;
  return Math.round(n / paso) * paso;
};

export default function CotizacionesScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Estado principal
  const [idCliente, setIdCliente] = useState(null);
  const [Ventanas, setVentanas] = useState([]);
  const [Total, setTotal] = useState(0);
  const [db, setDb] = useState(null);

  // Estado para modal de agregar nueva ventana
  const [agregarVisible, setAgregarVisible] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaBase, setNuevaBase] = useState('');
  const [nuevaAltura, setNuevaAltura] = useState('');
  const [idVidrio, setIdVidrio] = useState(null);

  // Estado para edición inline (modal nativo)
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [eDesc, setEDesc] = useState('');
  const [eBase, setEBase] = useState('');
  const [eAltura, setEAltura] = useState('');
  const [eCosto, setECosto] = useState('');
  const [autoCosto, setAutoCosto] = useState(true);
  const [pasoRedondeo, setPasoRedondeo] = useState(100);

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

  // Función auxiliar para normalizar números (acepta "." y ",")
  const normalizarNumero = (valor) => {
    if (!valor) return null;
    const normalizado = String(valor).trim().replace(',', '.');
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? null : numero;
  };

  // ===== Agregar nueva ventana (modal) =====
  const agregarNuevaVentana = async () => {
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
      const costoBase = await CalcularCostos(baseNormalizada, alturaNormalizada, idVidrio);
      const precio = costoBase * 1.30;

      const nuevaVentana = {
        Id: Date.now().toString(),
        IdVidrio: idVidrio,
        Descripcion: nuevaDescripcion.trim(),
        Costo: `${precio}`,
        Base: baseNormalizada,
        Altura: alturaNormalizada,
      };

      setVentanas(prev => [...prev, nuevaVentana]);
      setTotal(prevTotal => prevTotal + precio);

      // Limpiar formulario
      setNuevaDescripcion('');
      setNuevaBase('');
      setNuevaAltura('');
      setIdVidrio(null);

      // Cerrar el teclado y el modal
      Keyboard.dismiss();
      setAgregarVisible(false);

      Alert.alert('✅ Éxito', 'Ventana agregada correctamente');
    } catch (err) {
      console.error('Error al agregar ventana:', err);
      Alert.alert('❌ Error', 'No se pudo agregar la ventana.');
    }
  };

  // ===== Guardar cotización =====
  const Guardar = async () => {
    if (!idCliente) {
      Alert.alert("Error", "Debe seleccionar un cliente.");
      return;
    }

    if (!Ventanas || Ventanas.length === 0) {
      Alert.alert("Error", "Debe agregar al menos una ventana.");
      return;
    }

    try {
      await GuardarCotizacion(idCliente, Ventanas);
      Alert.alert("¡Cotización guardada exitosamente!");

      // Limpiar todo
      setVentanas([]);
      setTotal(0);
      setIdCliente(null);
      setNuevaDescripcion('');
      setNuevaBase('');
      setNuevaAltura('');
      setIdVidrio(null);
    } catch (error) {
      Alert.alert("Error al guardar", error.message);
    }
  };

  // ===== Editar ventana (abre el modal con los datos del item en memoria) =====
  const handleEdit = (ventana) => {
    setEditItem(ventana);
    setEDesc(ventana?.Descripcion ?? '');
    setEBase(String(ventana?.Base ?? ''));
    setEAltura(String(ventana?.Altura ?? ''));
    setECosto(String(ventana?.Costo ?? ''));
    setAutoCosto(true);
    setEditVisible(true);
  };

  // Recalcular costo automáticamente cuando cambian Base/Altura y autoCosto está activado
  useEffect(() => {
    let cancelled = false;
    const recalc = async () => {
      if (!editVisible || !autoCosto || !editItem) return;

      const baseNormalizada = normalizarNumero(eBase);
      const alturaNormalizada = normalizarNumero(eAltura);

      if (!baseNormalizada || !alturaNormalizada) return;

      try {
        const costoBase = await CalcularCostos(baseNormalizada, alturaNormalizada, editItem.IdVidrio);
        const precio = costoBase * 1.30;
        if (!cancelled) setECosto(String(precio));
      } catch {
        // Silencioso
      }
    };
    recalc();
    return () => { cancelled = true; };
  }, [eBase, eAltura, autoCosto, editVisible, editItem]);

  const confirmarEdicion = async () => {
    if (!editItem) return;

    const baseNormalizada = normalizarNumero(eBase);
    const alturaNormalizada = normalizarNumero(eAltura);
    const costoNormalizado = normalizarNumero(eCosto);

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

    try {
      const actualizado = {
        ...editItem,
        Descripcion: eDesc,
        Base: baseNormalizada,
        Altura: alturaNormalizada,
        Costo: String(costoNormalizado),
      };

      // Actualizar en memoria
      const nuevasVentanas = Ventanas.map(v =>
        v.Id === actualizado.Id ? actualizado : v
      );
      setVentanas(nuevasVentanas);
      const nuevoTotal = nuevasVentanas.reduce((sum, v) => sum + parseFloat(v.Costo), 0);
      setTotal(nuevoTotal);

      Keyboard.dismiss();
      setEditVisible(false);
      setEditItem(null);

      Alert.alert('✅ Éxito', 'Ventana actualizada correctamente');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la ventana.');
    }
  };

  const cancelarEdicion = () => {
    Keyboard.dismiss();
    setEditVisible(false);
    setEditItem(null);
  };

  // ===== Eliminar ventana =====
  const handleDelete = (Id) => {
    const ventanaEliminada = Ventanas.find(v => v.Id === Id);

    Alert.alert(
      "¿Eliminar ventana?",
      `¿Deseas eliminar la ventana "${ventanaEliminada?.Nombre ?? ventanaEliminada?.Descripcion}"?`,
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
            Alert.alert("✅ Eliminado", "La ventana ha sido eliminada.");
          },
        },
      ]
    );
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
        {/* Sección de Cliente */}
        <View style={styles.headerSection}>
          <Text style={styles.label}>Cliente</Text>
          <ClientesDropdown
            key={idCliente}
            initialValue={idCliente}
            onChange={(item) => setIdCliente(item.value)}
          />
        </View>

        {/* Título de ventanas */}
        <Text style={styles.sectionTitle}>Ventanas:</Text>

        {/* Botón agregar ventana */}
        <Button
          mode="outlined"
          style={styles.addButton}
          textColor="#FF9800"
          onPress={() => setAgregarVisible(true)}
          icon="plus"
        >
          Agregar Nueva Ventana
        </Button>

        {/* Lista de ventanas */}
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
          style={styles.ventanasList}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay ventanas agregadas aún.</Text>
          }
        />

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          <Text style={styles.totalValue}>{formatearColones(Total)}</Text>
        </View>

        {/* Botón guardar */}
        <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Button
            mode="contained"
            style={styles.button}
            onPress={Guardar}
          >
            Guardar Cotización
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
                  if (autoCosto) setAutoCosto(false);
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
}

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
    marginTop: 16,
  },
  addButton: {
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  totalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2196F3',
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
    fontSize: 14,
    fontStyle: 'italic',
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
