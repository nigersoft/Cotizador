import React, { useState } from 'react';
import { getDBConnection, getAllMateriales, getCostoVidrioById,getCotizacionById} from '../ModuloDb/MDb.js';
import { Alert} from 'react-native';

export const CalcularCostos = async(B,A,IdVid) =>{

  try {
     const Base = Number(B)
     const Altura = Number(A)
     const db = await getDBConnection()

     const listaMateriales= await getAllMateriales(db)
     const CostoVidrio = await getCostoVidrioById(db,IdVid)
     
     
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
console.log('Vidrio:       ', Vidrio);
console.log('Costo Total:       ', CostoTotal + Vidrio);
console.log('Costo Empaque: ', CostoEmpaque);
console.log('Base:       ', Base);
console.log('Altura:       ', Altura);



      ///////////////////////
    

     return  CostoTotal + Vidrio
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

export const GuardarCotizacion = async (db, IdCliente,Ventanas) => {

  const { Fecha, Descripcion } = await DescripcionFecha(db,IdCliente);

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
      const {  IdVidrio,Descripcion, Costo, Base, Altura} = ventana;

      await db.runAsync(
        `INSERT INTO Ventanas (IdCotizacion,IdVidrio,Descripcion,Costo,Base,Altura) VALUES (?, ?, ?, ?, ?, ?)`,
        IdCotizacion,IdVidrio, Descripcion, Costo,Base,Altura
      );
    }

    await db.execAsync('COMMIT');
     await db.closeAsync();
   // return { success: true, insertId: idCotizacion };

  } catch (error) {
    
    console.error('Error al guardar cotización:', error);
    await db.execAsync('ROLLBACK');
     Alert.alert(`ERROR al Guardar Cotización!!!`)
    return { success: false, error };
  }
};


/// Descripcion y fecha

const  DescripcionFecha = async(db,Id)=>{

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

export const actualizarVentana = async (db, ventana) => {
  const { Id, IdCotizacion, IdVidrio, Descripcion, Costo,Base,Altura } = ventana;
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