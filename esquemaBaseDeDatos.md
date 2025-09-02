```mermaid
erDiagram
    ADMINISTRADORES ||--o{ EMPLEADOS : supervisa
    EMPLEADOS ||--o{ GASTOS : realiza
    EMPRESAS ||--o{ GASTOS : "provee a"
    CATEGORIAS_GASTO ||--o{ GASTOS : clasifica
    GASTOS ||--|| FACTURAS : "tiene (1 a 1)"
    FACTURAS ||--o{ FACTURA_ADJUNTOS : adjunta
    EMPRESAS ||--o{ EMPRESA_NOMBRES : "tiene nombres (historial)"
    EMPRESAS ||--o{ ESTABLECIMIENTOS : "(opcional) tiene"

    ADMINISTRADORES {
      bigint id_admin PK
      varchar nombre
      varchar correo
      varchar estado
      timestamp creado_en
      timestamp actualizado_en
    }

    EMPLEADOS {
      bigint id_empleado PK
      bigint id_admin FK  "→ ADMINISTRADORES.id_admin"
      varchar nombre
      varchar nit_persona
      varchar estado
      timestamp creado_en
      timestamp actualizado_en
    }

    EMPRESAS {
      bigint id_empresa PK
      varchar nit_empresa UNIQUE "IDENTIDAD estable"
      boolean activa
      timestamp creado_en
      timestamp actualizado_en
    }

    EMPRESA_NOMBRES {
      bigint id_nombre PK
      bigint id_empresa FK "→ EMPRESAS.id_empresa"
      varchar tipo  "legal|fantasia"
      varchar nombre "razón social o nombre comercial"
      date vigente_desde
      date vigente_hasta nullable
      boolean es_actual
      timestamp creado_en
    }

    ESTABLECIMIENTOS {
      bigint id_establecimiento PK
      bigint id_empresa FK "→ EMPRESAS.id_empresa"
      varchar codigo_local "ej. # de establecimiento"
      varchar direccion
      varchar telefono
      boolean activo
      timestamp creado_en
    }

    CATEGORIAS_GASTO {
      smallint id_categoria PK
      varchar codigo UNIQUE "ALIM|TRANS|HOSPE|..."
      varchar nombre
      boolean activa
      smallint orden
    }

    GASTOS {
      bigint id_gasto PK
      bigint id_empleado   FK "→ EMPLEADOS.id_empleado"
      bigint id_empresa    FK "→ EMPRESAS.id_empresa"
      smallint id_categoria FK "→ CATEGORIAS_GASTO.id_categoria"
      date fecha_consumo
      char(3) moneda
      decimal(12,2) monto_total
      text descripcion_sugerida "auto-generada"
      text descripcion_pago     "editable"
      varchar estado            "borrador|en_revision|aprobado|rechazado"
      timestamp creado_en
      timestamp actualizado_en
    }

    FACTURAS {
      bigint id_factura PK
      bigint id_gasto   FK "UNICO → GASTOS.id_gasto"
      varchar serie
      varchar numero          "no.factura"
      date fecha_emision
      varchar nit_emisor      "desde documento"
      varchar nombre_emisor_doc "texto exacto del documento"
      varchar nit_receptor
      varchar nombre_receptor nullable
      char(3) moneda
      decimal(12,2) total
      timestamp creado_en
      timestamp actualizado_en
    }

    FACTURA_ADJUNTOS {
      bigint id_adjunto PK
      bigint id_factura FK "→ FACTURAS.id_factura"
      varchar tipo       "foto_factura|pdf|xml|otro"
      varchar url        "ruta/URL del archivo"
      varchar mime_type
      bigint tamano_bytes
      varchar hash_contenido
      timestamp creado_en
    }

```
