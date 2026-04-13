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
const tokenArgIndex = args.indexOf('--token');
const AUTH_TOKEN = tokenArgIndex !== -1 ? args[tokenArgIndex + 1] : '';
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

    let agents = [];
    const fetchAgents = async () => {
        try {
            const agentsRes = await axios.get(`${API_BASE}/agents/`, {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            });
            agents = agentsRes.data;
            console.log(`Loaded ${agents.length} agents.`);
        } catch (err) {
            console.error('Error fetching agents:', err.message);
        }
    };

    setInterval(async () => {
        console.log('Periodic agents refetch...');
        await fetchAgents();
    }, 5 * 60 * 1000);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('QR code generated.');
            try {
                const qrDataUrl = await QRCode.toDataURL(qr);
                await axios.post(`${API_BASE}/whatsapp-config/update_qr/`,
                    { user_id: USER_ID, qr_code: qrDataUrl },
                    { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
                );
            } catch (err) {
                console.error('Error updating QR:', err.message);
            }
        }
        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reason:', statusCode, 'Reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Logged out. Clearing session.');
                if (fs.existsSync(AUTH_DIR)) {
                    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                }
                await axios.post(`${API_BASE}/whatsapp-config/set_disconnected/`,
                    { user_id: USER_ID },
                    { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
                ).catch(err => console.error('Error setting disconnected:', err.message));
                // Restart to allow new login
                setTimeout(connectToWhatsApp, 2000);
            }
        } else if (connection === 'open') {
            console.log('Connection opened successfully!');
            const phone = sock.user.id.split(':')[0];
            await axios.post(`${API_BASE}/whatsapp-config/set_connected/`,
                { user_id: USER_ID, is_connected: true, phone_number: phone },
                { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
            ).catch(err => console.error('Error setting connected:', err.message));
            await fetchAgents();
        }
    });

    sock.ev.on('messaging-history.set', async ({ messages, chats, contacts, isLatest }) => {
        console.log(`Received history: ${messages.length} messages, ${chats.length} chats`);
        const recentMessages = messages.slice(-50);
        for (const msg of recentMessages) {
            const from = msg.key.remoteJid;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            if (text && !msg.key.fromMe) {
                try {
                    await axios.post(`${API_BASE}/whatsapp-config/whatsapp_gateway/`, {
                        user_id: USER_ID,
                        message: text,
                        message_id: msg.key.id,
                        sender: from
                    }, {
                        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
                    });
                } catch (err) {
                    console.error('Error in history gateway:', err.message);
                }
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            const now = Math.floor(Date.now() / 1000);
            for (const msg of m.messages) {
                const msgTime = msg.messageTimestamp;
                const is_historical = (now - msgTime > 30 * 60);

                if (!msg.key.fromMe && msg.message) {
                    const from = msg.key.remoteJid;
                    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

                    if (text) {
                        try {
                            await axios.post(`${API_BASE}/whatsapp-config/whatsapp_gateway/`, {
                                user_id: USER_ID,
                                message: text,
                                message_id: msg.key.id,
                                sender: from,
                                is_historical: is_historical
                            }, {
                                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
                            });
                        } catch (err) {
                            console.error('Error in whatsapp_gateway:', err.message);
                        }
                    }
                }
            }
        }
    });

    // Initial fetch
    await fetchAgents();

    const app = express();
    app.use(express.json());

    app.post('/send_message', async (req, res) => {
        try {
            const { to, text } = req.body;
            await sock.sendMessage(to, { text });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    const getPort = (uid) => {
        if (uid === 'global') return 3001;
        let sum = 0;
        for (let i = 0; i < uid.length; i++) sum += uid.charCodeAt(i);
        return 3001 + (sum % 100);
    };

    const port = getPort(USER_ID);
    app.listen(port, () => console.log(`WhatsApp service for user ${USER_ID} listening on port ${port}`));

    return sock;
}

connectToWhatsApp();
