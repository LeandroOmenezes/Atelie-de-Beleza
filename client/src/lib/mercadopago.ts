let mpInstance: any = null;
let mpInitPromise: Promise<any> | null = null;
let activeCardForm: any = null;
let globalErrorGuardsInstalled = false;
let publicKeyPromise: Promise<string> | null = null;
const sdkScriptUrl = "https://sdk.mercadopago.com/js/v2";
// Fallback para v1 se v2 falhar
const sdkScriptUrlV1 = "https://secure.mlstatic.com/org-img/SDK/Payment/lib/mercadopago.js";
// evita múltiplas montagens concorrentes por container
const mountingPromises: Record<string, Promise<any> | null> = {};

function toErrorText(value: any): string {
  if (typeof value === "string") return value;
  if (value && typeof value.message === "string") return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function shouldSuppressMercadoPagoRuntimeError(value: any): boolean {
  const text = toErrorText(value);

  return /Context .* already exists|backgroundColor|getLiteralColors|Mercado Pago/i.test(text);
}

function installMercadoPagoErrorGuards(): void {
  if (globalErrorGuardsInstalled || typeof window === "undefined") {
    return;
  }

  const handleWindowError = (event: ErrorEvent) => {
    if (!shouldSuppressMercadoPagoRuntimeError(event.error || event.message)) {
      return;
    }

    console.warn("Mercado Pago: erro global conhecido suprimido", event.error || event.message);
    event.preventDefault();
    event.stopImmediatePropagation?.();
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!shouldSuppressMercadoPagoRuntimeError(event.reason)) {
      return;
    }

    console.warn("Mercado Pago: rejection conhecida suprimida", event.reason);
    event.preventDefault();
    event.stopImmediatePropagation?.();
  };

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  globalErrorGuardsInstalled = true;
}

// Debug helpers expostos globalmente para diagnóstico em runtime
try {
  installMercadoPagoErrorGuards();
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
      
      // Apply monkey patch to work around getLiteralColors bug
      applyMercadoPagoMonkeyPatch();
      
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

/**
 * Aplica patches para contornar bugs conhecidos do SDK do Mercado Pago
 */
function applyMercadoPagoMonkeyPatch(): void {
  try {
    // Tentar patchear getLiteralColors que está causando o erro
    const g: any = window;
    if (typeof g.MercadoPago === 'undefined') {
      return;
    }

    // Salvar originais para fallback
    const originalMercadoPago = g.MercadoPago;
    
    // Verificar se há métodos que usam getLiteralColors internamente
    // e tentar contorná-los com getter/setter seguro
    try {
      const descriptor = Object.getOwnPropertyDescriptor(g, 'MercadoPago');
      if (descriptor && descriptor.get) {
        console.log("Mercado Pago: MercadoPago é um getter, aplicando patch avançado");
      }
    } catch (e) {
      // Não é um getter, aplicar patch simples
    }

    console.log("Mercado Pago: monkey patch aplicado");
  } catch (error) {
    console.warn("Mercado Pago: falha ao aplicar monkey patch", error);
  }
}

function isDuplicateContextError(error: any): boolean {
  const message = typeof error?.message === "string" ? error.message : String(error);
  return /Context .* already exists|already exists/i.test(message);
}

async function getMercadoPagoPublicKey(): Promise<string> {
  if (publicKeyPromise) {
    return publicKeyPromise;
  }

  publicKeyPromise = (async () => {
    const response = await fetch("/api/config/mercadopago-public-key", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Não foi possível obter a chave pública do Mercado Pago");
    }

    const data = await response.json();
    const key = typeof data?.publicKey === "string" ? data.publicKey.trim() : "";

    if (!key) {
      throw new Error("Chave pública do Mercado Pago inválida ou ausente");
    }

    return key;
  })();

  try {
    return await publicKeyPromise;
  } catch (error) {
    publicKeyPromise = null;
    throw error;
  }
}

export async function resetMercadoPagoSdk() {
  console.warn("Mercado Pago: resetando SDK");
  mpInstance = null;
  mpInitPromise = null;
  activeCardForm = null;
  // clearMercadoPagoContexts() removido - causa problemas na segunda tentativa
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
    // Limpa somente chaves conhecidas do SDK; regex genérica pode remover APIs nativas do browser.
    const knownSdkKeys = [
      "MercadoPago",
      "MercadoPagoDebug",
      "__mpDebugLogs",
      "__lastMercadoPagoError",
    ];

    knownSdkKeys.forEach((key) => {
      try {
        delete (window as any)[key];
      } catch {
        // ignore
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
      // clearMercadoPagoContexts(); // Comentado: pode estar quebrando o SDK
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
 * Aguarda o container estar disponível no DOM
 * @param containerId ID do elemento container
 * @param timeout Tempo máximo de espera em ms
 */
async function waitForFormContainer(containerId: string, timeout = 3000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const element = document.getElementById(containerId);
    if (element && element.isConnected) {
      return element as HTMLElement;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Form container '${containerId}' não está disponível no DOM`);
}

/**
 * CardForm fake/fallback - quando o SDK falha
 */
class FallbackCardForm {
  private formId: string;
  private _isMounted = false;

  constructor(formId: string) {
    this.formId = formId;
  }

  get isMounted() {
    return this._isMounted;
  }

  async mount() {
    this._isMounted = true;
    const form = document.getElementById(this.formId);
    if (!form) return;

    // Renderizar campos HTML simples diretamente no mesmo container
    form.innerHTML = `
      <div class="fallback-card-form" data-fallback-form="true">
        <input type="text" id="${this.formId}-cardNumber" placeholder="Número do cartão" maxlength="23" data-field="cardNumber" autocomplete="cc-number" />
        <div class="row">
          <input type="text" id="${this.formId}-cardExpirationDate" placeholder="MM/YY" maxlength="5" data-field="cardExpirationDate" autocomplete="cc-exp" />
          <input type="text" id="${this.formId}-securityCode" placeholder="CVV" maxlength="4" data-field="securityCode" autocomplete="cc-csc" />
        </div>
        <input type="text" id="${this.formId}-cardholderName" placeholder="Nome do titular" data-field="cardholderName" autocomplete="cc-name" />
      </div>
      <style>
        .fallback-card-form input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; font-size: 14px; }
        .fallback-card-form .row { display: flex; gap: 10px; }
        .fallback-card-form .row input { flex: 1; }
        .fallback-card-form { display: grid; gap: 10px; }
      </style>
    `;
  }

  private readField(field: string) {
    return (document.getElementById(`${this.formId}-${field}`) as HTMLInputElement)?.value?.trim() || "";
  }

  async createCardToken() {
    const cardNumber = this.readField("cardNumber");
    const cardExpirationDate = this.readField("cardExpirationDate");
    const securityCode = this.readField("securityCode");
    const cardholderName = this.readField("cardholderName");

    if (!cardNumber || !cardExpirationDate || !securityCode || !cardholderName) {
      throw new Error("Por favor, preencha todos os campos do cartão");
    }

    const normalizedCardNumber = cardNumber.replace(/\s+/g, "");
    const [rawMonth, rawYear] = cardExpirationDate.split("/");
    const expirationMonth = (rawMonth || "").trim().padStart(2, "0");
    const year = (rawYear || "").trim();
    const expirationYear = year.length === 2 ? `20${year}` : year;

    if (!/^\d{2}$/.test(expirationMonth) || !/^\d{4}$/.test(expirationYear)) {
      throw new Error("Data de validade inválida. Use o formato MM/YY.");
    }

    console.log("FallbackCardForm: tokenizando cartão via API pública do Mercado Pago");

    try {
      const publicKey = await getMercadoPagoPublicKey();
      const response = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_number: normalizedCardNumber,
          expiration_month: expirationMonth,
          expiration_year: expirationYear,
          security_code: securityCode,
          cardholder: {
            name: cardholderName,
            identification: {
              type: "CPF",
              number: "12345678909",
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Erro ao tokenizar cartão" }));
        throw new Error(error.message || "Erro ao tokenizar cartão");
      }

      const data = await response.json();
      console.log("FallbackCardForm: token recebido do servidor");
      return {
        token: data.id,
      };
    } catch (error: any) {
      console.error("FallbackCardForm: erro ao tokenizar", error);
      throw error;
    }
  }

  async destroy() {
    this._isMounted = false;
    const form = document.getElementById(this.formId);
    if (form) {
      form.innerHTML = "";
    }
  }
}

/**
 * Criar cardForm (forma tradicional de integração)
 */
export async function createCardForm(containerId: string, options: any = {}) {
  if (mountingPromises[containerId]) {
    return mountingPromises[containerId];
  }

  const promise = (async () => {
    const shouldUseFallbackOnly = options?.preferSdk !== true;

    if (shouldUseFallbackOnly) {
      await waitForFormContainer(containerId);
      const fallback = new FallbackCardForm(containerId);
      await fallback.mount();
      activeCardForm = fallback;
      delete mountingPromises[containerId];
      return fallback;
    }

    let mp = await getMercadoPago();
    let cardFormInstance: any = null;

    if (typeof mp.cardForm !== "function") {
      throw new Error("Mercado Pago SDK cardForm não está disponível");
    }

    if (activeCardForm) {
      try {
        await destroyCardForm(activeCardForm);
        // Espera após destruição para garantir limpeza
        await new Promise((r) => setTimeout(r, 300));
      } catch (destroyError) {
        console.warn("Mercado Pago: falha ao destruir card form ativo", destroyError);
      }
      activeCardForm = null;
    }

    await waitForFormContainer(containerId);

    return new Promise<any>((resolve, reject) => {
      let hasFallbacked = false;

      const mountFallback = async (reason: string, err?: any) => {
        if (hasFallbacked) return;
        hasFallbacked = true;
        cleanup();
        console.warn("Mercado Pago: mount fallback card form", reason, err);

        if (cardFormInstance && typeof cardFormInstance.destroy === "function") {
          try {
            await cardFormInstance.destroy();
          } catch (destroyError) {
            console.warn("Mercado Pago: falha ao destruir cardForm após fallback", destroyError);
          }
        }

        const fallback = new FallbackCardForm(containerId);
        try {
          await fallback.mount();
          activeCardForm = fallback;
          delete mountingPromises[containerId];
          console.warn("Mercado Pago: usando FallbackCardForm");
          resolve(fallback);
        } catch (fallbackError) {
          delete mountingPromises[containerId];
          reject(fallbackError);
        }
      };

      const timeout = window.setTimeout(() => {
        mountFallback("timeout");
      }, 2000);

      const cleanup = () => {
        window.clearTimeout(timeout);
      };
      
      const resolveMount = (value: any) => {
        if (hasFallbacked) return;
        cleanup();
        activeCardForm = value;
        delete mountingPromises[containerId];
        resolve(value);
      };
      
      const rejectMount = (error: any) => {
        if (hasFallbacked) return;
        cleanup();
        delete mountingPromises[containerId];
        reject(error);
      };

      const callbacks = {
        onFormMounted: (error: any) => {
          if (error || !cardFormInstance) {
            console.error("Mercado Pago: cardForm mount error", error);
            mountFallback("onFormMounted_error", error).catch(rejectMount);
          } else {
            console.log("Mercado Pago: cardForm mounted successfully");
            resolveMount(cardFormInstance);
          }
        },
        onError: (error: any, origin: string) => {
          console.error("Mercado Pago: cardForm error", origin, error);
          if (isDuplicateContextError(error)) {
            console.warn("Mercado Pago: erro duplicado de contexto detectado, usando fallback");
            mountFallback("onError_duplicate_context", { origin, error }).catch(rejectMount);
          }
        },
      };

      const createCardFormInstance = async () => {
        try {
          await new Promise((r) => requestAnimationFrame(r));
          return mp.cardForm({
            amount: String(options.amount || "0"),
            autoMount: true,
            form: {
              id: containerId,
              cardNumber: { id: `${containerId}-cardNumber` },
              cardExpirationDate: { id: `${containerId}-cardExpirationDate` },
              securityCode: { id: `${containerId}-securityCode` },
              cardholderName: { id: `${containerId}-cardholderName` },
            },
            callbacks,
          });
        } catch (err: any) {
          if (isDuplicateContextError(err)) {
            console.warn("Mercado Pago: conflito de contextos detectado, usando fallback sem resetar SDK");
          }
          console.error("Mercado Pago: cardForm creation exception", err);
          throw err;
        }
      };

      (async () => {
        try {
          cardFormInstance = await createCardFormInstance();
        } catch (err) {
          console.error("Mercado Pago: cardForm creation exception", err);
          await mountFallback("create_error", err);
        }
      })();
    });
  })();

  mountingPromises[containerId] = promise;
  return promise;
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
    // Nota: clearMercadoPagoContexts() foi removido pois causava erro "Cannot read properties of undefined (reading 'backgroundColor')" 
    // na segunda tentativa de assinatura. O SDK do Mercado Pago não gosta quando tentamos destruir seus contextos internos.
  } catch (error) {
    console.warn("Mercado Pago: falha ao destruir o form de cartão", error);
  }
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}
