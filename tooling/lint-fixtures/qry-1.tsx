// lint-as: console/src/features/tables/api/queries.ts
import createClient from "openapi-fetch";
import axios from "axios";

export const client = createClient({ baseUrl: "/" });
export const loadDirect = (): Promise<Response> => fetch("/v1/tables");
export const loadWindow = (): Promise<Response> => window.fetch("/v1/tables");
export { axios };
