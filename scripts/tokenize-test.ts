import 'dotenv/config';
import { tokenizeCardWithMercadoPago } from '../server/mercadopago';

async function run() {
  try {
    const result = await tokenizeCardWithMercadoPago({
      cardNumber: '4235647728025682',
      cardholderName: 'APRO',
      cardExpirationDate: '11/30',
      securityCode: '123',
    });
    console.log('Tokenization result:', result);
  } catch (err: any) {
    console.error('Tokenization failed:', err?.message || err);
    if (err?.response) {
      try { console.error('Response body:', await err.response.text()); } catch {}
    }
    process.exit(1);
  }
}

run();
