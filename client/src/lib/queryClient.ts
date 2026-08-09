import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    let serverMessage: string | null = null;
    try {
      const errorData = JSON.parse(text);
      if (errorData.message) serverMessage = errorData.message;
    } catch {
      // body not JSON
    }

    if (serverMessage) throw new Error(serverMessage);
    if (res.status === 401) throw new Error("Email ou senha inválidos");
    if (res.status === 403) throw new Error("Acesso negado");
    if (res.status >= 500) throw new Error("Erro interno do servidor");
    throw new Error(res.statusText || "Erro desconhecido");
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let res: Response;

  try {
    res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (error: any) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("failed to fetch") || message.includes("networkerror")) {
      throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    }
    throw new Error("Não foi possível realizar a comunicação com o servidor.");
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let res: Response;

    try {
      res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("failed to fetch") || message.includes("networkerror")) {
        throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
      }
      throw new Error("Não foi possível carregar os dados do servidor.");
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
