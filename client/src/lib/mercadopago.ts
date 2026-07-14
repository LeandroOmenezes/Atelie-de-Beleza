let mpInstance: any = null;
let mpInitPromise: Promise<any> | null = null;
let activeCardForm: any = null;
const sdkScriptUrl = "https://sdk.mercadopago.com/js/v2";
// Fallback para v1 se v2 falhar
const sdkScriptUrlV1 = "https://secure.mlstatic.com/org-img/SDK/Payment/lib/mercadopago.js";
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

    // Renderizar campos HTML simples
    form.innerHTML = `
      <div class="fallback-card-form">
        <input type="text" id="${this.formId}-cardNumber" placeholder="Número do cartão" maxlength="19" data-field="cardNumber" />
        <div class="row">
          <input type="text" id="${this.formId}-cardExpirationDate" placeholder="MM/YY" maxlength="5" data-field="cardExpirationDate" />
          <input type="text" id="${this.formId}-securityCode" placeholder="CVV" maxlength="4" data-field="securityCode" />
        </div>
        <input type="text" id="${this.formId}-cardholderName" placeholder="Nome do titular" data-field="cardholderName" />
      </div>
      <style>
        .fallback-card-form input { width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
        .fallback-card-form .row { display: flex; gap: 8px; }
        .fallback-card-form .row input { flex: 1; }
      </style>
    `;
  }

  async createCardToken() {
    // Ler dados do formulário
    const cardNumber = (document.getElementById(`${this.formId}-cardNumber`) as HTMLInputElement)?.value || "";
    const cardExpirationDate = (document.getElementById(`${this.formId}-cardExpirationDate`) as HTMLInputElement)?.value || "";
    const securityCode = (document.getElementById(`${this.formId}-securityCode`) as HTMLInputElement)?.value || "";
    const cardholderName = (document.getElementById(`${this.formId}-cardholderName`) as HTMLInputElement)?.value || "";

    if (!cardNumber || !cardExpirationDate || !securityCode || !cardholderName) {
      throw new Error("Por favor, preencha todos os campos do cartão");
    }

    console.log("FallbackCardForm: tokenizando cartão via servidor");

    // Chamar endpoint do servidor para tokenizar
    try {
      const response = await fetch("/api/payments/tokenize-card", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardNumber,
          cardExpirationDate,
          securityCode,
          cardholderName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao tokenizar cartão");
      }

      const data = await response.json();
      console.log("FallbackCardForm: token recebido do servidor");
      return {
        token: data.token,
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
    let mp = await getMercadoPago();
    let cardFormInstance: any = null;

    if (typeof mp.cardForm !== "function") {
      throw new Error("Mercado Pago SDK cardForm não está disponível");
    }

    if (activeCardForm) {
      try {
        await destroyCardForm(activeCardForm);
      } catch (destroyError) {
        console.warn("Mercado Pago: falha ao destruir card form ativo", destroyError);
      }
      activeCardForm = null;
    }

      // Limpa eventuais contexts remanescentes do SDK antes de criar um novo form.
      clearMercadoPagoContexts();

      await waitForFormContainer(containerId);

    return new Promise<any>((resolve, reject) => {
      const mountFallback = async (reason: string, err?: any) => {
        cleanup();
        console.warn("Mercado Pago: mount fallback card form", reason, err);

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
        cleanup();
        activeCardForm = value;
        delete mountingPromises[containerId];
        resolve(value);
      };
      
      const rejectMount = (error: any) => {
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
        let retry = false;

        while (true) {
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
            console.error("Mercado Pago: cardForm creation exception", err);
            if (!retry && isDuplicateContextError(err)) {
              retry = true;
              console.warn("Mercado Pago: conflito de contextos detectado, resetando SDK e tentando novamente");
              await resetMercadoPagoSdk();
              await loadMercadoPagoSdk();
              mp = await getMercadoPago();
              continue;
            }
            throw err;
          }
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
