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

import {
  CalcularCostos,
  actualizarVentana,
  formatearColones,
  CalcularMontoImpuesto,
  GetInfoImpuestos,
  GuardarImpuesto
} from '../services/ModuloFunciones';

import { TIPOS_IMPUESTO } from '../constants/TiposImpuesto';

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
  const [ventanasNuevas, setVentanasNuevas] = useState([]); // Ventanas pendientes de guardar
  const [contadorTemp, setContadorTemp] = useState(-1); // IDs temporales negativos
  const [ventanasPendientesEliminar, setVentanasPendientesEliminar] = useState([]); // IDs de ventanas a eliminar

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

  // ====== Estado para impuestos ======
  const [impuestoAplicado, setImpuestoAplicado] = useState(null); // 'agregado', 'incluido', o null
  const [montoImpuesto, setMontoImpuesto] = useState(0);
  const [costoSinImpuesto, setCostoSinImpuesto] = useState(0);
  const [costoTotal, setCostoTotal] = useState(0);

  // Función auxiliar para normalizar números (acepta "." y ",")
  const normalizarNumero = (valor) => {
    if (!valor) return null;
    // Reemplazar coma por punto y eliminar espacios
    const normalizado = String(valor).trim().replace(',', '.');
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? null : numero;
  };

  // === Calcular costo total de ventanas (existentes + nuevas - pendientes eliminar) ===
  const calcularCostoVentanas = () => {
    const costoExistentes = ventanas
      .filter(v => !ventanasPendientesEliminar.includes(v.Id))
      .reduce((sum, v) => sum + (v.Costo || 0), 0);
    const costoNuevas = ventanasNuevas.reduce((sum, v) => sum + (v.Costo || 0), 0);
    return costoExistentes + costoNuevas;
  };

  // === Obtener todas las ventanas (existentes + nuevas) para mostrar, excluyendo las marcadas para eliminar ===
  const todasLasVentanas = [
    ...ventanas.filter(v => !ventanasPendientesEliminar.includes(v.Id)),
    ...ventanasNuevas
  ];

  // === Funciones de impuestos ===
  const agregarImpuesto = () => {
    const costoBase = calcularCostoVentanas();
    const impuesto = costoBase * 0.13;
    const nuevoTotal = costoBase + impuesto;

    setImpuestoAplicado('agregado');
    setMontoImpuesto(impuesto);
    setCostoSinImpuesto(costoBase);
    setCostoTotal(nuevoTotal);
  };

  const incluirImpuesto = () => {
    const costoConImpuesto = calcularCostoVentanas();
    const costoBase = costoConImpuesto / 1.13;
    const impuesto = costoBase * 0.13;

    setImpuestoAplicado('incluido');
    setMontoImpuesto(impuesto);
    setCostoSinImpuesto(costoBase);
    setCostoTotal(costoConImpuesto);
  };

  const resetearImpuesto = () => {
    setImpuestoAplicado(null);
    setMontoImpuesto(0);
    setCostoSinImpuesto(0);
    setCostoTotal(0);
  };

  // === Recalcular impuesto cuando cambien las ventanas (existentes, nuevas o pendientes eliminar) ===
  useEffect(() => {
    if (impuestoAplicado && (ventanas.length > 0 || ventanasNuevas.length > 0)) {
      if (impuestoAplicado === 'agregado') {
        const costoBase = calcularCostoVentanas();
        const impuesto = costoBase * 0.13;
        const nuevoTotal = costoBase + impuesto;
        setMontoImpuesto(impuesto);
        setCostoSinImpuesto(costoBase);
        setCostoTotal(nuevoTotal);
      } else if (impuestoAplicado === 'incluido') {
        const costoConImpuesto = calcularCostoVentanas();
        const costoBase = costoConImpuesto / 1.13;
        const impuesto = costoBase * 0.13;
        setMontoImpuesto(impuesto);
        setCostoSinImpuesto(costoBase);
        setCostoTotal(costoConImpuesto);
      }
    }
  }, [ventanas, ventanasNuevas, ventanasPendientesEliminar, impuestoAplicado]);

  // === Inicialización ===
  useEffect(() => {
    const init = async () => {
      try {
        const database = await getDBConnection();
        setDb(database);
        setVentanas([]);
        setVentanasNuevas([]); // Limpiar ventanas nuevas al cargar
        setVentanasPendientesEliminar([]); // Limpiar ventanas pendientes de eliminar
        setContadorTemp(-1); // Resetear contador
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
    setVentanas(v);

    // Cargar información de impuestos usando la nueva función
    try {
      const infoImpuestos = await GetInfoImpuestos(cotizacion.Id);
      const costoBase = infoImpuestos.costoTotal;
      const tipoImpuesto = infoImpuestos.tipoImpuesto;

      if (tipoImpuesto) {
        // Calcular monto e impuesto usando la nueva función
        const { monto, impuesto } = CalcularMontoImpuesto(costoBase, tipoImpuesto);

        setImpuestoAplicado(tipoImpuesto === TIPOS_IMPUESTO.AGREGADO ? 'agregado' : tipoImpuesto === TIPOS_IMPUESTO.INCLUIDO ? 'incluido' : null);
        setMontoImpuesto(impuesto);
        setCostoSinImpuesto(tipoImpuesto === TIPOS_IMPUESTO.AGREGADO ? costoBase : costoBase / 1.13);
        setCostoTotal(monto);
      } else {
        resetearImpuesto();
      }
    } catch (error) {
      console.error('Error cargando información de impuestos:', error);
      resetearImpuesto();
    }
  }, [cotizacion.Id]);

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

  // ====== Confirmar edición: distingue entre ventanas existentes y nuevas ======
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
      // Si es una ventana nueva (ID negativo), actualizar en estado local
      if (editItem.Id < 0) {
        setVentanasNuevas(prev => prev.map(v => v.Id === editItem.Id ? updated : v));
        Keyboard.dismiss();
        setEditVisible(false);
        setEditItem(null);
        Alert.alert('✅ Éxito', 'Ventana actualizada correctamente');
      } else {
        // Si es una ventana existente, actualizar en BD
        if (!db) throw new Error('BD no inicializada');
        await actualizarVentana(updated);
        Keyboard.dismiss();
        setEditVisible(false);
        setEditItem(null);
        // Releer desde SQL
        await cargarDatos(db);
        Alert.alert('✅ Éxito', 'Ventana actualizada correctamente');
      }
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

  // ===== Eliminar: distingue entre ventanas existentes y nuevas =====
  const handleDeleteVentana = (id) => {
    // Buscar en ventanas existentes o nuevas
    const ventanaExistente = ventanas.find(v => v.Id === id);
    const ventanaNueva = ventanasNuevas.find(v => v.Id === id);
    const ventanaSeleccionada = ventanaExistente || ventanaNueva;

    Alert.alert(
      '¿Eliminar ventana?',
      `¿Deseas eliminar la ventana "${ventanaSeleccionada?.Nombre || ventanaSeleccionada?.Descripcion || 'sin nombre'}"?\n\nLa ventana se eliminará al presionar "Guardar Cambios".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            try {
              // Si es una ventana nueva (ID negativo), solo quitarla del estado
              if (id < 0) {
                setVentanasNuevas(prev => prev.filter(v => v.Id !== id));
                Alert.alert('✅ Eliminado', 'La ventana ha sido eliminada.');
              } else {
                // Si es una ventana existente, marcarla para eliminación (NO eliminar de BD todavía)
                setVentanasPendientesEliminar(prev => [...prev, id]);
                Alert.alert('✅ Marcado', 'La ventana se eliminará al guardar los cambios.');
              }
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

  // ===== Agregar nueva ventana: agrega al estado local (NO a BD hasta Guardar) =====
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
      const costoBase = await CalcularCostos(baseNormalizada, alturaNormalizada, idVidrio);
      const precio = costoBase * 1.30;

      // Crear ventana con ID temporal negativo
      const nuevaVentana = {
        Id: contadorTemp, // ID temporal negativo
        IdCotizacion: cotizacion.Id,
        IdVidrio: idVidrio,
        Descripcion: nuevaDescripcion.trim(),
        Costo: precio,
        Base: baseNormalizada,
        Altura: alturaNormalizada,
      };

      // Agregar al estado local (no a BD)
      setVentanasNuevas(prev => [...prev, nuevaVentana]);
      setContadorTemp(prev => prev - 1); // Decrementar para el próximo ID temporal

      // Cerrar el teclado después de agregar
      Keyboard.dismiss();

      // Cerrar el modal
      setAgregarVisible(false);

      // Limpiar formulario
      setNuevaDescripcion('');
      setNuevaBase('');
      setNuevaAltura('');
      setIdVidrio(null);

      Alert.alert('✅ Éxito', 'Ventana agregada. Recuerda presionar "Guardar Cambios" para confirmar.');
    } catch (err) {
      console.error('Error al agregar ventana:', err);
      Alert.alert('❌ Error', 'No se pudo agregar la ventana.');
    }
  };

  const guardarCambios = async () => {
    try {
      if (!db) throw new Error('BD no inicializada');

      // Actualizar descripción
      await UpdateCotizacion(db, cotizacion.Id, Descripcion);

      // Eliminar ventanas marcadas para eliminación de BD
      for (const idVentana of ventanasPendientesEliminar) {
        await deleteVentanas(db, idVentana);
      }

      // Insertar ventanas nuevas en BD
      for (const ventana of ventanasNuevas) {
        const ventanaParaInsertar = {
          IdCotizacion: ventana.IdCotizacion,
          IdVidrio: ventana.IdVidrio,
          Descripcion: ventana.Descripcion,
          Costo: ventana.Costo,
          Base: ventana.Base,
          Altura: ventana.Altura,
        };
        await insertVentana(db, ventanaParaInsertar);
      }

      // Guardar información de impuestos si hay un tipo aplicado
      if (impuestoAplicado) {
        // Mapear el tipo de impuesto al formato esperado en BD
        const tipoImpuestoBD = impuestoAplicado === 'agregado' ? TIPOS_IMPUESTO.AGREGADO
                               : impuestoAplicado === 'incluido' ? TIPOS_IMPUESTO.INCLUIDO
                               : TIPOS_IMPUESTO.SIN_IMPUESTO;
        await GuardarImpuesto(cotizacion.Id, tipoImpuestoBD);
      }

      // Limpiar estados después de guardar
      setVentanasNuevas([]);
      setVentanasPendientesEliminar([]);

      Alert.alert('✅ Guardado', 'Cambios de la cotización actualizados');
      navigation.navigate('CotizacionesGen');
    } catch (error) {
      console.error('Error al guardar:', error);
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
          data={todasLasVentanas}
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

        {/* Sección de impuestos */}
        <View style={styles.impuestoSection}>
          {impuestoAplicado && montoImpuesto > 0 && (
            <View style={styles.desglose}>
              <View style={styles.impuestoRow}>
                <Text style={styles.impuestoLabel}>Subtotal:</Text>
                <Text style={styles.impuestoValue}>{formatearColones(costoSinImpuesto)}</Text>
              </View>
              <View style={styles.impuestoRow}>
                <Text style={styles.impuestoLabel}>Impuesto (13%):</Text>
                <Text style={styles.impuestoValue}>{formatearColones(montoImpuesto)}</Text>
              </View>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>
              {impuestoAplicado
                ? formatearColones(costoTotal)
                : formatearColones(calcularCostoVentanas())}
            </Text>
          </View>

          <View style={styles.botonesImpuesto}>
            {!impuestoAplicado ? (
              <>
                <Button
                  mode="outlined"
                  compact
                  onPress={agregarImpuesto}
                  style={styles.botonImpuesto}
                  labelStyle={styles.botonImpuestoLabel}
                >
                  + Agregar impuesto
                </Button>
                <Button
                  mode="outlined"
                  compact
                  onPress={incluirImpuesto}
                  style={styles.botonImpuesto}
                  labelStyle={styles.botonImpuestoLabel}
                >
                  Incluir impuesto
                </Button>
              </>
            ) : (
              <Button
                mode="outlined"
                compact
                onPress={resetearImpuesto}
                style={styles.botonImpuesto}
                labelStyle={styles.botonImpuestoLabel}
              >
                Quitar impuesto
              </Button>
            )}
          </View>
        </View>

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
  // Estilos para impuestos
  impuestoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  desglose: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  impuestoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  impuestoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  impuestoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  botonesImpuesto: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  botonImpuesto: {
    marginRight: 8,
    marginBottom: 8,
    borderColor: '#2196F3',
  },
  botonImpuestoLabel: {
    fontSize: 12,
    textTransform: 'none',
  },
});

export default EditarCotizacion;
