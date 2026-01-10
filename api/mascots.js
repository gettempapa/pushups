import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  try {
    const mascotsDir = path.join(__dirname, '..', 'public', 'mascots');
    const files = fs.readdirSync(mascotsDir)
      .filter(file => /\.(gif|png|jpg|jpeg|webp)$/i.test(file));

    res.json({ mascots: files.map(f => `mascots/${f}`) });
  } catch (error) {
    res.json({ mascots: [] });
  }
}
