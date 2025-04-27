import crypto from 'crypto';
import { promisify } from 'util';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUser() {
  // Create a connection to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Hash the password
    const hashedPassword = await hashPassword('password123');
    
    // Delete testuser if it exists
    await pool.query(`DELETE FROM users WHERE username = 'testuser'`);
    
    // Insert the new user
    const result = await pool.query(
      `INSERT INTO users (username, password, email) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email`,
      ['testuser', hashedPassword, 'test@example.com']
    );
    
    console.log('Created test user:', result.rows[0]);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();