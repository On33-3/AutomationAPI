import { APIRequestContext, expect, test } from "@playwright/test";
import * as dotenv from "dotenv";
import { ApiManager } from "../API/ApiManager";
// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Test para gestionar llamadas, GET,POST,DELETE,PATCH
test("simple book api", async ({ request }) => {
  const apiM = new ApiManager(request);
  await apiM.apiRequests.getToken();
  await apiM.apiRequests.submitOrder();
  const allOrders = await apiM.apiRequests.getAllOrders();
  await apiM.apiRequests.updateOrder(allOrders)
});
