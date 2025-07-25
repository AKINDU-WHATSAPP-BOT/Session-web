import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import code from './pair.js'; // Your WhatsApp pairing handler

// Environment setup
const app = express();
const PORT = process.env.PORT || 8000;

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Increase event emitter listener limit to prevent memory warnings
import('events').then(events => {
    events.EventEmitter.defaultMaxListeners = 500;
});

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/code', code);

app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🛡️ 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 𝐐𝐔𝐄𝐄𝐍 𝐑𝐀𝐒𝐇𝐔 𝐌𝐃 🫟`);
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
});

export default app;
