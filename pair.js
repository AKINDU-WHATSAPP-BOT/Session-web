import express from 'express';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import qrcode from 'qrcode';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser } from '@whiskeysockets/baileys';
import { upload } from './mega.js'; // your MEGA upload module

const router = express.Router();

function removeFile(dir) {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    } catch (e) {
        console.error('Error removing session folder:', e);
    }
}

function generateRandomId(length = 6, numberLength = 4) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

router.get('/', async (req, res) => {
    const sessionDir = './session_' + Date.now();
    await removeFile(sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    try {
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: Browsers.ubuntu("Chrome"),
        });

        let qrSent = false;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !qrSent) {
                qrSent = true;
                const qrImage = await qrcode.toDataURL(qr);
                if (!res.headersSent) {
                    res.send({
                        status: "QR_REQUIRED",
                        message: "Scan this QR to log in.",
                        qr_image: qrImage,
                    });
                }
            }

            if (connection === 'open') {
                console.log('✅ WhatsApp connection established');

                await delay(3000);
                const sessionPath = path.join(sessionDir, 'creds.json');

                // Upload session file to MEGA
                const megaUrl = await upload(fs.createReadStream(sessionPath), `${generateRandomId()}.json`);
                const sessionString = 'AKINDU-MD=' + megaUrl.replace('https://mega.nz/file/', '');

                const userJid = jidNormalizedUser(sock.user.id);

                // Send session ID
                await sock.sendMessage(userJid, { text: sessionString });

                // Confirmation message
                await sock.sendMessage(userJid, {
                    text: "*🪄 𝐐𝐔𝐄𝐄𝐍 𝐑𝐀𝐒𝐇𝐔 𝐌𝐃 𝐕2 New Update.....💐*\n\n" +
                        "*✅ SESSION SUCCESSFUL!*\n\n" +
                        "🛑 Don't share the session ID with anyone!\n\n" +
                        "📍 *WhatsApp Group:* https://chat.whatsapp.com/GGwN8bjWtCDKrm7kuNCcnd\n" +
                        "📍 *Channel:* https://whatsapp.com/channel/0029VaicB1MISTkGyQ7Bqe23\n" +
                        "📍 *Contact:* wa.me/94727319036\n\n" +
                        "> 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 QUEEN RASHU MD 🫟"
                });

                await delay(2000);
                removeFile(sessionDir);
                process.exit(0);
            } else if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                console.warn('⚠️ Connection closed.', shouldReconnect ? 'Reconnecting…' : '');
                if (shouldReconnect) {
                    await delay(5000);
                    process.exit(1); // Optional: restart process to re-init
                }
            }
        });
    } catch (err) {
        console.error("❌ Failed to initialize session:", err);
        if (!res.headersSent) {
            res.status(500).send({ error: "Session initialization failed." });
        }
    }
});

process.on("uncaughtException", err => {
    console.error("Unhandled exception:", err);
});

export default router;
