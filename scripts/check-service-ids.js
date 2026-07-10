import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    const plansRes = await client.query('SELECT id, name, included_service_ids FROM subscription_plans ORDER BY id');
    const plans = plansRes.rows;

    for (const plan of plans) {
      const raw = plan.included_service_ids;
      let ids = [];
      if (!raw) {
        ids = [];
      } else if (Array.isArray(raw)) {
        ids = raw;
      } else if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
          ids = [];
        } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try { ids = JSON.parse(trimmed); } catch(e) { ids = []; }
        } else if (trimmed.includes(',')) {
          ids = trimmed.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
        } else {
          const n = Number(trimmed);
          ids = Number.isNaN(n) ? [] : [n];
        }
      }

      const missing = [];
      for (const id of ids) {
        const r = await client.query('SELECT id FROM services WHERE id = $1', [id]);
        if (r.rowCount === 0) missing.push(id);
      }

      if (ids.length === 0) {
        console.log(`Plan ${plan.id} (${plan.name}): no included services`);
      } else if (missing.length === 0) {
        console.log(`Plan ${plan.id} (${plan.name}): all service IDs exist: [${ids.join(', ')}]`);
      } else {
        console.log(`Plan ${plan.id} (${plan.name}): missing service IDs: [${missing.join(', ')}] (present: [${ids.filter(i => !missing.includes(i)).join(', ')}])`);
      }
    }
  } catch (e) {
    console.error('Error', e);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
