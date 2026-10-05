// Isi database dengan akun DEMO (sama dengan mode tanpa backend). Jangan dijalankan di produksi.
//   npm run seed            → buat akun yang belum ada
//   npm run seed -- --reset → hapus database lalu isi ulang
import fs from "node:fs";
import { config } from "../src/config.js";
import { openDb } from "../src/db.js";
import { hashPassword } from "../src/security.js";
import { seedAccounts, DEMO_PASSWORD } from "../../frontend/src/data/partnerMock.js";

if (config.production && !process.env.ALLOW_SEED) {
  console.error("Menolak seed di NODE_ENV=production (set ALLOW_SEED=1 bila memang sengaja).");
  process.exit(1);
}
if (process.argv.includes("--reset")) for (const s of ["", "-wal", "-shm"]) fs.rmSync(config.dbPath + s, { force: true });

const db = openDb(config.dbPath);
const hash = await hashPassword(DEMO_PASSWORD);
let made = 0;
for (const a of Object.values(seedAccounts())) {
  if (db.prepare("SELECT 1 FROM accounts WHERE email=?").get(a.email)) continue;
  const { id, name, email, phone, createdAt, password, frames = [], ...doc } = a;
  doc.notifRead = [];
  db.transaction(() => {
    db.prepare("INSERT INTO accounts(id,email,name,phone,password_hash,doc,created_at) VALUES(?,?,?,?,?,?,?)").run(id, email, name, phone || "", hash, JSON.stringify(doc), createdAt);
    for (const f of frames) {
      const { id: fid, published, media, ...data } = f;
      db.prepare("INSERT INTO frames(id,account_id,data,published,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(fid, id, JSON.stringify(data), published === false ? 0 : 1, createdAt, createdAt);
    }
  })();
  made++;
}
console.log(`Seed selesai: ${made} akun baru. Password demo: ${DEMO_PASSWORD}`);
db.close();
