#!/usr/bin/env python3
"""
Script para migrar la base de datos DB_Cotizador.db
- Elimina columnas de Cotizaciones: TipoImpuesto, MontoImpuesto, CostoSinImpuesto, CostoTotal
- Crea tabla TipoImpuestos
- Crea tabla Impuestos
- Inserta tipos de impuestos predefinidos
"""

import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

# Rutas
DB_PATH = Path(__file__).parent / "assets" / "databases" / "DB_Cotizador.db"
BACKUP_PATH = Path(__file__).parent / "assets" / "databases" / f"DB_Cotizador_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

def crear_backup():
    """Crea una copia de seguridad de la base de datos"""
    print(f"📦 Creando backup en: {BACKUP_PATH}")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print("✅ Backup creado exitosamente")

def verificar_estructura_actual(conn):
    """Verifica y muestra la estructura actual de la tabla Cotizaciones"""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(Cotizaciones)")
    columnas = cursor.fetchall()
    print("\n📋 Estructura actual de Cotizaciones:")
    for col in columnas:
        print(f"  - {col[1]} ({col[2]})")
    return [col[1] for col in columnas]

def migrar_base_datos():
    """Ejecuta la migración completa"""
    if not DB_PATH.exists():
        print(f"❌ Error: No se encontró la base de datos en {DB_PATH}")
        return False

    # Crear backup
    crear_backup()

    # Conectar a la base de datos
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("\n🔄 Iniciando migración...")

        # Verificar estructura actual
        columnas_actuales = verificar_estructura_actual(conn)

        # Paso 1: Crear tabla TipoImpuestos
        print("\n📝 Paso 1: Creando tabla TipoImpuestos...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TipoImpuestos (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Descripcion TEXT NOT NULL UNIQUE
            )
        """)
        print("✅ Tabla TipoImpuestos creada")

        # Paso 2: Insertar tipos de impuestos
        print("\n📝 Paso 2: Insertando tipos de impuestos...")
        tipos_impuestos = [
            ("AGREGADO",),
            ("INCLUIDO",),
            ("SIN IMPUESTO",)
        ]
        cursor.executemany(
            "INSERT OR IGNORE INTO TipoImpuestos (Descripcion) VALUES (?)",
            tipos_impuestos
        )
        print("✅ Tipos de impuestos insertados")

        # Paso 3: Crear tabla Impuestos
        print("\n📝 Paso 3: Creando tabla Impuestos...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Impuestos (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                IdCotizacion INTEGER NOT NULL,
                IdTipoImpuesto INTEGER NOT NULL,
                FOREIGN KEY (IdCotizacion) REFERENCES Cotizaciones(Id) ON DELETE CASCADE,
                FOREIGN KEY (IdTipoImpuesto) REFERENCES TipoImpuestos(Id)
            )
        """)
        print("✅ Tabla Impuestos creada")

        # Paso 4: Recrear tabla Cotizaciones sin las columnas de impuestos
        print("\n📝 Paso 4: Recreando tabla Cotizaciones...")

        # 4.1: Obtener estructura actual
        cursor.execute("PRAGMA table_info(Cotizaciones)")
        columnas_info = cursor.fetchall()

        # 4.2: Filtrar columnas a mantener
        columnas_a_mantener = [
            col for col in columnas_info
            if col[1] not in ['TipoImpuesto', 'MontoImpuesto', 'CostoSinImpuesto', 'CostoTotal']
        ]

        columnas_nombres = [col[1] for col in columnas_a_mantener]
        columnas_sql = ", ".join(columnas_nombres)

        print(f"  Columnas a mantener: {columnas_nombres}")

        # 4.3: Crear tabla temporal con nueva estructura
        cursor.execute("""
            CREATE TABLE Cotizaciones_new (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                IdCliente INTEGER NOT NULL,
                Descripcion TEXT,
                Fecha TEXT,
                FOREIGN KEY (IdCliente) REFERENCES Clientes(Id)
            )
        """)

        # 4.4: Copiar datos
        cursor.execute(f"""
            INSERT INTO Cotizaciones_new ({columnas_sql})
            SELECT {columnas_sql} FROM Cotizaciones
        """)

        # 4.5: Eliminar tabla antigua
        cursor.execute("DROP TABLE Cotizaciones")

        # 4.6: Renombrar tabla nueva
        cursor.execute("ALTER TABLE Cotizaciones_new RENAME TO Cotizaciones")

        print("✅ Tabla Cotizaciones recreada sin columnas de impuestos")

        # Confirmar cambios
        conn.commit()

        # Verificar nueva estructura
        print("\n📋 Nueva estructura de Cotizaciones:")
        cursor.execute("PRAGMA table_info(Cotizaciones)")
        columnas = cursor.fetchall()
        for col in columnas:
            print(f"  - {col[1]} ({col[2]})")

        # Verificar tablas creadas
        print("\n📋 Verificando tablas nuevas:")
        cursor.execute("SELECT COUNT(*) FROM TipoImpuestos")
        count_tipos = cursor.fetchone()[0]
        print(f"  - TipoImpuestos: {count_tipos} registros")

        cursor.execute("SELECT Id, Descripcion FROM TipoImpuestos")
        tipos = cursor.fetchall()
        for tipo in tipos:
            print(f"    {tipo[0]}: {tipo[1]}")

        print("\n✅ Migración completada exitosamente")
        print(f"📦 Backup guardado en: {BACKUP_PATH}")
        return True

    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        conn.rollback()
        print("⚠️  Se ha revertido la transacción")
        print(f"💡 Puedes restaurar el backup desde: {BACKUP_PATH}")
        return False

    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  MIGRACIÓN DE BASE DE DATOS - DB_Cotizador")
    print("=" * 60)

    respuesta = input("\n¿Deseas continuar con la migración? (s/n): ")
    if respuesta.lower() in ['s', 'si', 'yes', 'y']:
        exito = migrar_base_datos()
        if exito:
            print("\n🎉 ¡Migración completada con éxito!")
        else:
            print("\n❌ La migración falló. Revisa el backup.")
    else:
        print("❌ Migración cancelada")
