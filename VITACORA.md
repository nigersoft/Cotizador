# VITÁCORA DEL PROYECTO COTIZADOR

> **IMPORTANTE**: Este archivo mantiene un registro histórico del desarrollo del proyecto. Claude Code debe consultar esta vitácora para entender el contexto y evolución del proyecto antes de realizar cambios importantes.

---

## 📋 INFORMACIÓN DEL PROYECTO

**Nombre**: Cotizador de Ventanas
**Inicio del proyecto**: Enero 2025
**Tecnologías**: Expo SDK 54, React Native 0.81.4, SQLite, React Native Paper
**Propósito**: Aplicación móvil para crear y gestionar cotizaciones de instalación de ventanas/vidrios

---

## 🎯 ESTADO ACTUAL DEL PROYECTO

### Versión: v0.9 (En desarrollo)
**Última actualización**: 31 de octubre de 2025

### Funcionalidades Implementadas ✅

#### Módulo de Clientes
- ✅ Listado de clientes con búsqueda
- ✅ Crear nuevo cliente (NuevoClienteScreen.jsx)
- ✅ Editar cliente existente (EditarClienteScreen.jsx)
- ✅ Eliminar clientes
- ✅ Dropdown de selección de clientes con búsqueda (ClientesDropdown.jsx)

#### Módulo de Vidrios/Materiales
- ✅ Gestión de tipos de vidrio (precio por metro cuadrado)
- ✅ Crear y editar tipos de vidrio (NuevoVidrio.jsx, EditarVidrioScreen.jsx)
- ✅ Gestión de materiales (13 materiales: cargador, umbra, jamba, etc.)
- ✅ Pantalla de configuración de costos de materiales (MaterialesScreen.js)
- ✅ Dropdown de selección de vidrios (VidriosDropdown.jsx)

#### Módulo de Cotizaciones
- ✅ Crear nueva cotización (CotizacionScreen.jsx)
- ✅ Formulario de ventanas con dimensiones (Base x Altura en cm)
- ✅ Cálculo automático de costos basado en dimensiones y materiales
- ✅ Opción de sobrescribir costos manualmente
- ✅ Edición inline de ventanas mediante Modal
- ✅ Listar todas las cotizaciones generadas (CotizacionesGeneradas.js)
- ✅ Editar cotización existente (EditarCotizacion.jsx)
- ✅ Editar ventanas individuales (EditarVentana.jsx)
- ✅ Eliminar cotizaciones

#### Módulo de Exportación
- ✅ Exportar cotización a PDF (ExportarCotizacion.jsx)
- ✅ Compartir PDF mediante expo-sharing
- ✅ Plantilla HTML con información del cliente, fecha, items y totales
- ✅ Formato con moneda de Costa Rica (₡)

#### Base de Datos
- ✅ SQLite local con patrón Singleton (DatabaseManager)
- ✅ Base de datos pre-poblada que se copia en primera ejecución
- ✅ Retry logic para conexiones (3 intentos con exponential backoff)
- ✅ Transacciones para operaciones múltiples
- ✅ Tablas: Clientes, Cotizaciones, Ventanas, Vidrios, Materiales

#### Sistema de Cálculos
- ✅ Algoritmo de cálculo de costos (CalcularCostos) en ModuloFunciones.jsx
- ✅ Fórmulas específicas por material según dimensiones de ventana
- ✅ Cálculo de costo de vidrio por m²
- ✅ **Sistema de impuestos implementado** (tipo de impuesto por cotización)
- ✅ Funciones: CalcularCostoConImpuesto, ObtenerTipoImpuestoCotizacion

#### Navegación y UI
- ✅ Drawer Navigation con React Navigation
- ✅ Tema de React Native Paper configurado
- ✅ Componentes reutilizables (Items para listas)
- ✅ Formateo de moneda (formatearColones)
- ✅ Formato de fecha DD/MM/YYYY

---

## 🐛 ISSUES CONOCIDOS

### ✅ Resueltos
- ~~**Bug en cálculo de impuestos AGREGADO**~~ (Resuelto: 31/10/2025)
  - La función `CalcularCostoConImpuesto` retornaba solo el 13% en lugar de costo + 13%
  - Corregido en `services/ModuloFunciones.jsx:429`

### 🟡 Pendiente de Revisión
- Sistema de impuestos requiere pruebas exhaustivas en todos los escenarios
- Verificar integridad de cálculos con diferentes combinaciones de impuestos

---

## 📝 REGISTRO DE CAMBIOS

### 2025-10-31 (noche)
**Bug Fix**: Corregido guardado prematuro de ventanas en EditarCotizacion
- **Problema**: Al agregar una nueva ventana en EditarCotizacion, se guardaba inmediatamente en BD sin esperar a "Guardar Cambios". Si el usuario se devolvía sin guardar, la ventana quedaba guardada de todos modos.
- **Causa**: La función `agregarNuevaVentana()` llamaba a `insertVentana()` inmediatamente, insertando en BD al momento de agregar
- **Solución**: Implementado sistema de ventanas pendientes con IDs temporales negativos
  - Las ventanas nuevas se mantienen solo en estado local (`ventanasNuevas`)
  - Se guardan en BD solo al presionar "Guardar Cambios"
  - Si se cancela o se regresa, las ventanas nuevas se descartan
  - Soporte para editar y eliminar ventanas nuevas antes de guardar
- **Archivos modificados**:
  - screens/EditarCotizacion.jsx
- **Cambios técnicos**:
  - Agregado estado `ventanasNuevas` y `contadorTemp` para IDs temporales
  - Modificado `agregarNuevaVentana()` para usar estado local
  - Modificado `handleDeleteVentana()` para distinguir ventanas existentes vs nuevas
  - Modificado `confirmarEdicion()` para editar ventanas nuevas en estado local
  - Modificado `guardarCambios()` para insertar ventanas nuevas en BD
  - Modificado `calcularCostoVentanas()` para incluir ventanas nuevas

### 2025-10-31 (tarde)
**Commit**: `8b43979` - "fix: Corregir cálculo de impuesto AGREGADO y mejorar validación de clientes"
- **Bug Fix - Sistema de Impuestos**:
  - Problema: Al agregar impuesto tipo AGREGADO a una cotización, el listado mostraba solo el 13% del impuesto en lugar del costo total + 13%
  - Causa: Error en `CalcularCostoConImpuesto()` que multiplicaba por `PORCENTAJE_IMPUESTO` (0.13) en lugar de `(1 + PORCENTAJE_IMPUESTO)` (1.13)
  - Solución: Corregido en `services/ModuloFunciones.jsx:429`
  - Actualizado `getAllCotizaciones()` en `ModuloDb/MDb.js` para aplicar impuestos correctamente
- **Mejora - Validación de Clientes**:
  - Actualizado `NuevoClienteScreen.jsx`
  - Solo Nombre y Teléfono son campos obligatorios
  - Apellidos y Email son opcionales (se guardan como null si vacíos)
  - Labels sin marcadores visuales para invitar a completar todos los campos
- **Archivos modificados**:
  - services/ModuloFunciones.jsx
  - ModuloDb/MDb.js
  - screens/NuevoClienteScreen.jsx
  - VITACORA.md

### 2025-10-31 (mañana)
**Commit**: `1d36514` - "docs: Agregar VITACORA.md y actualizar CLAUDE.md"
- Creado sistema de vitácora para mantener contexto del proyecto
- Actualizado CLAUDE.md para referenciar la vitácora
- Documentado estado completo del proyecto y funcionalidades implementadas

### 2025-10-31 (anterior)
**Commit**: `e239544` - "Refactor realizado, pero aún con bugs"
- Se realizó refactorización mayor en módulos de base de datos y funciones
- Sistema de impuestos modificado/mejorado
- **Estado**: Bugs pendientes de corrección
- **Archivos modificados**:
  - ModuloDb/MDb.js
  - services/ModuloFunciones.jsx

### 2025-10-30 (aprox)
**Commit**: `c7c3294` - "Respaldo antes de refactorización para impuestos"
- Punto de respaldo antes de cambios mayores
- Preparación para refactorización del sistema de impuestos

### 2025-10-29 (aprox)
**Commit**: `3907a7d` - "Mejorado la IU/UX y impuestos"
- Mejoras en interfaz de usuario y experiencia
- Primera implementación/mejora del sistema de impuestos

### 2025-10-28 (aprox)
**Commit**: `674e264` - "Ajustes con Claude primera vez"
- Primera sesión de trabajo con Claude Code
- Ajustes iniciales al proyecto

### Fecha anterior
**Commits iniciales**: Setup del proyecto Expo con estructura base
- Inicialización con Expo SDK 54
- Configuración de React Native Paper
- Setup de SQLite y estructura de base de datos

---

## 🔮 TAREAS FUTURAS / BACKLOG

### Prioridad Alta
- [ ] Resolver bugs del último refactor (commit e239544)
- [ ] Validar funcionamiento del sistema de impuestos
- [ ] Pruebas de integridad de cálculos

### Prioridad Media
- [ ] Mejorar manejo de errores en toda la aplicación
- [ ] Agregar validaciones de formularios más robustas
- [ ] Optimizar rendimiento de consultas a BD

### Prioridad Baja
- [ ] Agregar tests unitarios
- [ ] Documentar algoritmos de cálculo en detalle
- [ ] Considerar modo offline/sincronización

---

## 💡 NOTAS TÉCNICAS IMPORTANTES

### Patrón de Base de Datos
- **Siempre** usar `await getDBConnection()` antes de operaciones de BD
- **No** crear múltiples conexiones (patrón Singleton)
- **Usar** transacciones (BEGIN/COMMIT/ROLLBACK) para operaciones múltiples

### Cálculos y Fórmulas
- Las dimensiones se almacenan en **centímetros** como enteros
- Los costos son **floats**
- Los cambios en costos de materiales **NO** afectan cotizaciones existentes
- Sistema de impuestos se aplica por cotización

### Convenciones de Código
- Formato de fecha: `DD/MM/YYYY`
- Formato de moneda: `₡ 1 000.00` (Colones costarricenses)
- Errores se muestran con `Alert.alert()`
- Navegación pasa datos vía `route.params`

---

## 📚 PLANTILLA PARA NUEVAS ENTRADAS

```markdown
### YYYY-MM-DD
**Descripción breve del cambio**
- Detalle 1
- Detalle 2
- **Archivos modificados/creados**:
  - ruta/archivo1
  - ruta/archivo2
- **Issues resueltos**: #número (si aplica)
- **Nuevos issues conocidos**: Descripción (si aplica)
- **Testing realizado**: Descripción de pruebas
```

---

## 🔗 REFERENCIAS

- [CLAUDE.md](./CLAUDE.md) - Guía de arquitectura y desarrollo
- [README.md](./README.md) - Documentación general del proyecto
- Expo Docs: https://docs.expo.dev/
- React Native Paper: https://callstack.github.io/react-native-paper/

---

**Última revisión de esta vitácora**: 31 de octubre de 2025
