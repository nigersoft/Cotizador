import { getDBConnection, getAllMateriales, getCostoVidrioById, getPorcentajeGanancia } from '../ModuloDb/MDb.js';
import { Alert } from 'react-native';
import { TIPOS_IMPUESTO, PORCENTAJE_IMPUESTO, esTipoImpuestoValido } from '../constants/TiposImpuesto.js';

export const CalcularCostos = async(B,A,IdVid) =>{

  try {
     const Base = Number(B)
     const Altura = Number(A)
     const db = await getDBConnection()

     const listaMateriales= await getAllMateriales(db)
     const CostoVidrio = await getCostoVidrioById(db,IdVid)
     const PorcentajeGanancia = await getPorcentajeGanancia(db)
     
     
    //     // Almacena los costos de cada material de la bd
     const CostoCargador = listaMateriales.find(m => m.Id === 1).Costo
     const CostoUmbra = listaMateriales.find(m => m.Id === 2).Costo
     const CostoJamba = listaMateriales.find(m => m.Id === 3).Costo
     const CostoInferior = listaMateriales.find(m => m.Id === 4).Costo
     const CostoSuperior = listaMateriales.find(m => m.Id === 5).Costo
     const CostoLateralMovil = listaMateriales.find(m => m.Id === 6).Costo
     const CostoLateralFijo = listaMateriales.find(m => m.Id === 7).Costo
     const CostoCerradura = listaMateriales.find(m => m.Id === 8).Costo
     const CostoRodin = listaMateriales.find(m => m.Id === 9).Costo
     const CostoEmpaque = listaMateriales.find(m => m.Id === 10).Costo
     const CostoGuiaPlastica = listaMateriales.find(m => m.Id === 11).Costo
     const CostoFelpa = listaMateriales.find(m => m.Id === 12).Costo
     const CostoTornillos = listaMateriales.find(m => m.Id === 13).Costo

    //   /// Calcula los cost0s

     const Cargador = (Base /100) * CostoCargador
     const Umbra = (Base/100) * CostoUmbra
     const Jamba = ((Altura - 1.8)/100) * CostoJamba * 2
     const Inferior = (((Base/2)- 1.2)/100)* CostoInferior
     const Superior = (((Base/2)- 1.6)/100)* CostoSuperior * 3
     const LateralMovil = ((Altura - 3.1)/100) * CostoLateralMovil * 2
     const LateralFijo = ((Altura - 2.4)/100) * CostoLateralFijo * 2
     const Cerradura = CostoCerradura
     const Rodin = (2 * CostoRodin) *2.5
     const Empaque = (((Base*2)+(Altura*4))/100)* CostoEmpaque
     const GuiPlastica = (Base/100) * CostoGuiaPlastica *2
     const Felpa = (Base/100) * CostoFelpa *2
     const Tornillos = 15 * CostoTornillos

     //const Vidrio =(((Base * Altura) -(10.6*Altura)-((19.1*Base)/2) +101.23 )/10000) * CostoVidrio
     const Vidrio =((Base/100) * (Altura/100))  * CostoVidrio

     const CostoTotal = Cargador + Umbra + Jamba + Inferior + Superior + LateralMovil + LateralFijo + Cerradura + Rodin + Empaque + GuiPlastica + Felpa + Tornillos
     const CostoBase = CostoTotal + Vidrio
     const CostoConGanancia = CostoBase * (1 + (PorcentajeGanancia / 100))
      /////////// ver consola

console.log('📦 Desglose de Cálculo de Materiales:');
console.log('Cargador:        ', Cargador);
console.log('Umbra:           ', Umbra);
console.log('Jamba:           ', Jamba);
console.log('Inferior:        ', Inferior);
console.log('Superior:        ', Superior);
console.log('LateralMovil:    ', LateralMovil);
console.log('LateralFijo:     ', LateralFijo);
console.log('Cerradura:       ', Cerradura);
console.log('Rodin:           ', Rodin);
console.log('Empaque:         ', Empaque);
console.log('Guía Plástica:   ', GuiPlastica);
console.log('Felpa:           ', Felpa);
console.log('Tornillos:       ', Tornillos);
console.log('Vidrio:          ', Vidrio);
console.log('Costo Base:      ', CostoBase);
console.log('% Ganancia:      ', PorcentajeGanancia);
console.log('Costo Final:     ', CostoConGanancia);
console.log('Base:            ', Base);
console.log('Altura:          ', Altura);



      ///////////////////////


     return  CostoConGanancia
  } catch (error) {
    console.error('Error al obtener datos de los materiales:', error);
    throw error;
  }

}
///// dar formato de colones

export const formatearColones = (valor) => {
  const numero = parseFloat(valor);
  if (isNaN(numero)) return '₡ 0.00';

  return '₡ ' + numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/// Guarda las cotizaciones

export const GuardarCotizacion = async (IdCliente, Ventanas) => {
  const db = await getDBConnection(); // Obtener conexión del singleton

  const { Fecha, Descripcion } = await DescripcionFecha(IdCliente);

  try {
    await db.execAsync('BEGIN TRANSACTION');

    // Insertar cotización
    const result = await db.runAsync(
      `INSERT INTO Cotizaciones (IdCliente,Descripcion,Fecha) VALUES (?, ?, ?)`,
      IdCliente, Descripcion,Fecha
    );

    const IdCotizacion = result.lastInsertRowId; // ✅ Este es el ID REAL recién insertado

    // Alert.alert(`Id Cotizacion: `,IdCotizacion)
     console.log('Resultado del insert:', result);
     console.log('Resultado del insert:', IdCotizacion);

    // Insertar ventanas asociadas
    for (const ventana of Ventanas) {
      const {  IdVidrio, Descripcion: VentanaDescripcion, Costo, Base, Altura} = ventana;

      await db.runAsync(
        `INSERT INTO Ventanas (IdCotizacion,IdVidrio,Descripcion,Costo,Base,Altura) VALUES (?, ?, ?, ?, ?, ?)`,
        IdCotizacion, IdVidrio, VentanaDescripcion, Costo, Base, Altura
      );
    }

    await db.execAsync('COMMIT');
   // return { success: true, insertId: idCotizacion };

  } catch (error) {

    console.error('Error al guardar cotización:', error);
    await db.execAsync('ROLLBACK');
     Alert.alert(`ERROR al Guardar Cotización!!!`)
    return { success: false, error };
  }
};


/// Descripcion y fecha

const  DescripcionFecha = async(Id)=>{
  const db = await getDBConnection(); // Obtener conexión del singleton

  try{

    const Metafecha = new Date();
    const dia = Metafecha.getDate().toString().padStart(2, '0');
    const mes = (Metafecha.getMonth() + 1).toString().padStart(2, '0'); // Los meses van de 0 a 11
    const anio = Metafecha.getFullYear();

    const FechaFormateada = `${dia}/${mes}/${anio}`;

    const Cliente = await db.getFirstAsync('SELECT Nombre FROM Clientes WHERE ID = ?', Id);
 /// error si se manda un id no encontrado
    if (!Cliente) {
      throw new Error(`Cliente con ID ${Id} no encontrado.`);
    }

    const Datos = {
      Fecha:FechaFormateada,
      Descripcion: `${Cliente.Nombre} - ${FechaFormateada}`
    }

    return Datos;

  } catch (error){
    console.error('Error al crear Descripcion:', error);
    throw error; // Re-lanzar el error para que GuardarCotizacion pueda manejarlo

  }


}

/////// Obtiene el id de la cotizacion

//  export const IdCotizacion = async (db) => {
//    try {
     
//      const Cotizacion = await db.getFirstAsync('SELECT IFNULL(MAX(Id) + 1, 1) AS Id FROM Cotizaciones');
//      return parseInt(Cotizacion.Id, 10); 
//    } catch (error) {
//      console.error('Error al obtener el ultimo Id:', error);
//      throw error;
//    }
//  };


 //////// FUNCION PARA PRUEBAS //////////////////////////////////

export const VerTABLA = async (db) => {
  try {
    const filas = await db.getAllAsync('select * from Cotizaciones');

    if (filas.length === 0) {
      console.log('La tabla "Ventanas" está vacía.');
    } else {
      console.log('Contenido de la tabla Ventanas:');
      for (let i = 0; i < filas.length; i++) {
        console.log(`Fila ${i + 1}:`, filas[i]);
      }
    }

    return filas;
  } catch (error) {
    console.error('Error al obtener los datos de la tabla Ventanas:', error);
    throw error;
  }
};


///////////////////////// Actualizar ventana //////////////////////////////////////

export const actualizarVentana = async (ventana) => {
  const db = await getDBConnection(); // Obtener conexión del singleton
  const { Id, IdCotizacion, IdVidrio, Descripcion, Costo, Base, Altura } = ventana;
  try {
    const result = await db.runAsync(
      'UPDATE Ventanas SET IdCotizacion = ?, IdVidrio = ?, Descripcion = ?, Costo = ?, Base = ?, Altura = ? WHERE Id = ?',
      IdCotizacion, IdVidrio, Descripcion, Costo, Base, Altura, Id
    );
    return result.changes;
  } catch (error) {
    console.error('Error al actualizar la ventana de la cotización:', error);
    throw error;
  }
};

///////////////////////// Cálculo de Impuestos //////////////////////////////////////

/**
 * Calcula el monto de impuesto y el total según el tipo de impuesto
 * @param {number} costo - Costo base
 * @param {string} tipoImpuesto - Tipo de impuesto (usar constantes TIPOS_IMPUESTO)
 * @returns {Object} { monto, impuesto } donde:
 *   - monto: el monto total con impuesto aplicado
 *   - impuesto: el valor del impuesto calculado
 */
export const CalcularMontoImpuesto = (costo, tipoImpuesto) => {
  const costoNumerico = Number(costo);

  if (isNaN(costoNumerico) || costoNumerico < 0) {
    console.warn('Costo inválido para calcular impuesto:', costo);
    return { monto: 0, impuesto: 0 };
  }

  switch (tipoImpuesto) {
    case TIPOS_IMPUESTO.AGREGADO:
      // Impuesto se agrega al costo
      const impuestoAgregado = costoNumerico * PORCENTAJE_IMPUESTO;
      const montoAgregado = costoNumerico + impuestoAgregado;
      return { monto: montoAgregado, impuesto: impuestoAgregado };

    case TIPOS_IMPUESTO.INCLUIDO:
      // Impuesto ya está incluido en el costo
      // Costo sin impuesto = Costo / 1.13
      // Impuesto = Costo - (Costo / 1.13)
      const divisor = 1 + PORCENTAJE_IMPUESTO;
      const costoSinImpuesto = costoNumerico / divisor;
      const impuestoIncluido = costoNumerico - costoSinImpuesto;
      return { monto: costoNumerico, impuesto: impuestoIncluido };

    case TIPOS_IMPUESTO.SIN_IMPUESTO:
      // Sin impuesto
      return { monto: costoNumerico, impuesto: 0 };

    default:
      // Si no hay tipo de impuesto definido, retornar el costo sin modificar
      console.warn('Tipo de impuesto no reconocido:', tipoImpuesto);
      return { monto: costoNumerico, impuesto: 0 };
  }
};

///////////////////////// Gestión de Impuestos en BD //////////////////////////////////////

/**
 * Obtiene información de impuestos de una cotización
 * @param {number} idCotizacion - ID de la cotización
 * @returns {Object} { costoTotal, tipoImpuesto } donde:
 *   - costoTotal: suma de costos de todas las ventanas
 *   - tipoImpuesto: descripción del tipo de impuesto (AGREGADO, INCLUIDO, SIN IMPUESTO, o null)
 */
export const GetInfoImpuestos = async (idCotizacion) => {
  try {
    const db = await getDBConnection();

    // Calcular costo total como suma de ventanas
    const costoResult = await db.getFirstAsync(
      `SELECT SUM(Costo) as CostoTotal FROM Ventanas WHERE IdCotizacion = ?`,
      [idCotizacion]
    );
    const costoTotal = costoResult?.CostoTotal || 0;

    // Obtener tipo de impuesto mediante joins
    const impuestoResult = await db.getFirstAsync(
      `SELECT ti.Descripcion as TipoImpuesto
       FROM Impuestos i
       INNER JOIN TipoImpuestos ti ON i.IdTipoImpuesto = ti.Id
       WHERE i.IdCotizacion = ?`,
      [idCotizacion]
    );

    return {
      costoTotal,
      tipoImpuesto: impuestoResult?.TipoImpuesto || null
    };
  } catch (error) {
    console.error('Error al obtener info de impuestos:', error);
    throw error;
  }
};

/**
 * Guarda o actualiza el tipo de impuesto para una cotización
 * @param {number} idCotizacion - ID de la cotización
 * @param {string} tipoImpuesto - Tipo de impuesto (usar constantes TIPOS_IMPUESTO)
 * @returns {boolean} true si se guardó correctamente
 */
export const GuardarImpuesto = async (idCotizacion, tipoImpuesto) => {
  try {
    // ✅ Validación 1: Parámetros requeridos
    if (!idCotizacion || !tipoImpuesto) {
      throw new Error('idCotizacion y tipoImpuesto son requeridos');
    }

    // ✅ Validación 2: Tipo de impuesto válido
    if (!esTipoImpuestoValido(tipoImpuesto)) {
      throw new Error(`Tipo de impuesto inválido: "${tipoImpuesto}". Debe ser AGREGADO, INCLUIDO o SIN IMPUESTO`);
    }

    const db = await getDBConnection();
    await db.execAsync('BEGIN TRANSACTION');

    // Buscar el Id del tipo de impuesto
    const tipoResult = await db.getFirstAsync(
      'SELECT Id FROM TipoImpuestos WHERE Descripcion = ?',
      [tipoImpuesto]
    );

    if (!tipoResult) {
      throw new Error(`Tipo de impuesto "${tipoImpuesto}" no encontrado en la base de datos`);
    }

    const idTipoImpuesto = tipoResult.Id;

    // Verificar si ya existe un registro para esta cotización
    const existente = await db.getFirstAsync(
      'SELECT Id FROM Impuestos WHERE IdCotizacion = ?',
      [idCotizacion]
    );

    if (existente) {
      // Actualizar registro existente
      await db.runAsync(
        'UPDATE Impuestos SET IdTipoImpuesto = ? WHERE IdCotizacion = ?',
        [idTipoImpuesto, idCotizacion]
      );
    } else {
      // Insertar nuevo registro
      await db.runAsync(
        'INSERT INTO Impuestos (IdCotizacion, IdTipoImpuesto) VALUES (?, ?)',
        [idCotizacion, idTipoImpuesto]
      );
    }

    await db.execAsync('COMMIT');
    return true;
  } catch (error) {
    const db = await getDBConnection();
    await db.execAsync('ROLLBACK');
    console.error('Error al guardar impuesto:', error);
    throw error;
  }
};