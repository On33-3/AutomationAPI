import { APIRequestContext } from "@playwright/test";
import { SimpleBookAPIRequests } from "./SimpleBookAPIRequests";

export class ApiManager {
  readonly context: APIRequestContext;
  readonly apiRequests: SimpleBookAPIRequests;

  constructor(context: APIRequestContext) {
    this.context = context;
    this.apiRequests = new SimpleBookAPIRequests(context); // Instanciar SimpleBookAPIRequests con el context
  }
}
