import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  try {
    const exercisesDir = path.join(__dirname, '..', 'public', 'exercises');
    const files = fs.readdirSync(exercisesDir)
      .filter(file => /\.(gif|png|jpg|jpeg|webp)$/i.test(file));

    res.json({ exercises: files.map(f => `exercises/${f}`) });
  } catch (error) {
    res.json({ exercises: [] });
  }
}
