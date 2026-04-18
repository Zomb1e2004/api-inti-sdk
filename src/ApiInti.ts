import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  InfoByRuc,
  EstablishmentsByRuc,
  RucByDni,
  InfoByDni,
  TaxDomicileByRuc,
} from "./types/types";

const BASE_URL = "https://app.apiinti.dev/api/v1";
const DEFAULT_TIMEOUT = 10000;

export interface ApiIntiOptions {
  token?: string;
  baseURL?: string;
  timeout?: number;
}

export interface ApiIntiRateLimitInfo {
  limit?: number;
  remaining?: number;
  reset?: string;
}

export class ApiIntiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly rateLimit?: ApiIntiRateLimitInfo;
  readonly cause?: unknown;

  constructor(
    message: string,
    status?: number,
    code?: string,
    rateLimit?: ApiIntiRateLimitInfo,
    cause?: unknown,
  ) {
    super(message);
    this.name = "ApiIntiError";
    this.status = status;
    this.code = code;
    this.rateLimit = rateLimit;
    this.cause = cause;
  }
}

/**
 * Indica si un error es apto para reintentos automáticos.
 *
 * Casos considerados reintentables:
 * - Timeouts o errores de red del cliente.
 * - HTTP 408, 425, 429.
 * - HTTP 5xx (500-504).
 * - Codigo de API `RATE_LIMITED`.
 *
 * @param error Error desconocido a evaluar.
 * @returns `true` si conviene reintentar la solicitud.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ApiIntiError)) return false;

  if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") return true;
  if (error.code === "RATE_LIMITED") return true;

  const status = error.status;
  if (typeof status !== "number") return false;

  if (status === 408 || status === 425 || status === 429) return true;
  if (status >= 500 && status <= 504) return true;

  return false;
}

interface ApiResponse<T> {
  data: T;
}

interface ApiErrorPayload {
  message?: string;
  code?: string;
  error?: {
    message?: string;
    code?: string;
  };
}

const endpoints = {
  rucInfo: (ruc: string) => `/ruc/${ruc}`,
  rucEstablishments: (ruc: string) => `/ruc/${ruc}/establecimientos`,
  rucDomicile: (ruc: string) => `/ruc/${ruc}/domicilio`,
  dniRuc: (dni: string) => `/dni/${dni}/ruc`,
  dniInfo: (dni: string) => `/dni/${dni}`,
};

class ApiInti {
  private token = "";
  private readonly http: AxiosInstance;

  /**
   * Crea una nueva instancia del cliente ApiInti.
   *
   * Este cliente envuelve llamadas HTTP a `https://app.apiinti.dev/api/v1`
   * y agrega automaticamente el header `Authorization: Bearer <token>`
   * cuando el token esta configurado.
   *
   * Puedes inicializarlo con token desde el constructor o configurarlo luego
   * con `configToken`.
   *
   * @param options Token string o configuracion avanzada.
   */
  constructor(options?: string | ApiIntiOptions) {
    const normalizedOptions: ApiIntiOptions =
      typeof options === "string" ? { token: options } : (options ?? {});

    this.http = axios.create({
      baseURL: normalizedOptions.baseURL ?? BASE_URL,
      timeout: normalizedOptions.timeout ?? DEFAULT_TIMEOUT,
    });

    if (normalizedOptions.token?.trim()) {
      this.token = normalizedOptions.token.trim();
    }

    this.http.interceptors.request.use((config) => {
      config.headers = config.headers ?? {};
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.http.interceptors.response.use(
      (res) => res,
      (error: AxiosError<ApiErrorPayload>) => {
        if (!error.response) {
          if (error.code === "ECONNABORTED") {
            throw new ApiIntiError(
              "Timeout agotado al consultar ApiInti. Intenta nuevamente.",
              undefined,
              "TIMEOUT",
              undefined,
              error,
            );
          }
          throw new ApiIntiError(
            "No se pudo conectar con ApiInti. Verifica tu red e intenta nuevamente.",
            undefined,
            error.code ?? "NETWORK_ERROR",
            undefined,
            error,
          );
        }

        const status = error.response?.status;
        const responseData = error.response.data;
        const apiCode = responseData?.error?.code ?? responseData?.code;
        const apiMessage =
          responseData?.error?.message ??
          responseData?.message ??
          "Error en la API";
        const rateLimit: ApiIntiRateLimitInfo = {
          limit: this.parseHeaderNumber(error.response.headers["x-ratelimit-limit"]),
          remaining: this.parseHeaderNumber(
            error.response.headers["x-ratelimit-remaining"],
          ),
          reset: this.parseHeaderString(error.response.headers["x-ratelimit-reset"]),
        };

        throw new ApiIntiError(
          status ? `[${status}${apiCode ? `:${apiCode}` : ""}] ${apiMessage}` : apiMessage,
          status,
          apiCode,
          rateLimit,
          error,
        );
      },
    );
  }

  /**
   * Configura o actualiza el token de autenticacion Bearer.
   *
   * Debes llamar este metodo antes de cualquier consulta si no enviaste
   * el token en el constructor. El token se reutiliza en todas las peticiones.
   *
   * @param token API Key proporcionada por ApiInti.
   * @throws {ApiIntiError} Si el token esta vacio o solo tiene espacios.
   */
  configToken(token: string): void {
    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      throw new ApiIntiError("El token no puede estar vacío");
    }
    this.token = normalizedToken;
  }

  /**
   * @deprecated Usa `configToken(token)` en su lugar.
   */
  ConfigToken(token: string): void {
    this.configToken(token);
  }

  /**
   * Obtiene informacion general de un contribuyente por RUC.
   *
   * Util para validar razon social, estado del contribuyente y direccion
   * principal registrada.
   *
   * @param ruc Numero de RUC de 11 digitos (solo numeros).
   * @returns Datos registrales y estado del contribuyente.
   * @throws {Error} Si no hay token configurado.
   * @throws {Error} Si el RUC no tiene 11 digitos numericos.
   * @throws {Error} Si la API responde con error.
   */
  async getInfoByRuc(ruc: string): Promise<InfoByRuc> {
    const normalizedRuc = this.validate(ruc, /^\d{11}$/, "RUC debe tener 11 dígitos numéricos");
    const { data } = await this.http.get<ApiResponse<InfoByRuc>>(
      endpoints.rucInfo(normalizedRuc),
    );
    return data.data;
  }

  /**
   * Lista los establecimientos asociados a un RUC.
   *
   * Incluye sede principal y anexos, con ubicacion y estado de cada uno.
   *
   * @param ruc Numero de RUC de 11 digitos (solo numeros).
   * @returns Coleccion de establecimientos registrados para ese RUC.
   * @throws {Error} Si no hay token configurado.
   * @throws {Error} Si el RUC no tiene 11 digitos numericos.
   * @throws {Error} Si la API responde con error.
   */
  async getEstablishmentsByRuc(ruc: string): Promise<EstablishmentsByRuc> {
    const normalizedRuc = this.validate(ruc, /^\d{11}$/, "RUC debe tener 11 dígitos numéricos");
    const { data } = await this.http.get<ApiResponse<EstablishmentsByRuc>>(
      endpoints.rucEstablishments(normalizedRuc),
    );
    return data.data;
  }

  /**
   * Consulta si un DNI tiene un RUC asociado.
   *
   * La respuesta es un tipo union:
   * - Si `tieneRuc` es `true`, encontraras datos del RUC.
   * - Si `tieneRuc` es `false`, recibirás un mensaje informativo.
   *
   * @param dni Numero de DNI de 8 digitos (solo numeros).
   * @returns Resultado con o sin RUC asociado al DNI.
   * @throws {Error} Si no hay token configurado.
   * @throws {Error} Si el DNI no tiene 8 digitos numericos.
   * @throws {Error} Si la API responde con error.
   */
  async getRucByDni(dni: string): Promise<RucByDni> {
    const normalizedDni = this.validate(dni, /^\d{8}$/, "DNI debe tener 8 dígitos numéricos");
    const { data } = await this.http.get<ApiResponse<RucByDni>>(
      endpoints.dniRuc(normalizedDni),
    );
    return data.data;
  }

  /**
   * Obtiene datos personales basicos asociados a un DNI.
   *
   * Entrega nombres, apellidos y nombre completo normalizado.
   *
   * @param dni Numero de DNI de 8 digitos (solo numeros).
   * @returns Informacion personal asociada al DNI.
   * @throws {Error} Si no hay token configurado.
   * @throws {Error} Si el DNI no tiene 8 digitos numericos.
   * @throws {Error} Si la API responde con error.
   */
  async getInfoByDni(dni: string): Promise<InfoByDni> {
    const normalizedDni = this.validate(dni, /^\d{8}$/, "DNI debe tener 8 dígitos numéricos");
    const { data } = await this.http.get<ApiResponse<InfoByDni>>(
      endpoints.dniInfo(normalizedDni),
    );
    return data.data;
  }

  /**
   * Consulta el domicilio fiscal de un contribuyente por RUC.
   *
   * Devuelve la direccion detallada (via, numero, interior, lote y ubigeo),
   * junto al estado y condicion del domicilio.
   *
   * @param ruc Numero de RUC de 11 digitos (solo numeros).
   * @returns Datos de domicilio fiscal y estado del contribuyente.
   * @throws {Error} Si no hay token configurado.
   * @throws {Error} Si el RUC no tiene 11 digitos numericos.
   * @throws {Error} Si la API responde con error.
   */
  async getTaxDomicileByRuc(ruc: string): Promise<TaxDomicileByRuc> {
    const normalizedRuc = this.validate(ruc, /^\d{11}$/, "RUC debe tener 11 dígitos numéricos");
    const { data } = await this.http.get<ApiResponse<TaxDomicileByRuc>>(
      endpoints.rucDomicile(normalizedRuc),
    );
    return data.data;
  }

  /**
   * Valida precondiciones comunes antes de consultar la API.
   *
   * Reglas:
   * - Debe existir token configurado.
   * - El valor recibido debe cumplir el patron esperado (regex).
   *
   * @param value Valor a validar (RUC o DNI).
   * @param regex Patron de validacion.
   * @param message Mensaje de error para formato invalido.
   * @returns Valor normalizado (sin espacios en extremos).
   * @throws {ApiIntiError} Si no existe token configurado.
   * @throws {ApiIntiError} Si el valor no cumple el formato esperado.
   */
  private validate(value: string, regex: RegExp, message: string): string {
    const normalizedValue = value?.trim();
    if (!this.token) throw new ApiIntiError("Token no configurado");
    if (!regex.test(normalizedValue)) throw new ApiIntiError(message);
    return normalizedValue;
  }

  private parseHeaderNumber(value: unknown): number | undefined {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (typeof firstValue !== "string") return undefined;
    const parsed = Number(firstValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseHeaderString(value: unknown): string | undefined {
    const firstValue = Array.isArray(value) ? value[0] : value;
    return typeof firstValue === "string" ? firstValue : undefined;
  }

  /**
   * Expone la instancia interna de Axios para casos avanzados.
   *
   * Ejemplos de uso:
   * - agregar interceptores adicionales
   * - ajustar timeouts por request
   * - integrar logging o tracing personalizado
   *
   * @returns Cliente Axios configurado por esta clase.
   */
  get client(): AxiosInstance {
    return this.http;
  }
}

export default ApiInti;
