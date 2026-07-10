import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const updates = [
      { id: 1, name: 'Corte Masculino', description: 'Cortes modernos e estilosos para realçar seu visual', min_price: 40, max_price: 40 },
      { id: 2, name: 'Barba', description: 'Ajuste e acabamento de barba com design personalizado', min_price: 20, max_price: 30 },
      { id: 3, name: 'Corte + Barba', description: 'Combo corte e barba para um visual completo', min_price: 60, max_price: 70 },
    ];

    for (const u of updates) {
      const res = await client.query(
        `UPDATE services SET name=$1, description=$2, min_price=$3, max_price=$4 WHERE id=$5 RETURNING id, name, description, min_price, max_price`,
        [u.name, u.description, u.min_price, u.max_price, u.id]
      );
      if (res.rowCount > 0) {
        console.log('Updated service', res.rows[0]);
      } else {
        console.log('Service id=' + u.id + ' not found, skipped');
      }
    }
  } catch (e) {
    console.error('Error updating services', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
