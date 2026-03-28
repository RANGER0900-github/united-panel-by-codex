import type { AxiosInstance } from "axios";
import type { Socket } from "socket.io-client";

declare module "@/api/client" {
  export const api: AxiosInstance;
  export function connectSocket(): Socket;
  export function getToken(): string | null;
  export function setToken(token: string): void;
  export function clearToken(): void;
}
