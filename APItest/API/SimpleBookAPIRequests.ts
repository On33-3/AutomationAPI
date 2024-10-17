import { APIRequestContext, APIResponse } from "@playwright/test";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as fsAsync from "fs/promises"; // Usamos fs.promises para operaciones asíncronas
dotenv.config();

const utilsFolderPath = path.join(__dirname, "Utils"); // Path para la carpeta Utils
const TOKEN_FILE_PATH = path.join(utilsFolderPath, "token.json"); // Indicacion de donde crear el archivo token
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos

export class SimpleBookAPIRequests {
  readonly context: APIRequestContext;

  constructor(context: APIRequestContext) {
    this.context = context;
  }

  // Guardar el token en un archivo JSON y su tiempo de creación
  private saveTokenToFile(token: string) {
    const data = {
      token,
      timestamp: Date.now(),
    };
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(data), "utf-8"); // Importante el UTF 8
    console.log("Token guardado correctamente.");
  }

  // Leer el token desde el archivo de manera asíncrona
  private async readTokenFromFile(): Promise<{
    token: string;
    timestamp: number;
  } | null> {
    try {
      // Verificar si el archivo existe de manera asíncrona
      const fileExists = await fsAsync
        .access(TOKEN_FILE_PATH)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        const fileContent = await fsAsync.readFile(TOKEN_FILE_PATH, "utf-8"); // Leer el archivo asíncronamente
        return JSON.parse(fileContent); // Parsear el contenido
      }

      return null; // Si no existe el archivo, devolver null
    } catch (error) {
      console.error("Error al leer el archivo del token:", error);
      return null;
    }
  }

  // Registrar usuario y obtener un nuevo token
  async registerUserAndGetToken(): Promise<string> {
    const response = await this.context.post("/api-clients/", {
      data: {
        clientName: process.env.USER_NAME,
        clientEmail: process.env.USER_EMAIL,
      },
    });

    const responseJSON = await response.json();
    const token = responseJSON.accessToken;

    if (!token) {
      throw new Error("No se encontró 'accessToken' en la respuesta.");
    }

    // Guardar el nuevo token en el archivo
    this.saveTokenToFile(token);

    return token;
  }

  // Obtener el token (si es válido, reutilizar; sino, generar uno nuevo)
  async getToken(): Promise<string> {
    const tokenData = await this.readTokenFromFile(); // Leer el token ahora es asíncrono

    if (tokenData) {
      const { token, timestamp } = tokenData;
      const tokenAge = Date.now() - timestamp;

      if (tokenAge < SEVEN_DAYS_IN_MS) {
        console.log("Reutilizando token existente:", token);
        return token; // Token válido, reutilizarlo
      } else {
        console.log("El token ha expirado, generando uno nuevo...");
      }
    } else {
      console.log("No se encontró un token, generando uno nuevo...");
    }

    // Si no hay token o ha expirado, generar uno nuevo
    return await this.registerUserAndGetToken();
  }

  async listOfBooks(): Promise<any> {
    const response = await (await this.context.get("/books")).json();
    console.log(response);
    return response;
  }

  async getAllOrders(): Promise<string[]> {
    const tokenData = await this.readTokenFromFile();
    const response = await this.context.get(`/orders`, {
      headers: {
        Authorization: tokenData?.token!,
      },
    });
    const jsonResponse = await response.json();
    console.log(jsonResponse);
    const orderIds = jsonResponse.map((order) => order.id);
    console.log(orderIds);
    return orderIds;
  }

  async orderId(orderId: string): Promise<any> {
    const tokenData = await this.readTokenFromFile(); // Ahora es asíncrono
    const response = await this.context.get(`/orders/${orderId}`, {
      headers: {
        Authorization: tokenData?.token!,
      },
    });
    const jsonResponse = await response.json();
    console.log(jsonResponse);
    return jsonResponse;
  }

  async submitOrder(): Promise<any> {
    const tokenData = await this.readTokenFromFile(); // Ahora es asíncrono
    const response = await this.context.post("/orders/", {
      headers: {
        Authorization: tokenData?.token!,
      },
      data: {
        bookId: 1!,
        customerName: "EG"!,
      },
    });

    const jsonResponse = await response.json();
    console.log(jsonResponse.orderId);
    return this.orderId(jsonResponse.orderId);
  }

  async deleteOrder(ordersId: string[]): Promise<void> {
    const tokenData = await this.readTokenFromFile();

    // Selecciona una orden al azar
    const randomIndex = Math.floor(Math.random() * ordersId.length);
    const orderIdToDelete = ordersId[randomIndex];
    console.log(`Intentando eliminar la orden con ID: ${orderIdToDelete}`);

    // Enviar la solicitud para eliminar la orden
    const response = await this.context.delete(`/orders/${orderIdToDelete}`, {
      headers: {
        Authorization: tokenData?.token!,
      },
    });
    //Se verifica que la respuesta sea valida, 200 o 400, a su vez imprimiendo el codigo y orden eliminada
    if (response.status() === 200 || response.status() === 204) {
      console.log(`Orden con ID ${orderIdToDelete} eliminada exitosamente.`);
    } else {
      console.log(
        `Error al eliminar la orden con ID ${orderIdToDelete}. Status: ${response.status()}`
      );
    }
  }

  async updateOrder(ordersId: string[]): Promise<void> {
    const tokenData = await this.readTokenFromFile();
    const randomIndex = Math.floor(Math.random() * ordersId.length);
    const orderIdToUpdate = ordersId[randomIndex];
    console.log(`Objeto previo al cambio: ${orderIdToUpdate}`);
    const response = await this.context.patch(`/orders/${orderIdToUpdate}`, {
      headers: {
        Authorization: tokenData?.token!,
      },
      data: {
        customerName: "Pepe el cambiaso",
      },
    });
    await this.orderId(orderIdToUpdate);
  }
}
