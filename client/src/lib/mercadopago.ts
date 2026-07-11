let mpInstance: any = null;
let mpInitPromise: Promise<any> | null = null;
let activeCardForm: any = null;
const sdkScriptUrl = "https://sdk.mercadopago.com/js/v2";
// evita múltiplas montagens concorrentes por container
const mountingPromises: Record<string, Promise<any> | null> = {};

// Debug helpers expostos globalmente para diagnóstico em runtime
try {
  const g: any = window as any;
  if (!g.__mpDebugLogs) g.__mpDebugLogs = [];
  if (!g.__lastMercadoPagoError) g.__lastMercadoPagoError = null;
  if (!g.getMercadoPagoDebug) {
    g.getMercadoPagoDebug = () => ({
      lastError: g.__lastMercadoPagoError,
      logs: g.__mpDebugLogs,
      mercadoPagoKeys: typeof g.MercadoPago !== 'undefined' ? Object.keys(g.MercadoPago).slice(0,50) : null,
      windowKeys: Object.keys(g).filter(k => k.toLowerCase().includes('mercad')),
    });
  }
} catch (e) {
  // ignore
}

function removeMercadoPagoScripts(): void {
  document.querySelectorAll<HTMLScriptElement>(`script[src="${sdkScriptUrl}"]`).forEach((script) => script.remove());
}

function clearMercadoPagoContexts(): void {
  try {
    const mercadoPagoClass = (window as any).MercadoPago;
    if (!mercadoPagoClass) {
      return;
    }

    // Tentar destruir contextos de múltiplas formas
    const contextNames = [
      "expirationFields",
      "formMap", 
      "securityCodeFields",
      "cardNumberFields",
      "cardholderNameFields",
      "cardExpirationDateFields"
    ];

    // Método 1: destroyContexts
    if (typeof mercadoPagoClass.destroyContexts === "function") {
      try {
        mercadoPagoClass.destroyContexts();
        console.log("Mercado Pago: internal SDK contexts destruídos via destroyContexts");
      } catch (e) {
        console.warn("Mercado Pago: destroyContexts falhou", e);
      }
    }

    // Método 2: deleteContext individual
    for (const contextName of contextNames) {
      if (typeof mercadoPagoClass.deleteContext === "function") {
        try {
          mercadoPagoClass.deleteContext(contextName);
        } catch (e) {
          // Ignorar erros de contextos que não existem
        }
      }
    }

    // Método 3: tentar limpar via propriedades internas
    if (mercadoPagoClass._contexts) {
      try { mercadoPagoClass._contexts = {}; } catch {}
    }
    if (mercadoPagoClass.contexts) {
      try { mercadoPagoClass.contexts = {}; } catch {}
    }

    // Explorar prototype e outras propriedades que podem armazenar contexts
    try {
      const places = [mercadoPagoClass, mercadoPagoClass.prototype].filter(Boolean);
      for (const place of places) {
        try {
          const keys = Object.keys(place || {});
          for (const key of keys) {
            const kl = key.toLowerCase();
            if (kl.includes("context") || kl.includes("_contexts") || kl.includes("contexts")) {
              try { place[key] = {}; } catch {}
            }
          }
        } catch (e) {
          // ignorar
        }
      }
    } catch (e) {
      // ignorar
    }

    console.log("Mercado Pago: contextos internos limpos");
  } catch (error) {
    console.warn("Mercado Pago: falha ao limpar contextos internos do SDK", error);
  }
}

async function loadMercadoPagoSdk(): Promise<void> {
  if (window.MercadoPago) {
    return;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${sdkScriptUrl}"]`);
  if (existingScript && window.MercadoPago) {
    return;
  }

  if (existingScript && !window.MercadoPago) {
    console.warn("Mercado Pago: script SDK encontrado mas SDK não está disponível; removendo script antigo para recarregar.");
    existingScript.remove();
  }

  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      console.log("Mercado Pago: SDK carregado");
      const script = document.querySelector<HTMLScriptElement>(`script[src="${sdkScriptUrl}"]`);
      if (script) script.dataset.loaded = "true";
      resolve();
    };

    const onError = () => reject(new Error("Failed to load Mercado Pago SDK"));

    const script = document.createElement("script");
    script.src = sdkScriptUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });
}

export async function resetMercadoPagoSdk() {
  console.warn("Mercado Pago: resetando SDK");
  mpInstance = null;
  mpInitPromise = null;
  activeCardForm = null;
  clearMercadoPagoContexts();
  removeMercadoPagoScripts();
  // limpar promises de montagem para evitar races com instâncias anteriores
  try {
    for (const k of Object.keys(mountingPromises)) {
      try { delete mountingPromises[k]; } catch {}
    }
  } catch {}
  // pequena espera para o browser processar remoção de scripts/objetos
  await new Promise((r) => setTimeout(r, 150));

  try {
    delete (window as any).MercadoPago;
    delete (window as any).MercadoPagoDebug;
    delete (window as any).__mpDebugLogs;
    delete (window as any).__lastMercadoPagoError;
  } catch {
    (window as any).MercadoPago = undefined;
  }

  try {
    Object.keys(window).forEach((key) => {
      if (/MercadoPago|mercadopago|MP|mp/i.test(key)) {
        try {
          delete (window as any)[key];
        } catch {
          // ignore
        }
      }
    });
  } catch {
    // ignore
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
      try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'init_start' }); } catch {}
      const response = await fetch("/api/config/mercadopago-public-key");
      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(`Failed to fetch Mercado Pago public key (${response.status}): ${bodyText}`);
      }

      const data = await response.json();
      const { publicKey, isConfigured, message } = data;
      
      if (!isConfigured) {
        console.error("Mercado Pago: não está configurado", message);
        try { (window as any).__lastMercadoPagoError = { stage: 'publicKey', message }; (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'not_configured', message }); } catch {}
        throw new Error(message || "Mercado Pago não está configurado. Entre em contato com o administrador.");
      }
      
      console.log("Mercado Pago: public key carregada", publicKey);

      await loadMercadoPagoSdk();
      try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'sdk_loaded' }); } catch {}
      clearMercadoPagoContexts();
      try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'contexts_cleared_before_instance' }); } catch {}

      if (!window.MercadoPago) {
        throw new Error("Mercado Pago SDK não ficou disponível após o carregamento");
      }

      mpInstance = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'instance_created' }); } catch {}
      console.log("Mercado Pago: instância criada", { mpInstance, hasCardForm: !!mpInstance?.cardForm });
      if (!mpInstance?.cardForm) {
        console.warn("Mercado Pago: cardForm não encontrado, resetando SDK e tentando novamente");
        try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'cardform_missing' }); } catch {}
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
    } catch (error: any) {
      mpInitPromise = null;
      try { (window as any).__lastMercadoPagoError = { stage: 'init', error: String(error), stack: error?.stack }; (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'init_error', error: String(error) }); } catch {}
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
    const suffix = containerId.replace(/[^a-zA-Z0-9_-]/g, "-");
    let mp = await getMercadoPago();

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
      mp = await getMercadoPago();
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
          // garantir que contextos remanescentes sejam limpos antes de criar
          try {
            clearMercadoPagoContexts();
            (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'before_cardform_try', attempt });
          } catch (e) {
            // ignore
          }

          await new Promise((resolve) => requestAnimationFrame(resolve));
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
          try {
            (window as any).__lastMercadoPagoError = {
              stage: 'createCardForm',
              message: errorMessage,
              raw: err,
              name: err?.name,
              stack: err?.stack,
            };
            (window as any).__mpDebugLogs.push({
              ts: Date.now(),
              msg: 'cardform_exception',
              errorMessage,
              name: err?.name,
              raw: err,
            });
          } catch {}
          console.error("Mercado Pago: exception while creating cardForm:", err);
          console.error("Mercado Pago: exception details:", {
            errorMessage,
            errorType: typeof err,
            errorName: err?.name,
            errorStack: err?.stack,
            errorString: getErrorMessage(err),
            rawError: err,
          });

          if (attempt === 0) {
            try {
              console.warn("Mercado Pago: erro ao criar cardForm — resetando SDK e tentando novamente", errorMessage);
              try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'cardform_retry_reset' }); } catch {}
              await resetMercadoPagoSdk();
              mp = await getMercadoPago();
            } catch (resetError) {
              console.warn("Mercado Pago: falha ao resetar SDK durante retry", resetError);
              try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'cardform_retry_reset_failed', resetError: String(resetError) }); } catch {}
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

export async function destroyCardForm(cardForm: any, containerId?: string) {
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

    // Limpar o container
    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = "";
      }
    }
    // tentar limpar quaisquer contexts internos do SDK após destruir o form
    try {
      clearMercadoPagoContexts();
      try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'after_destroy_clear_contexts' }); } catch {}
      console.log("Mercado Pago: clearMercadoPagoContexts chamado após destroyCardForm");
    } catch (e) {
      try { (window as any).__mpDebugLogs.push({ ts: Date.now(), msg: 'after_destroy_clear_failed', error: String(e) }); } catch {}
      console.warn("Mercado Pago: falha ao limpar contexts após destroyCardForm", e);
    }
  } catch (error) {
    console.warn("Mercado Pago: falha ao destruir o form de cartão", error);
  }
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}
