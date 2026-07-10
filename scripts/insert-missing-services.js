import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function insert() {
  const client = await pool.connect();
  try {
    const services = [
      { id: 1, name: 'Serviço 1', description: 'Serviço de exemplo 1', min_price: 10.0, max_price: 15.0, category_id: 1, icon: 'scissors' },
      { id: 2, name: 'Serviço 2', description: 'Serviço de exemplo 2', min_price: 15.0, max_price: 25.0, category_id: 1, icon: 'shampoo' },
      { id: 3, name: 'Serviço 3', description: 'Serviço de exemplo 3', min_price: 20.0, max_price: 30.0, category_id: 1, icon: 'razor' },
    ];

    for (const s of services) {
      const res = await client.query(
        `INSERT INTO services (id, name, description, min_price, max_price, category_id, icon) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [s.id, s.name, s.description, s.min_price, s.max_price, s.category_id, s.icon]
      );
      if (res.rowCount > 0) {
        console.log(`Inserted service id=${s.id}`);
      } else {
        console.log(`Service id=${s.id} already exists, skipped`);
      }
    }
  } catch (e) {
    console.error('Error inserting services', e);
  } finally {
    client.release();
    await pool.end();
  }
}

insert();
