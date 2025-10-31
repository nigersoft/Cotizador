// ModuloDb/MDb.js
// ✅ Ajustado para Expo SDK 54 usando expo-file-system/legacy
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { CalcularCostoConImpuesto, ObtenerTipoImpuestoCotizacion } from '../services/ModuloFunciones.jsx';

// Singleton para manejar la conexión de la base de datos
class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitializing = false;
    this.initPromise = null;
    this.dbName = 'DB_Cotizador.db';
    this.dbDir = FileSystem.documentDirectory + 'SQLite';
    this.dbPath = `${this.dbDir}/${this.dbName}`;
    this.defaultRetryDelay = 1000; // 1s base
    this.maxRetries = 3;
    this.retryDelay = this.defaultRetryDelay;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async isDatabaseReady() {
    if (!this.db) return false;
    try {
      await this.db.getFirstAsync('SELECT 1 as test');
      return true;
    } catch {
      return false;
    }
  }

  async initializeDatabase() {
    if (this.isInitializing && this.initPromise) {
      return await this.initPromise;
    }
    if (this.db && await this.isDatabaseReady()) {
      return this.db;
    }

    // 🔄 reiniciar backoff para cada ciclo de init
    this.retryDelay = this.defaultRetryDelay;

    this.isInitializing = true;
    this.initPromise = this._performInitialization();

    try {
      const result = await this.initPromise;
      this.isInitializing = false;
      return result;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      throw error;
    }
  }

  async _performInitialization() {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt}/${this.maxRetries} de inicialización de BD`);

        // 1) Crear carpeta SQLite si no existe
        await this._ensureDirectory();

        // 2) Copiar base desde assets solo si no existe en dispositivo
        await this._ensureDatabaseFile();

        // 3) Abrir la base (cerrando cualquier conexión previa)
        if (this.db) {
          try { await this.db.closeAsync(); } catch {}
          this.db = null;
        }
        this.db = await SQLite.openDatabaseAsync(this.dbName);

        // 4) Verificación
        await this._verifyDatabase();

        console.log('✅ Base de datos inicializada correctamente');
        return this.db;
      } catch (error) {
        lastError = error;
        console.error(`❌ Error en intento ${attempt}:`, error.message);

        if (this.db) {
          try { await this.db.closeAsync(); } catch {}
          this.db = null;
        }

        if (attempt < this.maxRetries) {
          console.log(`⏳ Esperando ${this.retryDelay}ms antes del siguiente intento...`);
          await this.delay(this.retryDelay);
          this.retryDelay = Math.floor(this.retryDelay * 1.5);
        }
      }
    }

    const errorMessage = `Error al inicializar la base de datos después de ${this.maxRetries} intentos. Último error: ${lastError?.message}`;
    console.error('🚫', errorMessage);
    throw new Error(errorMessage);
  }

  async _ensureDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.dbDir, { intermediates: true });
        console.log('📁 Carpeta SQLite creada');
      }
    } catch (error) {
      // ⚠️ Con legacy no deberías ver la advertencia deprecada aquí
      throw new Error(`Error creando directorio: ${error.message}`);
    }
  }

  async _ensureDatabaseFile() {
    try {
      const dbInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!dbInfo.exists) {
        console.log('📦 Copiando base de datos desde assets...');

        const asset = Asset.fromModule(
          require('../assets/databases/DB_Cotizador.db')
        );
        await asset.downloadAsync();

        if (!asset.localUri) throw new Error('No se pudo obtener la URI local del asset');

        const assetInfo = await FileSystem.getInfoAsync(asset.localUri);
        if (!assetInfo.exists) throw new Error('El archivo de asset no existe en la URI local');

        await FileSystem.copyAsync({ from: asset.localUri, to: this.dbPath });

        const copiedInfo = await FileSystem.getInfoAsync(this.dbPath);
        if (!copiedInfo.exists || copiedInfo.size === 0) {
          throw new Error('La copia de la base de datos falló o resultó en un archivo vacío');
        }

        console.log('✅ Base de datos copiada exitosamente a:', this.dbPath);
      }
    } catch (error) {
      throw new Error(`Error preparando archivo de base de datos: ${error.message}`);
    }
  }

  async _verifyDatabase() {
    try {
      const result = await this.db.getFirstAsync('SELECT 1 as test');
      if (!result || result.test !== 1) {
        throw new Error('La base de datos no responde correctamente');
      }

      const tableCheck = await this.db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' LIMIT 1"
      );
      if (!tableCheck) throw new Error('La base de datos no contiene tablas');

      console.log('✅ Verificación de base de datos exitosa');
    } catch (error) {
      throw new Error(`Error verificando base de datos: ${error.message}`);
    }
  }

  async closeConnection() {
    if (this.db) {
      try {
        await this.db.closeAsync();
        console.log('🔒 Conexión de base de datos cerrada');
      } catch (error) {
        console.error('Error cerrando base de datos:', error.message);
      } finally {
        this.db = null;
        this.isInitializing = false;
        this.initPromise = null;
      }
    }
  }

  async getConnection() {
    if (!this.db || !(await this.isDatabaseReady())) {
      return await this.initializeDatabase();
    }
    return this.db;
  }

  async validateConnection(db) {
    if (!db) return false;
    try {
      await db.getFirstAsync('SELECT 1 as test');
      return true;
    } catch {
      return false;
    }
  }

  async getValidConnection(currentDb = null) {
    if (currentDb && await this.validateConnection(currentDb)) return currentDb;
    return await this.getConnection();
  }
}

// Instancia singleton
const dbManager = new DatabaseManager();

// === API Pública ===
export const getDBConnection = async () => dbManager.getConnection();
export const closeDBConnection = async () => dbManager.closeConnection();

const withReconnection = async (operation, db, ...args) => {
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      const validDb = await dbManager.getValidConnection(db);
      return await operation(validDb, ...args);
    } catch (error) {
      attempts++;
      console.error(`Error en operación (intento ${attempts}):`, error.message);

      if (attempts < maxAttempts) {
        if (db) {
          try { await db.closeAsync(); } catch {}
        }
        await dbManager.closeConnection();
        await dbManager.delay(500);
        db = await getDBConnection();
      } else {
        throw new Error(`Operación falló después de ${maxAttempts} intentos: ${error.message}`);
      }
    }
  }
};

// ============== FUNCIONES ORIGINALES SIN MODIFICAR ==============

export const getAllClientes = async (db) => {
  return await withReconnection(async (validDb) => {
    const clientes = await validDb.getAllAsync('SELECT * FROM Clientes');
    return clientes;
  }, db);
};

export const getClienteById = async (db, id) => {
  return await withReconnection(async (validDb) => {
    const cliente = await validDb.getFirstAsync('SELECT * FROM Clientes WHERE Id = ?', id);
    return cliente || null;
  }, db, id);
};

export const insertCliente = async (db, cliente) => {
  return await withReconnection(async (validDb) => {
    const { Nombre, Apellido, Telefono, Email } = cliente;
    const result = await validDb.runAsync(
      'INSERT INTO Clientes (Nombre, Apellido, Telefono, Email) VALUES (?, ?, ?, ?)',
      Nombre, Apellido, Telefono, Email
    );
    return { rowsAffected: result.changes, insertId: result.lastInsertRowId };
  }, db, cliente);
};

export const updateCliente = async (db, cliente) => {
  return await withReconnection(async (validDb) => {
    const { Id, Nombre, Apellido, Telefono, Email } = cliente;
    const result = await validDb.runAsync(
      'UPDATE Clientes SET Nombre = ?, Apellido = ?, Telefono = ?, Email = ? WHERE Id = ?',
      Nombre, Apellido, Telefono, Email, Id
    );
    return result.changes;
  }, db, cliente);
};

export const deleteCliente = async (db, id) => {
  return await withReconnection(async (validDb) => {
    const result = await validDb.runAsync('DELETE FROM Clientes WHERE Id = ?', id);
    return result.changes;
  }, db, id);
};

export const getCotizacionesCountByCliente = async (db, idCliente) => {
  return await withReconnection(async (validDb) => {
    const result = await validDb.getFirstAsync(
      'SELECT COUNT(*) as count FROM Cotizaciones WHERE IdCliente = ?',
      idCliente
    );
    return result?.count || 0;
  }, db, idCliente);
};

export const deleteCotizacionesByCliente = async (db, idCliente) => {
  return await withReconnection(async (validDb) => {
    try {
      await validDb.execAsync('BEGIN TRANSACTION');

      // Primero obtener todos los IDs de cotizaciones del cliente
      const cotizaciones = await validDb.getAllAsync(
        'SELECT Id FROM Cotizaciones WHERE IdCliente = ?',
        [idCliente]
      );

      // Eliminar las ventanas de cada cotización
      for (const cotizacion of cotizaciones) {
        await validDb.runAsync('DELETE FROM Ventanas WHERE IdCotizacion = ?', [cotizacion.Id]);
      }

      // Eliminar todas las cotizaciones del cliente
      const result = await validDb.runAsync('DELETE FROM Cotizaciones WHERE IdCliente = ?', [idCliente]);

      await validDb.execAsync('COMMIT');
      return result.changes;
    } catch (error) {
      await validDb.execAsync('ROLLBACK');
      throw error;
    }
  }, db, idCliente);
};

// ***************  Materiales ***********************
export const getAllMateriales = async (db) => {
  return await withReconnection(async (validDb) => {
    const materiales = await validDb.getAllAsync('SELECT * FROM Materiales');
    return materiales;
  }, db);
};

export const update_Material = async (db, material) => {
  return await withReconnection(async (validDb) => {
    const result = await validDb.runAsync(
      'UPDATE Materiales SET Costo = ? WHERE Id = ?',
      material.Costo, material.Id
    );
    return result.changes;
  }, db, material);
};

// **************** Vidrios *************************
export const getAllVidrios = async (db) => {
  return await withReconnection(async (validDb) => {
    const materiales = await validDb.getAllAsync('SELECT * FROM Vidrios');
    return materiales;
  }, db);
};

export const insertVidrio = async (db, Vidrio) => {
  return await withReconnection(async (validDb) => {
    const { Descripcion, Costo } = Vidrio;
    const result = await validDb.runAsync(
      'INSERT INTO Vidrios (Descripcion, Costo) VALUES (?, ?)',
      Descripcion, Costo
    );
    return { rowsAffected: result.changes, insertId: result.lastInsertRowId };
  }, db, Vidrio);
};

export const updateVidrio = async (db, Vidrio) => {
  return await withReconnection(async (validDb) => {
    const { Id, Descripcion, Costo } = Vidrio;
    const result = await validDb.runAsync(
      'UPDATE Vidrios SET Descripcion = ?, Costo = ? WHERE Id = ?',
      Descripcion, Costo, Id
    );
    return result.changes;
  }, db, Vidrio);
};

export const deleteVidrio = async (db, id) => {
  return await withReconnection(async (validDb) => {
    const result = await validDb.runAsync('DELETE FROM Vidrios WHERE Id = ?', id);
    return result.changes;
  }, db, id);
};

export const getCostoVidrioById = async (db, id) => {
  return await withReconnection(async (validDb) => {
    const CostoVidrio = await validDb.getFirstAsync('select Costo from Vidrios where Id = ?', id);
    return CostoVidrio?.Costo;
  }, db, id);
};

export const getAllCotizaciones = async (db) => {
  return await withReconnection(async (validDb) => {
    // Obtener cotizaciones con costo base (suma de ventanas)
    const Cotizaciones = await validDb.getAllAsync(
      `SELECT
        Coti.Id,
        Cli.Id as IdCliente,
        Coti.Descripcion,
        Cli.Nombre,
        Cli.Telefono,
        SUM(V.Costo) as CostoBase
      FROM Cotizaciones as Coti
      INNER JOIN Clientes as Cli ON Coti.IdCliente = Cli.Id
      INNER JOIN Ventanas as V ON Coti.Id = V.IdCotizacion
      GROUP BY Coti.Id
      ORDER BY Coti.Id DESC`
    );

    // Para cada cotización, obtener el tipo de impuesto y calcular el costo final
    const cotizacionesConImpuesto = await Promise.all(
      Cotizaciones.map(async (cotizacion) => {
        // Usar la función de ModuloFunciones para obtener el tipo de impuesto
        const tipoImpuesto = await ObtenerTipoImpuestoCotizacion(cotizacion.Id);

        // Usar la función de ModuloFunciones para calcular el costo con impuesto
        const costoFinal = CalcularCostoConImpuesto(cotizacion.CostoBase, tipoImpuesto);

        return {
          ...cotizacion,
          Costo: costoFinal
        };
      })
    );

    return cotizacionesConImpuesto;
  }, db);
};

export const deleteCotizacionConVentanas = async (db, idCotizacion) => {
  return await withReconnection(async (validDb) => {
    try {
      await validDb.execAsync('BEGIN TRANSACTION');
      await validDb.runAsync(`DELETE FROM Ventanas WHERE IdCotizacion = ?`, [idCotizacion]);
      await validDb.runAsync(`DELETE FROM Cotizaciones WHERE Id = ?`, [idCotizacion]);
      await validDb.execAsync('COMMIT');
    } catch (error) {
      await validDb.execAsync('ROLLBACK');
      throw error;
    }
  }, db, idCotizacion);
};

export const UpdateCotizacion = async (db, idCotizacion, Descripcion) => {
  return await withReconnection(async (validDb) => {
    try {
      await validDb.execAsync('BEGIN TRANSACTION');
      await validDb.runAsync(`update Cotizaciones set Descripcion = ? where Id  = ?`, [Descripcion, idCotizacion]);
      await validDb.execAsync('COMMIT');
    } catch (error) {
      await validDb.execAsync('ROLLBACK');
      throw error;
    }
  }, db, idCotizacion, Descripcion);
};

export const getCotizacionById = async (db, idCotizacion) => {
  return await withReconnection(async (validDb) => {
    const cotizacion = await validDb.getFirstAsync(
      `SELECT * FROM Cotizaciones WHERE Id = ?`,
      [idCotizacion]
    );
    return cotizacion;
  }, db, idCotizacion);
};

export const deleteVentanas = async (db, idVentana) => {
  return await withReconnection(async (validDb) => {
    try {
      await validDb.execAsync('BEGIN TRANSACTION');
      await validDb.runAsync(`DELETE FROM Ventanas WHERE Id = ?`, [idVentana]);
      await validDb.execAsync('COMMIT');
    } catch (error) {
      await validDb.execAsync('ROLLBACK');
      throw error;
    }
  }, db, idVentana);
};

export const getVentanasPorCotizacion = async (db, idCotizacion) => {
  return await withReconnection(async (validDb) => {
    return await validDb.getAllAsync(
      `SELECT Id,IdCotizacion,IdVidrio,Descripcion,Costo,Base,Altura FROM Ventanas WHERE IdCotizacion = ?`,
      [idCotizacion]
    );
  }, db, idCotizacion);
};

export const ExportarVentanasPorCotizacion = async (db, idCotizacion) => {
  return await withReconnection(async (validDb) => {
    return await validDb.getAllAsync(
      `select v.Descripcion as Descripcion, vid.Descripcion as Vidrio, v.Costo as Costo,v.Base as Base, v.Altura as Altura from Ventanas as v inner join Vidrios as vid on vid.Id = v.IdVidrio where v.IdCotizacion = ?`,
      [idCotizacion]
    );
  }, db, idCotizacion);
};

export const getClientePorId = async (db, idCliente) => {
  return await withReconnection(async (validDb) => {
    try {
      const result = await validDb.getFirstAsync(`SELECT * FROM Clientes WHERE Id = ?`, idCliente);
      return result;
    } catch (error) {
      console.error("Error al obtener cliente por ID:", error);
      return null;
    }
  }, db, idCliente);
};

export const insertVentana = async (db, ventana) => {
  return await withReconnection(async (validDb) => {
    try {
      const { IdCotizacion, IdVidrio, Descripcion, Costo, Base, Altura } = ventana;
      const result = await validDb.runAsync(
        'INSERT INTO Ventanas (IdCotizacion, IdVidrio, Descripcion, Costo, Base, Altura) VALUES (?, ?, ?, ?, ?, ?)',
        IdCotizacion, IdVidrio, Descripcion, Costo, Base, Altura
      );
      return { rowsAffected: result.changes, insertId: result.lastInsertRowId };
    } catch (error) {
      console.error("Error al insertar ventana:", error);
      throw error;
    }
  }, db, ventana);
};

// **************** Porcentaje de Ganancia *************************
export const getPorcentajeGanancia = async (db) => {
  return await withReconnection(async (validDb) => {
    const result = await validDb.getFirstAsync('SELECT Porcentaje FROM PorcentajeGanancia WHERE Id = 1');
    return result?.Porcentaje || 30.0; // Valor por defecto si no existe
  }, db);
};

export const updatePorcentajeGanancia = async (db, porcentaje) => {
  return await withReconnection(async (validDb) => {
    const result = await validDb.runAsync(
      'UPDATE PorcentajeGanancia SET Porcentaje = ? WHERE Id = 1',
      porcentaje
    );
    return result.changes;
  }, db, porcentaje);
};

// ========= Utilidades de actualización / exportación =========
export const ACTUALIZAR_DB = async () => {
  const dbName = 'DB_Cotizador.db';
  const dbDir = FileSystem.documentDirectory + 'SQLite';
  const dbPath = `${dbDir}/${dbName}`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // Sobrescribe si ya existe (comportamiento original mantenido)
    const asset = Asset.fromModule(require('../assets/databases/DB_Cotizador.db'));
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('No se pudo obtener la URI local del asset');

    await FileSystem.copyAsync({ from: asset.localUri, to: dbPath });
    console.log('📦 Base de datos copiada a:', dbPath);

    await dbManager.closeConnection(); // forzar reconexión
  } catch (error) {
    console.error('Error al configurar la base de datos:', error);
    throw error;
  }
};

export const EXPORTAR_DB = async () => {
  const dbName = 'DB_Cotizador.db';
  const dbDir = FileSystem.documentDirectory + 'SQLite';
  const dbPath = `${dbDir}/${dbName}`;
  const exportPath = FileSystem.documentDirectory + `backup_${dbName}`;

  try {
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (!dbInfo.exists) {
      console.warn('⚠️ La base de datos no existe en:', dbPath);
      return;
    }

    await FileSystem.copyAsync({ from: dbPath, to: exportPath });
    console.log('✅ Base de datos exportada a:', exportPath);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(exportPath);
    } else {
      console.warn('⚠️ Compartir no está disponible en este dispositivo.');
    }
  } catch (error) {
    console.error('❌ Error al exportar y compartir la base de datos:', error);
    throw error;
  }
};
