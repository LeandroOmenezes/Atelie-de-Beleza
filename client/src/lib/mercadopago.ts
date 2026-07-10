let mpInstance: any = null;
let mpInitPromise: Promise<any> | null = null;
let activeCardForm: any = null;
const sdkScriptUrl = "https://sdk.mercadopago.com/js/v2";
// evita múltiplas montagens concorrentes por container
const mountingPromises: Record<string, Promise<any> | null> = {};

function removeMercadoPagoScripts(): void {
  document.querySelectorAll<HTMLScriptElement>(`script[src="${sdkScriptUrl}"]`).forEach((script) => script.remove());
}

function clearMercadoPagoContexts(): void {
  try {
    const mercadoPagoClass = (window as any).MercadoPago;
    if (!mercadoPagoClass) {
      return;
    }

    if (typeof mercadoPagoClass.destroyContexts === "function") {
      mercadoPagoClass.destroyContexts();
      console.log("Mercado Pago: internal SDK contexts destruídos");
      return;
    }

    if (typeof mercadoPagoClass.deleteContext === "function") {
      mercadoPagoClass.deleteContext("expirationFields");
      mercadoPagoClass.deleteContext("formMap");
      console.log("Mercado Pago: contextos internos expirations/formMap excluídos");
    }
  } catch (error) {
    console.warn("Mercado Pago: falha ao limpar contextos internos do SDK", error);
  }
}

async function loadMercadoPagoSdk(): Promise<void> {
  if (window.MercadoPago) {
    return;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${sdkScriptUrl}"]`);
  if (existingScript && (existingScript.dataset.loaded === "true" || window.MercadoPago)) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      console.log("Mercado Pago: SDK carregado");
      if (existingScript) existingScript.dataset.loaded = "true";
      resolve();
    };

    const onError = () => reject(new Error("Failed to load Mercado Pago SDK"));

    if (existingScript) {
      if (window.MercadoPago) {
        return resolve();
      }

      existingScript.addEventListener("load", onLoad, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = sdkScriptUrl;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      document.head.appendChild(script);
    }
  });
}

export async function resetMercadoPagoSdk() {
  console.warn("Mercado Pago: resetando SDK");
  mpInstance = null;
  mpInitPromise = null;
  activeCardForm = null;
  clearMercadoPagoContexts();
  removeMercadoPagoScripts();
  try {
    delete (window as any).MercadoPago;
  } catch {
    (window as any).MercadoPago = undefined;
  }
}

/**
 * Inicializa e retorna a instância do SDK do Mercado Pago
 * Busca a chave pública do backend para evitar duplicação de segredos
 */
export async function getMercadoPago() {
  if (mpInstance) {
    return mpInstance;
  }

  if (mpInitPromise) {
    return mpInitPromise;
  }

  mpInitPromise = (async () => {
    try {
      console.log("Mercado Pago: inicializando SDK");
      const response = await fetch("/api/config/mercadopago-public-key");
      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(`Failed to fetch Mercado Pago public key (${response.status}): ${bodyText}`);
      }

      const { publicKey } = await response.json();
      console.log("Mercado Pago: public key carregada", publicKey);

      await loadMercadoPagoSdk();

      if (!window.MercadoPago) {
        throw new Error("Mercado Pago SDK não ficou disponível após o carregamento");
      }

      mpInstance = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      console.log("Mercado Pago: instância criada", { mpInstance, hasCardForm: !!mpInstance?.cardForm });
      if (!mpInstance?.cardForm) {
        console.warn("Mercado Pago: cardForm não encontrado, resetando SDK e tentando novamente");
        await resetMercadoPagoSdk();
        await loadMercadoPagoSdk();

        if (!window.MercadoPago) {
          throw new Error("Mercado Pago SDK não ficou disponível após reset");
        }

        mpInstance = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        if (!mpInstance?.cardForm) {
          throw new Error("Mercado Pago SDK carregado após reset, mas cardForm ainda não está disponível");
        }
      }
      return mpInstance;
    } catch (error) {
      mpInitPromise = null;
      console.error("Erro ao inicializar Mercado Pago:", error);
      throw error;
    }
  })();

  return mpInitPromise;
}

/**
 * Cria um formulário de cartão para pagamentos
 * @param containerId ID do elemento container onde renderizar o formulário
 * @param options Opções de configuração
 */
async function waitForFormContainer(containerId: string, timeout = 3000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const element = document.getElementById(containerId);
    if (
      element &&
      (element.tagName === "FORM" || element.tagName === "DIV") &&
      element.isConnected
    ) {
      return element as HTMLFormElement;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Form container '${containerId}' não está disponível ou não é um <form> ou <div> no DOM`);
}

export async function createCardForm(containerId: string, options: any = {}) {
  // evita montagens concorrentes para o mesmo container
  if (mountingPromises[containerId]) {
    return mountingPromises[containerId];
  }

  const promise = (async () => {
    const mp = await getMercadoPago();
    const suffix = containerId.replace(/[^a-zA-Z0-9_-]/g, "-");

    if (typeof mp.cardForm !== "function") {
      throw new Error("Mercado Pago SDK cardForm não está disponível");
    }

    if (activeCardForm) {
      try {
        await destroyCardForm(activeCardForm);
      } catch (destroyError) {
        console.warn("Mercado Pago: falha ao destruir card form ativo antes de criar novo", destroyError);
      }
      activeCardForm = null;
      await resetMercadoPagoSdk();
      await getMercadoPago();
    }

    await waitForFormContainer(containerId);

    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      throw new Error(`Mercado Pago container '${containerId}' não encontrado antes da montagem`);
    }

    const formId = `${containerId}-form`;
    let formElement: HTMLFormElement;

    if (containerElement.tagName === "FORM") {
      formElement = containerElement as HTMLFormElement;
    } else {
      formElement = document.createElement("form");
      formElement.id = formId;
      formElement.noValidate = true;
      formElement.style.margin = "0";
      formElement.style.padding = "0";
      formElement.style.border = "none";
      containerElement.appendChild(formElement);
    }

    const fields = [
      { id: `cardNumber-${suffix}`, name: "cardNumber" },
      { id: `cardExpirationDate-${suffix}`, name: "cardExpirationDate" },
      { id: `securityCode-${suffix}`, name: "securityCode" },
      { id: `cardholderName-${suffix}`, name: "cardholderName" },
    ];

    formElement.innerHTML = "";

    const ensurePlaceholder = (field: { id: string; name: string }) => {
      const placeholder = document.createElement("input");
      placeholder.type = "text";
      placeholder.id = field.id;
      placeholder.name = field.name;
      placeholder.autocomplete = "off";
      placeholder.style.width = "100%";
      placeholder.style.border = "none";
      placeholder.style.padding = "0";
      placeholder.style.margin = "0";
      placeholder.style.background = "transparent";
      formElement.appendChild(placeholder);
    };

    fields.forEach(ensurePlaceholder);

    console.debug("Mercado Pago: preparando cardForm", {
      containerId,
      amount: options.amount,
      formId,
      fields,
      containerExists: !!containerElement,
      containerTag: containerElement?.tagName,
      formTag: formElement?.tagName,
    });

    let cardFormInstance: any;

    const mountPromise = new Promise<any>((resolve, reject) => {
      const timeoutMs = 10000;
      const timeout = window.setTimeout(() => {
        reject(new Error(`Mercado Pago form mount timeout after ${timeoutMs}ms for container '${containerId}'`));
      }, timeoutMs);

      const resolveMount = (value: any) => {
        window.clearTimeout(timeout);
        // marca como ativo só após montagem bem-sucedida
        try {
          activeCardForm = cardFormInstance;
        } catch (e) {
          console.warn("Mercado Pago: falha ao setar activeCardForm no resolve", e);
        }
        // limpa promise guard
        delete mountingPromises[containerId];
        resolve(value);
      };

      const rejectMount = (error: any) => {
        window.clearTimeout(timeout);
        // limpa promise guard
        delete mountingPromises[containerId];
        reject(error);
      };

      const callbacks = {
        onFormMounted: (error: any) => {
          if (error) {
            try {
              console.error("Mercado Pago form mount error:", typeof error === 'object' ? JSON.stringify(error) : error, error);
            } catch (e) {
              console.error("Mercado Pago form mount error (stringify failed):", error);
            }
            rejectMount(error);
          } else {
            console.log("Mercado Pago card form montado com sucesso", { containerId });
            resolveMount(cardFormInstance);
          }
        },
        onError: (error: any, origin: string) => {
          try {
            console.error("Mercado Pago card form callback error:", origin, typeof error === 'object' ? JSON.stringify(error) : error, error);
          } catch (e) {
            console.error("Mercado Pago card form callback error:", origin, error);
          }
          rejectMount(error || new Error(`Mercado Pago error callback from ${origin}`));
        },
        onCardTokenReceived: (error: any, token: any) => {
          if (error) {
            try {
              console.error("Mercado Pago token error:", JSON.stringify(error));
            } catch (e) {
              console.error("Mercado Pago token error:", error);
            }
          } else {
            console.log("Mercado Pago token recebido:", token);
          }
        },
        ...(options.callbacks || {}),
      };

      const getErrorMessage = (error: any): string => {
        if (!error) return "";
        if (typeof error === "string") return error;
        if (typeof error.message === "string") return error.message;
        if (typeof error.toString === "function") {
          const str = error.toString();
          if (str !== "[object Object]") return str;
        }
        try {
          return JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2);
        } catch {
          return String(error);
        }
      };

      const tryCreate = async (attempt: number) => {
        try {
          cardFormInstance = mp.cardForm({
            amount: options.amount?.toString() || "0",
            autoMount: true,
            form: {
              id: formId,
              cardNumber: {
                id: `cardNumber-${suffix}`,
                placeholder: "Número do cartão",
              },
              cardExpirationDate: {
                id: `cardExpirationDate-${suffix}`,
                placeholder: "MM/YY",
              },
              securityCode: {
                id: `securityCode-${suffix}`,
                placeholder: "CVV",
              },
              cardholderName: {
                id: `cardholderName-${suffix}`,
                placeholder: "Nome completo",
              },
            },
            callbacks,
          });
          // não setar activeCardForm aqui — será setado no resolveMount para evitar races
        } catch (err: any) {
          const errorMessage = getErrorMessage(err);
          console.error("Mercado Pago: exception while creating cardForm:", err);
          console.error("Mercado Pago: exception details:", {
            errorMessage,
            errorType: typeof err,
            errorName: err?.name,
            errorStack: err?.stack,
            errorString: getErrorMessage(err),
          });

          if (attempt === 0) {
            try {
              console.warn("Mercado Pago: erro ao criar cardForm — resetando SDK e tentando novamente", errorMessage);
              await resetMercadoPagoSdk();
              await getMercadoPago();
            } catch (resetError) {
              console.warn("Mercado Pago: falha ao resetar SDK durante retry", resetError);
              return rejectMount(err);
            }
            return tryCreate(attempt + 1);
          }

          return rejectMount(err);
        }
      };

      // executa a tentativa inicial
      tryCreate(0);
    });

    return await mountPromise;
  })();

  mountingPromises[containerId] = promise;
  return await promise;
}

/**
 * Tokeniza os dados do cartão para enviar ao servidor
 */
export async function tokenizeCard(cardForm: any): Promise<string | null> {
  try {
    const token = await cardForm.createCardToken();
    return token.token;
  } catch (error) {
    console.error("Erro ao tokenizar cartão:", error);
    throw error;
  }
}

export async function destroyCardForm(cardForm: any) {
  if (!cardForm) {
    return;
  }

  if (activeCardForm === cardForm) {
    activeCardForm = null;
  }

  try {
    if (typeof cardForm.destroyCardForm === "function") {
      await cardForm.destroyCardForm();
    } else if (typeof cardForm.unmount === "function") {
      await cardForm.unmount();
    } else if (typeof cardForm.destroy === "function") {
      await cardForm.destroy();
    }
  } catch (error) {
    console.warn("Mercado Pago: falha ao destruir o form de cartão", error);
  } finally {
    await resetMercadoPagoSdk();
  }
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}
