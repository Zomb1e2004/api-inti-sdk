# api-inti-dev

Package no oficial para consumir la API de [ApiInti](https://app.apiinti.dev/) desde Node.js y TypeScript.

Permite consultar informacion de contribuyentes y personas en Peru usando RUC y DNI, con metodos tipados y validaciones basicas de entrada.

## Instalacion

```bash
npm install api-inti-dev@latest
```

## Requisitos

- Node.js 18 o superior
- API Key de ApiInti

## Uso rapido

```ts
import { ApiInti } from "api-inti";

const api = new ApiInti();
api.configToken(process.env.APIINTI_TOKEN ?? "");

const info = await api.getInfoByRuc("20123456789");
console.log(info.razonSocial);
```

Tambien puedes pasar el token en el constructor:

```ts
import { ApiInti } from "api-inti";

const api = new ApiInti(process.env.APIINTI_TOKEN);
```

O usar opciones avanzadas:

```ts
import { ApiInti } from "api-inti";

const api = new ApiInti({
  token: process.env.APIINTI_TOKEN,
  timeout: 15000,
  baseURL: "https://app.apiinti.dev/api/v1",
});
```

## Metodos disponibles

### `configToken(token: string): void`

Configura o actualiza el token Bearer para autenticar todas las solicitudes.

### `ConfigToken(token: string): void` (deprecated)

Se mantiene por compatibilidad con versiones anteriores. Se recomienda usar `configToken`.

### `getInfoByRuc(ruc: string): Promise<InfoByRuc>`

Obtiene informacion general de un contribuyente por RUC (11 digitos).

```ts
const data = await api.getInfoByRuc("20123456789");
console.log(data.ruc, data.razonSocial, data.estado);
```

### `getEstablishmentsByRuc(ruc: string): Promise<EstablishmentsByRuc>`

Lista establecimientos (principal y anexos) asociados a un RUC.

```ts
const data = await api.getEstablishmentsByRuc("20123456789");
console.log(data.totalEstablecimientos);
```

### `getRucByDni(dni: string): Promise<RucByDni>`

Consulta si un DNI (8 digitos) tiene RUC asociado.

```ts
const data = await api.getRucByDni("12345678");

if (data.tieneRuc) {
  console.log(data.ruc, data.razonSocial);
} else {
  console.log(data.mensaje);
}
```

### `getInfoByDni(dni: string): Promise<InfoByDni>`

Obtiene nombres y apellidos asociados a un DNI.

```ts
const data = await api.getInfoByDni("12345678");
console.log(data.nombreCompleto);
```

### `getTaxDomicileByRuc(ruc: string): Promise<TaxDomicileByRuc>`

Consulta el domicilio fiscal de un contribuyente por RUC.

```ts
const data = await api.getTaxDomicileByRuc("20123456789");
console.log(data.domicilioFiscal.direccionCompleta);
```

### `client: AxiosInstance` (getter)

Expone la instancia interna de Axios para casos avanzados (interceptores extra, configuracion custom, etc.).

## Tipos TypeScript

El paquete incluye declaraciones de tipos para:

- `ApiIntiOptions`
- `InfoByRuc`
- `EstablishmentsByRuc`
- `RucByDni`
- `InfoByDni`
- `TaxDomicileByRuc`

## Manejo de errores

Este package lanza errores cuando:

- No se configura token (`Token no configurado`)
- El formato de RUC o DNI es invalido
- La API responde con error (por ejemplo: `[401] No autorizado`)

Todos los errores del SDK son instancias de `ApiIntiError`.
Ademas de `message`, exponen:

- `status`: codigo HTTP si existe
- `code`: codigo de error de la API (si la API lo envia)
- `rateLimit`: metadatos de limite (`limit`, `remaining`, `reset`) si vienen en headers

Tambien puedes usar `isRetryableError(error)` para decidir reintentos automáticos.

Ejemplo:

```ts
import { ApiInti, ApiIntiError, isRetryableError } from "api-inti";

try {
  const data = await api.getInfoByDni("12345678");
  console.log(data);
} catch (error) {
  if (error instanceof ApiIntiError) {
    console.error(error.message);
    console.error("status:", error.status);
    console.error("code:", error.code);
    console.error("rateLimit:", error.rateLimit);
  } else {
    console.error("Error inesperado", error);
  }

  if (isRetryableError(error)) {
    console.log("Error temporal: puedes reintentar la solicitud.");
  }
}
```

## Scripts de desarrollo

```bash
npm run build   # build CJS + ESM + d.ts
npm run dev     # modo watch
```

## Licencia

MIT
