# ApiInti — SDK TypeScript

Cliente TypeScript para consumir la API de [ApiInti](https://app.apiinti.dev), que permite consultar información de contribuyentes peruanos mediante RUC y DNI.

---

## Instalación

```bash
npm install axios
```

> El SDK usa `axios` como única dependencia externa.

---

## Inicio rápido

```typescript
import ApiInti from "./ApiInti";

const api = new ApiInti();
api.ConfigToken("TU_API_KEY");

const info = await api.getInfoByRuc("20131312955");
console.log(info.razonSocial);
```

---

## Configuración

### `ConfigToken(token: string): void`

Debe llamarse **antes** de cualquier consulta. Lanza un error si el token está vacío.

```typescript
api.ConfigToken("TU_API_KEY");
```

---

## Métodos

### `getInfoByRuc(ruc: string): Promise<InfoByRuc>`

Obtiene información general de un contribuyente por su RUC.

```typescript
const data = await api.getInfoByRuc("20131312955");

// data: InfoByRuc
// {
//   ruc: "20131312955",
//   razonSocial: "SUPERINTENDENCIA NAC DE ADUANAS Y ADM TRIBUTARIA",
//   estado: "ACTIVO",
//   condicionDomicilio: "HABIDO",
//   ubigeo: "150101",
//   departamento: "LIMA",
//   provincia: "LIMA",
//   distrito: "LIMA",
//   direccionCompleta: "AV. GARCILAZO DE LA VEGA NRO. 1472",
//   tipoVia: "AV.",
//   nombreVia: "GARCILAZO DE LA VEGA",
//   numero: "1472"
// }
```

---

### `getEstablishmentsByRuc(ruc: string): Promise<EstablishmentsByRuc>`

Obtiene todos los establecimientos (sede principal y anexos) asociados a un RUC.

```typescript
const data = await api.getEstablishmentsByRuc("20131312955");

// data: EstablishmentsByRuc
// {
//   ruc: "20131312955",
//   razonSocial: "...",
//   totalEstablecimientos: 2,
//   establecimientos: [
//     { codigo: "0000", tipo: "PRINCIPAL", departamento: "LIMA", ... },
//     { codigo: "0001", tipo: "ANEXO", departamento: "LIMA", ... }
//   ]
// }
```

---

### `getRucByDni(dni: string): Promise<RucByDni>`

Consulta si un DNI tiene RUC asociado. El resultado es un **union type discriminado** por el campo `tieneRuc`.

```typescript
const data = await api.getRucByDni("12345678");

if (data.tieneRuc) {
  // data: RucByDniConRuc
  console.log(data.ruc); // "10123456781"
  console.log(data.razonSocial); // "PEREZ GARCIA JUAN CARLOS"
} else {
  // data: RucByDniSinRuc
  console.log(data.mensaje); // "No se encontro RUC asociado a este DNI"
}
```

---

### `getInfoByDni(dni: string): Promise<InfoByDni>`

Consulta los datos personales asociados a un DNI.

```typescript
const data = await api.getInfoByDni("12345678");

// data: InfoByDni
// {
//   dni: "12345678",
//   nombres: "JUAN CARLOS",
//   apellidoPaterno: "PEREZ",
//   apellidoMaterno: "GARCIA",
//   nombreCompleto: "PEREZ GARCIA JUAN CARLOS"
// }
```

---

### `getTaxDomicileByRuc(ruc: string): Promise<TaxDomicileByRuc>`

Obtiene el domicilio fiscal registrado de un contribuyente.

```typescript
const data = await api.getTaxDomicileByRuc("20131312955");

// data: TaxDomicileByRuc
// {
//   ruc: "20131312955",
//   razonSocial: "...",
//   condicionDomicilio: "HABIDO",
//   estado: "ACTIVO",
//   domicilioFiscal: {
//     ubigeo: "150101",
//     tipoVia: "AV.",
//     nombreVia: "GARCILASO DE LA VEGA",
//     numero: "1472",
//     interior: null,
//     lote: null,
//     departamento: "LIMA",
//     provincia: "LIMA",
//     distrito: "LIMA",
//     direccionCompleta: "AV. GARCILASO DE LA VEGA NRO. 1472, LIMA - LIMA - LIMA"
//   }
// }
```

---

## Tipos

Todos los tipos están definidos en `ApiInti.types.ts` y pueden importarse directamente:

```typescript
import type {
  InfoByRuc,
  EstablishmentsByRuc,
  Establecimiento,
  RucByDni,
  InfoByDni,
  DomicilioFiscal,
  TaxDomicileByRuc,
} from "./ApiInti.types";
```

### Tipos compartidos

| Tipo                  | Valores posibles                                                            |
| --------------------- | --------------------------------------------------------------------------- |
| `EstadoContribuyente` | `"ACTIVO"` \| `"BAJA PROVISIONAL"` \| `"BAJA DEFINITIVA"` \| `"SUSPENDIDO"` |
| `CondicionDomicilio`  | `"HABIDO"` \| `"NO HABIDO"` \| `"NO HALLADO"` \| `"PENDIENTE"`              |

---

## Manejo de errores

Todos los métodos lanzan un `Error` con el mensaje devuelto por la API en caso de falla. Se recomienda envolver las llamadas en `try/catch`:

```typescript
try {
  const data = await api.getInfoByRuc("20131312955");
} catch (error) {
  console.error(error.message); // mensaje de la API o "Error en la API"
}
```

### Errores de validación local

El SDK valida el formato antes de hacer la petición:

| Situación                  | Mensaje                                 |
| -------------------------- | --------------------------------------- |
| Token no configurado       | `"Token no configurado"`                |
| Token vacío                | `"El token no puede estar vacío"`       |
| RUC con formato incorrecto | `"RUC debe tener 11 dígitos numéricos"` |
| DNI con formato incorrecto | `"DNI debe tener 8 dígitos numéricos"`  |

---

## Estructura de archivos

```
├── ApiInti.ts        # Clase principal con los métodos HTTP
└── ApiInti.types.ts  # Interfaces y tipos de respuesta
```
