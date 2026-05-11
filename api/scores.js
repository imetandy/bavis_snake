import fs from 'fs';
import path from 'path';
import os from 'os';

const buildScoresFile = path.join(process.cwd(), 'api', 'scores-data.json');
const runtimeScoresFile = path.join(os.tmpdir(), 'scores-data.json');

function ensureScoresFile() {
    if (!fs.existsSync(runtimeScoresFile)) {
        if (fs.existsSync(buildScoresFile)) {
            try {
                fs.copyFileSync(buildScoresFile, runtimeScoresFile);
            } catch (e) {
                console.error('Could not copy build score file to runtime tmp:', e);
            }
        } else {
            try {
                fs.writeFileSync(runtimeScoresFile, '[]');
            } catch (e) {
                console.error('Could not create runtime score file:', e);
            }
        }
    }
    return runtimeScoresFile;
}

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // GET - fetch top scores
        if (req.method === 'GET') {
            const currentFile = ensureScoresFile();
            let scores = [];
            try {
                const data = fs.readFileSync(currentFile, 'utf8');
                scores = JSON.parse(data || '[]');
            } catch (e) {
                scores = [];
            }
            
            return res.status(200).json(
                scores.sort((a, b) => b.score - a.score).slice(0, 10)
            );
        }

        // POST - add new score
        if (req.method === 'POST') {
            const { name, score } = req.body;

            if (!name || typeof score !== 'number') {
                return res.status(400).json({ error: 'Invalid name or score' });
            }

            const currentFile = ensureScoresFile();
            let scores = [];
            try {
                const data = fs.readFileSync(currentFile, 'utf8');
                scores = JSON.parse(data || '[]');
            } catch (e) {
                scores = [];
            }

            scores.push({
                name: name.substring(0, 20).trim(),
                score: Math.max(0, Math.floor(score)),
                date: new Date().toISOString()
            });

            // Keep only top 100
            scores = scores.sort((a, b) => b.score - a.score).slice(0, 100);

            try {
                fs.writeFileSync(runtimeScoresFile, JSON.stringify(scores, null, 2));
            } catch (e) {
                console.error('Could not write scores file:', e);
                return res.status(500).json({ error: 'Could not save score' });
            }

            return res.status(200).json({ 
                success: true, 
                scores: scores.slice(0, 10)
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}
