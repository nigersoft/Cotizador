import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, FlatList, View, Modal, TextInput, TouchableOpacity, Text as RNText, Switch, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Divider, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VentanaItem from '../components/VentanaItem';
import FormularioVentana from '../components/FormularioVentana';

import { getDBConnection } from '../ModuloDb/MDb';
import { formatearColones, CalcularCostos, GuardarCotizacion } from '../services/ModuloFunciones';

// Separator component defined outside to prevent recreation
const ItemSeparator = () => <View style={styles.separator} />;

// ===== Helper de redondeo =====
const redondear = (valor, paso = 100) => {
  const n = Number(valor);
  if (Number.isNaN(n)) return valor;
  return Math.round(n / paso) * paso;
};

export default function CotizacionesScreen() {
  const insets = useSafeAreaInsets();
  const [Altura, setAltura] = useState('');
  const [Base, setBase] = useState('');
  const [Descripcion, setDescripcion] = useState('');
  const [idCliente, setIdCliente] = useState(null);
  const [idVidrio, setIdVidrio] = useState(null);
  const [Ventanas, setVentanas] = useState([]);
  const [Total, setTotal] = useState(0);
  const [db, setDb] = useState(null);
  const [dropdownKey, setDropdownKey] = useState(0); // Para forzar re-render de dropdowns

  // ====== ESTADO PARA EDICIÓN INLINE (MODAL NATIVO) ======
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [eDesc, setEDesc] = useState('');
  const [eBase, setEBase] = useState('');
  const [eAltura, setEAltura] = useState('');
  const [eCosto, setECosto] = useState('');            // costo mostrado/editable
  const [autoCosto, setAutoCosto] = useState(true);    // recalcular automáticamente
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
    // Reemplazar coma por punto y eliminar espacios
    const normalizado = String(valor).trim().replace(',', '.');
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? null : numero;
  };

  const Agregar = async () => {
    // Normalizar Base y Altura para aceptar "." y ","
    const baseNormalizada = normalizarNumero(Base);
    const alturaNormalizada = normalizarNumero(Altura);

    if (
      !baseNormalizada ||
      !alturaNormalizada ||
      !Descripcion || Descripcion.trim() === '' ||
      !idCliente ||
      !idVidrio
    ) {
      Alert.alert("Validación", "Por favor complete todos los campos con valores válidos.");
      return;
    }

    const costoBase = await CalcularCostos(baseNormalizada, alturaNormalizada, idVidrio);
    const precio = costoBase * 1.30;

    const nuevaVentana = {
      Id: Date.now().toString(),
      IdVidrio: idVidrio,
      Descripcion,
      Costo: `${precio}`, // en tu modelo "Costo" guarda el precio final
      Base: baseNormalizada,
      Altura: alturaNormalizada,
    };

    setVentanas(prev => [...prev, nuevaVentana]);
    setDescripcion('');
    setBase('');
    setAltura('');
    setTotal(prevTotal => prevTotal + precio);

    // Cerrar el teclado después de agregar la ventana
    Keyboard.dismiss();

    Alert.alert(`Ventana agregada con ID: ${nuevaVentana.Id}`);
  };

  const Guardar = async () => {
    if (!Ventanas || Ventanas.length === 0) {
      Alert.alert("Error", "Debe ingresar al menos una ventana.");
      return;
    }

    try {
      await GuardarCotizacion(idCliente, Ventanas);
      Alert.alert("¡Cotización guardada exitosamente!");

      // Limpiar todo el formulario
      setVentanas([]);
      setTotal(0);
      setDescripcion('');
      setBase('');
      setAltura('');
      setIdCliente(null);
      setIdVidrio(null);

      // Incrementar key para forzar re-render de dropdowns
      setDropdownKey(prev => prev + 1);
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

      // Normalizar y validar números
      const baseNormalizada = normalizarNumero(eBase);
      const alturaNormalizada = normalizarNumero(eAltura);

      if (!baseNormalizada || !alturaNormalizada) return;

      try {
        const costoBase = await CalcularCostos(baseNormalizada, alturaNormalizada, editItem.IdVidrio);
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

    // Normalizar valores numéricos
    const baseNormalizada = normalizarNumero(eBase);
    const alturaNormalizada = normalizarNumero(eAltura);
    const costoNormalizado = normalizarNumero(eCosto);

    // Validaciones mínimas
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
        // Conservamos IdVidrio original del item
        Costo: String(costoNormalizado), // permitimos override manual
      };

      handleActualizarVentana(actualizado);

      // Cerrar el teclado después de actualizar
      Keyboard.dismiss();

      setEditVisible(false);
      setEditItem(null);
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la ventana.');
    }
  };

  const cancelarEdicion = () => {
    Keyboard.dismiss();
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay ventanas agregadas aún.</Text>
          }
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <FormularioVentana
                key={dropdownKey}
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
            <View style={[styles.footerWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <Text style={styles.totalText}>TOTAL: {formatearColones(Total)}</Text>
              <Button mode="contained" style={styles.saveButton} onPress={Guardar}>
                Guardar Cotización
              </Button>
            </View>
          }
          contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          removeClippedSubviews
        />
      </KeyboardAvoidingView>

      {/* ===== MODAL NATIVO PARA EDICIÓN INLINE ===== */}
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
            <View style={styles.costoRow}>
              <TextInput
                value={eCosto}
                onChangeText={(t) => {
                  setECosto(t);
                  // Si el usuario escribe manualmente, desactivamos el auto-cálculo
                  if (autoCosto) setAutoCosto(false);
                }}
                placeholder="Costo final"
                keyboardType="numeric"
                style={[styles.input, styles.costoInput]}
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
    </>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    padding: 16,
    backgroundColor: '#F5F7FA',
  },
  headerWrap: {
    marginBottom: 12,
  },
  footerWrap: {
    marginTop: 16,
    paddingTop: 20,
    backgroundColor: '#F5F7FA',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1A1C1E',
  },
  totalText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 16,
    color: '#2196F3',
  },
  saveButton: {
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
  separator: {
    height: 12,
  },

  // Modal styles
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
  input: {
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
  stepPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
