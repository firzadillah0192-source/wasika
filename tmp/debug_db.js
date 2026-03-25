const { Client } = require('pg');

async function debug() {
  const client = new Client({
    connectionString: "postgresql://postgres:gPtOaF4dltmjLQXE@db.jevexrsstoatwdiqqudj.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("=== BANIS ===");
    const banis = await client.query("SELECT id, name, owner_id, bani_code FROM banis");
    console.table(banis.rows);

    console.log("=== PERSONS ===");
    const persons = await client.query("SELECT id, name, user_id, bani_id, latitude, longitude FROM persons");
    console.table(persons.rows);

    console.log("=== PROFILES ===");
    const profiles = await client.query("SELECT id, full_name, bani_id FROM profiles");
    console.table(profiles.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

debug();
