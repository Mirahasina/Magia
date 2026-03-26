const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const express = require('express');

const API_BASE = 'http://localhost:8000/api';
const logger = pino({ level: 'info' });

const args = process.argv.slice(2);
const userArgIndex = args.indexOf('--user');
const USER_ID = userArgIndex !== -1 ? args[userArgIndex + 1] : 'global';
const AUTH_DIR = path.join(__dirname, '..', `auth_info_${USER_ID}`);

if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}
const app = express();
app.use(express.json());

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ['MAGIA', 'Safari', '14.0.0'],
        getMessage: async () => {
            return { conversation: 'hello' };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                const qrDataURL = await QRCode.toDataURL(qr);
                await axios.post(`${API_BASE}/whatsapp-config/update_status/`, {
                    qr_code: qrDataURL,
                    is_connected: false,
                    user_id: USER_ID
                });
            } catch (err) {
                console.error(err.message);
            }
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            if (statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
                if (fs.existsSync(AUTH_DIR)) {
                    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                }
                setTimeout(connectToWhatsApp, 2000);
            } else if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                try {
                    await axios.post(`${API_BASE}/whatsapp-config/update_status/`, {
                        is_connected: false,
                        qr_code: null,
                        user_id: USER_ID
                    });
                } catch (err) {
                    console.error(err.message);
                }
            }
        } else if (connection === 'open') {
            const user = sock.user.id.split(':')[0];
            try {
                await axios.post(`${API_BASE}/whatsapp-config/update_status/`, {
                    is_connected: true,
                    qr_code: null,
                    phone_number: user,
                    user_id: USER_ID
                });
            } catch (err) {
                console.error(err.message);
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            const now = Math.floor(Date.now() / 1000);
            for (const msg of m.messages) {
                const msgTime = msg.messageTimestamp;

                if (now - msgTime > 30 * 60) {
                    continue;
                }

                if (!msg.key.fromMe && msg.message) {
                    const from = msg.key.remoteJid;
                    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

                    if (text) {
                        try {
                            const agentsRes = await axios.get(`${API_BASE}/agents/`);
                            const agents = agentsRes.data.filter(a => a.channels.includes('WhatsApp'));

                            for (const agent of agents) {
                                const response = await axios.post(`${API_BASE}/agents/${agent.id}/whatsapp_process/`, {
                                    message: text,
                                    message_id: msg.key.id,
                                    sender: from
                                });

                                if (response.data.status === 'responded') {
                                    await sock.sendMessage(from, { text: response.data.response });
                                    await sock.readMessages([msg.key]);
                                    break;
                                }
                            }
                        } catch (err) {
                            console.error(err.message);
                        }
                    }
                }
            }
        }
    });

    app.post('/send_message', async (req, res) => {
        try {
            const { to, text } = req.body;
            await sock.sendMessage(to, { text });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    const port = 3001 + (USER_ID !== 'global' ? parseInt(USER_ID) % 100 : 0);
    app.listen(port, () => console.log(`WhatsApp service for user ${USER_ID} listening on port ${port}`));
    return sock;
}

connectToWhatsApp();
