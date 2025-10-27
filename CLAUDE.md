# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cotizador** is an Expo-based React Native mobile application for creating and managing window/glass installation quotations (cotizaciones). The app uses SQLite for local data storage and React Native Paper for UI components.

**Tech Stack:**
- Expo SDK 54 with React Native 0.81.4 (New Architecture enabled)
- React Native Paper 5.x for UI
- expo-sqlite for local database
- expo-print & expo-sharing for PDF export
- React Navigation (Drawer navigation)

## Development Commands

### Running the App
```bash
npm start              # Start Expo development server
npm run android        # Start on Android device/emulator
npm run ios            # Start on iOS device/simulator
npm run web            # Start in web browser
```

### Testing on Devices
The app is designed for mobile (portrait orientation). Use physical devices or emulators via Expo Go or development builds.

## Code Architecture

### Database Layer (`ModuloDb/MDb.js`)

The app uses a **singleton pattern** for database management with the `DatabaseManager` class. Key characteristics:

- **Pre-seeded database**: Ships with `assets/databases/DB_Cotizador.db` that is copied to device on first run
- **Connection management**: Maintains single database connection with retry logic (3 attempts with exponential backoff)
- **Initialization flow**:
  1. Ensures SQLite directory exists
  2. Copies database from assets if not present on device
  3. Opens connection with `SQLite.openDatabaseAsync()`
  4. Verifies with test query

**Core Database Schema:**
- `Clientes` - Customer information
- `Cotizaciones` - Quotations (linked to clients)
- `Ventanas` - Windows/items in each quotation (linked to cotizaciones and vidrios)
- `Vidrios` - Glass types with pricing
- `Materiales` - Material costs (13 materials: cargador, umbra, jamba, etc.)

**Key Functions:**
- `getDBConnection()` - Main entry point, returns initialized DB singleton
- CRUD operations for all entities (get, insert, update, delete)
- `ExportarVentanasPorCotizacion()` - Joins data for PDF export

### Business Logic (`services/ModuloFunciones.jsx`)

Core calculation and utility functions:

- `CalcularCostos(Base, Altura, IdVidrio)` - **Complex cost calculation algorithm**
  - Retrieves all 13 material costs from database
  - Applies material-specific formulas based on window dimensions
  - Formulas use constants like `Base/2 - 1.2` for inferior, `Altura - 3.1` for lateral móvil
  - Returns total cost including glass

- `GuardarCotizacion(db, IdCliente, Ventanas)` - Transaction-based save
  - Uses SQLite transactions (BEGIN/COMMIT/ROLLBACK)
  - Creates cotización with auto-generated description (`Cliente - DD/MM/YYYY`)
  - Inserts all windows in transaction

- `formatearColones(valor)` - Currency formatting (`₡ 1 000.00`)
- `actualizarVentana()` - Update existing window in quotation

### Navigation (`navigation/DrawerNavigator.js`)

Uses `@react-navigation/drawer` with custom drawer content:

**Main Screens:**
- `Cotizaciones` - Create new quotation (CotizacionScreen)
- `CotizacionesGen` - List all saved quotations
- `ListaClientes` - Customer management
- `Materiales` - Edit material costs

**Sub-screens (not in drawer):**
- Edit screens: `EditarCliente`, `EditarCotizacion`, `EditarVentana`, `EditarVidrio`
- Create screens: `NuevoCliente`, `NuevoVidrio`
- `ExportarCotizacion` - PDF generation and sharing

Note: `EditarCliente` uses `unmountOnBlur: true` to force data refresh.

### Screen Components (`screens/`)

**CotizacionScreen.jsx** - Main quotation creation screen:
- Form for entering window dimensions (Base, Altura in cm)
- Client and glass type dropdowns
- Inline editing via Modal for windows in list
- Auto-calculation toggle (can manually override costs)
- Saves list of windows to database

**EditarCotizacion.jsx** - Similar to CotizacionScreen but edits existing quotation
- Loads existing windows from database
- Maintains same inline editing functionality

**ExportarCotizacion.jsx** - PDF export functionality:
- Generates HTML from quotation data
- Uses `expo-print` to create PDF
- Uses `expo-sharing` to share generated PDF
- Template includes customer info, date, itemized windows, and totals

**MaterialesScreen.js** - Edit costs for 13 materials
- Direct database updates affect all future cost calculations

### Reusable Components (`components/`)

- `ClientesDropdown.jsx` - Searchable dropdown for client selection
- `VidriosDropdown.jsx` - Dropdown for glass type selection
- `FormularioVentana.jsx` - Window data entry form
- `VentanaItem.jsx` - Display item for window in list
- `CotizacionItem.jsx` - Display item for quotation in list
- `ClienteItem.jsx`, `VidrioItem.jsx` - List items with edit/delete actions

## Development Workflow

### Adding New Features

When modifying cost calculations:
1. Update formulas in `services/ModuloFunciones.jsx:CalcularCostos()`
2. Test with various dimensions to ensure accuracy
3. Consider material costs retrieved from `Materiales` table

When modifying database schema:
1. Update the source database in `assets/databases/DB_Cotizador.db`
2. Update relevant functions in `ModuloDb/MDb.js`
3. May need to handle migrations or require fresh install

When adding new screens:
1. Create screen component in `screens/`
2. Register in `navigation/DrawerNavigator.js`
3. Add navigation parameters type-safety if needed

### Data Flow Pattern

Typical flow for main features:
1. Screen loads → calls `getDBConnection()` in `useEffect`
2. Fetches data from database using MDb functions
3. User interactions trigger calculations via `ModuloFunciones`
4. Save operations use transactions in `GuardarCotizacion()` or direct DB writes
5. Navigation passes data via `route.params`

### Key Conventions

- Dimensions stored as integers in **centimeters** (e.g., 200 cm = 2.00 m)
- Costs calculated and stored as floats
- Date format: `DD/MM/YYYY`
- Currency: Costa Rican Colón (`₡`)
- All database operations should handle errors and provide user feedback via `Alert.alert()`

## Important Notes

- **Database initialization is async** - always await `getDBConnection()` before DB operations
- **Singleton pattern** - don't try to open multiple database connections
- **Transaction usage** - use BEGIN/COMMIT/ROLLBACK for multi-step operations
- **Cost calculation is stateful** - changing material costs affects all future quotations, not existing ones
- **PDF generation** requires window data to be joined with glass types for display names
