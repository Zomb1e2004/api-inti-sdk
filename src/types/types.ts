// ── Compartidos ───────────────────────────────────────────────────────────────

type EstadoContribuyente =
  | "ACTIVO"
  | "BAJA PROVISIONAL"
  | "BAJA DEFINITIVA"
  | "SUSPENDIDO";
type CondicionDomicilio = "HABIDO" | "NO HABIDO" | "NO HALLADO" | "PENDIENTE";

// ── getInfoByRuc ──────────────────────────────────────────────────────────────

export interface InfoByRuc {
  ruc: string;
  razonSocial: string;
  estado: EstadoContribuyente;
  condicionDomicilio: CondicionDomicilio;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccionCompleta: string;
  tipoVia: string;
  nombreVia: string;
  numero: string;
}

// ── getEstablishmentsByRuc ────────────────────────────────────────────────────

export interface Establecimiento {
  codigo: string;
  tipo: "PRINCIPAL" | "ANEXO";
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  estado: EstadoContribuyente;
}

export interface EstablishmentsByRuc {
  ruc: string;
  razonSocial: string;
  totalEstablecimientos: number;
  establecimientos: Establecimiento[];
}

// ── getRucByDni ───────────────────────────────────────────────────────────────

interface RucByDniConRuc {
  dni: string;
  tieneRuc: true;
  ruc: string;
  razonSocial: string;
  estado: EstadoContribuyente;
  condicionDomicilio: CondicionDomicilio;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

interface RucByDniSinRuc {
  dni: string;
  tieneRuc: false;
  mensaje: string;
}

export type RucByDni = RucByDniConRuc | RucByDniSinRuc;

// ── getInfoByDni ──────────────────────────────────────────────────────────────

export interface InfoByDni {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

// ── getTaxDomicileByRuc ───────────────────────────────────────────────────────

export interface DomicilioFiscal {
  ubigeo: string;
  tipoVia: string;
  nombreVia: string;
  numero: string;
  interior: string | null;
  lote: string | null;
  departamento: string;
  provincia: string;
  distrito: string;
  direccionCompleta: string;
}

export interface TaxDomicileByRuc {
  ruc: string;
  razonSocial: string;
  domicilioFiscal: DomicilioFiscal;
  condicionDomicilio: CondicionDomicilio;
  estado: EstadoContribuyente;
}
