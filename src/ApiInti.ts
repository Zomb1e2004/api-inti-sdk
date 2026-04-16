import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  InfoByRuc,
  EstablishmentsByRuc,
  RucByDni,
  InfoByDni,
  TaxDomicileByRuc,
} from "./types/types";

const BASE_URL = "https://app.apiinti.dev/api/v1";

class ApiInti {
  private token = "";
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL });

    this.http.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${this.token}`;
      return config;
    });

    this.http.interceptors.response.use(
      (res) => res,
      (error: AxiosError<{ message?: string }>) => {
        const message = error.response?.data?.message ?? "Error en la API";
        throw new Error(message);
      },
    );
  }

  /**
   * Establece el token de autenticación Bearer para consumir la API.
   * Debe ejecutarse antes de realizar cualquier consulta.
   * @param token API Key proporcionada por ApiInti.
   */
  ConfigToken(token: string): void {
    if (!token?.trim()) {
      throw new Error("El token no puede estar vacío");
    }
    this.token = token;
  }

  /**
   * Obtiene información general de una empresa o contribuyente mediante su RUC.
   * @param ruc Número de RUC de 11 dígitos.
   * @returns Datos registrales, dirección y estado del contribuyente.
   */
  async getInfoByRuc(ruc: string): Promise<InfoByRuc> {
    this.validateRuc(ruc);
    const { data } = await this.http.get(`/ruc/${ruc}`);
    return data.data;
  }

  /**
   * Obtiene la lista de establecimientos vinculados a un RUC.
   * Incluye sede principal y anexos registrados.
   * @param ruc Número de RUC de 11 dígitos.
   * @returns Relación de establecimientos registrados.
   */
  async getEstablishmentsByRuc(ruc: string): Promise<EstablishmentsByRuc> {
    this.validateRuc(ruc);
    const { data } = await this.http.get(`/ruc/${ruc}/establecimientos`);
    return data.data;
  }

  /**
   * Consulta si una persona identificada por DNI posee RUC asociado.
   * @param dni Número de DNI de 8 dígitos.
   * @returns Información del RUC vinculado o resultado negativo.
   */
  async getRucByDni(dni: string): Promise<RucByDni> {
    this.validateDni(dni);
    const { data } = await this.http.get(`/dni/${dni}/ruc`);
    return data.data;
  }

  /**
   * Consulta los datos personales asociados a un DNI.
   * @param dni Número de DNI de 8 dígitos.
   * @returns Nombres, apellidos y nombre completo.
   */
  async getInfoByDni(dni: string): Promise<InfoByDni> {
    this.validateDni(dni);
    const { data } = await this.http.get(`/dni/${dni}`);
    return data.data;
  }

  /**
   * Obtiene el domicilio fiscal registrado de un contribuyente por RUC.
   * @param ruc Número de RUC de 11 dígitos.
   * @returns Dirección fiscal completa, ubicación y estado.
   */
  async getTaxDomicileByRuc(ruc: string): Promise<TaxDomicileByRuc> {
    this.validateRuc(ruc);
    const { data } = await this.http.get(`/ruc/${ruc}/domicilio`);
    return data.data;
  }

  private validateRuc(ruc: string): void {
    if (!this.token) throw new Error("Token no configurado");
    if (!/^\d{11}$/.test(ruc))
      throw new Error("RUC debe tener 11 dígitos numéricos");
  }

  private validateDni(dni: string): void {
    if (!this.token) throw new Error("Token no configurado");
    if (!/^\d{8}$/.test(dni))
      throw new Error("DNI debe tener 8 dígitos numéricos");
  }
}

export default ApiInti;
