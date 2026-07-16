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

const API_BASE = process.env.API_BASE || 'http://localhost:8000/api';
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

function getPort(uid) {
    if (uid === 'global') return 3001;
    let sum = 0;
    for (let i = 0; i < uid.length; i++) sum += uid.charCodeAt(i);
    return 3001 + (sum % 100);
}

/** Mutable socket shared by the single HTTP server (survives reconnects). */
let currentSock = null;
let isSocketOpen = false;
let reconnectTimer = null;
let connecting = false;

const authHeaders = () => ({ Authorization: `Bearer ${AUTH_TOKEN}` });

/** Prefer phone JID when Baileys exposes it alongside @lid. */
function resolveContactJid(msg) {
    const key = msg.key || {};
    const candidates = [
        key.remoteJidAlt,
        key.senderPn,
        msg.senderPn,
        key.participantAlt,
        key.remoteJid,
    ].filter(Boolean);

    for (const raw of candidates) {
        const s = String(raw);
        if (s.endsWith('@g.us') || s === 'status@broadcast') continue;
        if (s.includes('@s.whatsapp.net')) {
            const user = s.split('@')[0].split(':')[0];
            return `${user}@s.whatsapp.net`;
        }
        // bare phone / device id
        const digits = s.split(':')[0].replace(/\D/g, '');
        if (digits.length >= 8 && !s.includes('@lid')) {
            return `${digits}@s.whatsapp.net`;
        }
    }
    return key.remoteJid || null;
}

async function resolveSendJid(to) {
    if (!to) throw new Error('Destinataire manquant');

    let jid = String(to).trim();
    if (!jid.includes('@')) {
        const digits = jid.replace(/\D/g, '');
        if (!digits) throw new Error('Numéro WhatsApp invalide');
        jid = `${digits}@s.whatsapp.net`;
    }

    // Try LID → phone mapping when available (Baileys 7+)
    if (jid.endsWith('@lid') && currentSock?.signalRepository?.lidMapping) {
        const map = currentSock.signalRepository.lidMapping;
        try {
            let pn = null;
            if (typeof map.getPNForLID === 'function') {
                pn = await map.getPNForLID(jid);
            } else if (typeof map.lidToPn === 'function') {
                pn = await map.lidToPn(jid);
            } else if (typeof map.getPNForLID === 'function') {
                pn = map.getPNForLID(jid);
            }
            if (pn) {
                const user = String(pn).split('@')[0].split(':')[0].replace(/\D/g, '');
                if (user) {
                    const phoneJid = `${user}@s.whatsapp.net`;
                    console.log(`Resolved LID ${jid} -> ${phoneJid}`);
                    return phoneJid;
                }
            }
        } catch (err) {
            console.warn('LID resolve failed, sending to LID directly:', err.message);
        }
    }

    return jid;
}

/** Extract readable text (or a placeholder) from any WhatsApp message type. */
function extractMessageText(message) {
    if (!message) return null;
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage) return message.imageMessage.caption || '[Image]';
    if (message.videoMessage) return message.videoMessage.caption || '[Vidéo]';
    if (message.audioMessage) return message.audioMessage.ptt ? '[Note vocale]' : '[Audio]';
    if (message.documentMessage) {
        const name = message.documentMessage.fileName || message.documentMessage.title;
        return name ? `[Document: ${name}]` : '[Document]';
    }
    if (message.documentWithCaptionMessage?.message) {
        return extractMessageText(message.documentWithCaptionMessage.message);
    }
    if (message.stickerMessage) return '[Sticker]';
    if (message.contactMessage) {
        return `[Contact: ${message.contactMessage.displayName || ''}]`.trim();
    }
    if (message.contactsArrayMessage) return '[Contacts]';
    if (message.locationMessage || message.liveLocationMessage) return '[Localisation]';
    if (message.buttonsResponseMessage?.selectedDisplayText) {
        return message.buttonsResponseMessage.selectedDisplayText;
    }
    if (message.listResponseMessage?.title) return message.listResponseMessage.title;
    if (message.templateButtonReplyMessage?.selectedDisplayText) {
        return message.templateButtonReplyMessage.selectedDisplayText;
    }
    if (message.buttonsMessage?.contentText) return message.buttonsMessage.contentText;
    if (message.listMessage?.description) return message.listMessage.description;
    if (message.reactionMessage || message.protocolMessage || message.senderKeyDistributionMessage) {
        return null;
    }
    if (message.ephemeralMessage?.message) {
        return extractMessageText(message.ephemeralMessage.message);
    }
    if (message.viewOnceMessage?.message) {
        return extractMessageText(message.viewOnceMessage.message);
    }
    if (message.viewOnceMessageV2?.message) {
        return extractMessageText(message.viewOnceMessageV2.message);
    }
    return null;
}

function pushFormattedMessage(msg, bucket) {
    const from = resolveContactJid(msg);
    if (!from || from === 'status@broadcast') return;
    const text = extractMessageText(msg.message);
    if (!text) return;
    bucket.push({
        message: text,
        message_id: msg.key.id,
        sender: from,
        push_name: msg.pushName || null,
        is_me: !!msg.key.fromMe
    });
}

async function fetchAgents() {
    try {
        const agentsRes = await axios.get(`${API_BASE}/agents/`, {
            headers: authHeaders()
        });
        console.log(`Loaded ${(agentsRes.data || []).length} agents.`);
    } catch (err) {
        console.error('Error fetching agents:', err.message);
    }
}

async function connectToWhatsApp() {
    if (connecting) {
        console.log('Connect already in progress, skip.');
        return;
    }
    connecting = true;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger,
            browser: ['MAGIA', 'Safari', '14.0.0'],
            syncFullHistory: true,
            markOnlineOnConnect: false,
            getMessage: async () => ({ conversation: 'hello' }),
        });

        currentSock = sock;
        isSocketOpen = false;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log('QR code generated.');
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr);
                    await axios.post(
                        `${API_BASE}/whatsapp-config/update_qr/`,
                        { user_id: USER_ID, qr_code: qrDataUrl },
                        { headers: authHeaders() }
                    );
                } catch (err) {
                    console.error('Error updating QR:', err.message);
                }
            }
            if (connection === 'close') {
                isSocketOpen = false;
                if (currentSock === sock) currentSock = null;

                const statusCode =
                    lastDisconnect?.error instanceof Boom
                        ? lastDisconnect.error.output.statusCode
                        : 0;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed. Reason:', statusCode, 'Reconnecting:', shouldReconnect);

                if (shouldReconnect) {
                    // Only auto-reconnect if credentials still exist (active session).
                    // After disconnect/wipe, wait for the user to start a new QR scan.
                    if (!fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
                        console.log('No auth credentials - no auto-reconnect. User must scan QR.');
                        await axios
                            .post(
                                `${API_BASE}/whatsapp-config/set_disconnected/`,
                                { user_id: USER_ID },
                                { headers: authHeaders() }
                            )
                            .catch((err) => console.error('Error setting disconnected:', err.message));
                        return;
                    }
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        connectToWhatsApp();
                    }, 2000);
                } else {
                    console.log('Logged out. Clearing session - no auto QR until user reconnects.');
                    if (fs.existsSync(AUTH_DIR)) {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    }
                    await axios
                        .post(
                            `${API_BASE}/whatsapp-config/set_disconnected/`,
                            { user_id: USER_ID },
                            { headers: authHeaders() }
                        )
                        .catch((err) => console.error('Error setting disconnected:', err.message));
                    // Do NOT restart automatically
                }
            } else if (connection === 'open') {
                isSocketOpen = true;
                currentSock = sock;
                console.log('Connection opened successfully!');
                const phone = (sock.user?.id || '').split(':')[0];
                await axios
                    .post(
                        `${API_BASE}/whatsapp-config/set_connected/`,
                        { user_id: USER_ID, is_connected: true, phone_number: phone },
                        { headers: authHeaders() }
                    )
                    .catch((err) => console.error('Error setting connected:', err.message));
                await fetchAgents();
            }
        });

        sock.ev.on('messaging-history.set', async ({ messages, chats, contacts }) => {
            console.log(
                `Received history: ${messages.length} messages, ${chats.length} chats, ${contacts.length} contacts`
            );

            if (contacts && contacts.length > 0) {
                try {
                    await axios.post(
                        `${API_BASE}/whatsapp-config/sync_whatsapp_contacts/`,
                        { user_id: USER_ID, contacts },
                        { headers: authHeaders() }
                    );
                    console.log(`Synced ${contacts.length} historical contacts`);
                } catch (err) {
                    console.error('Error syncing historical contacts:', err.message);
                }
            }

            const formattedMessages = [];
            for (const msg of messages) {
                pushFormattedMessage(msg, formattedMessages);
            }

            console.log(`Sending ${formattedMessages.length} text messages to MAGIA bulk gateway...`);
            for (let i = 0; i < formattedMessages.length; i += 500) {
                const batch = formattedMessages.slice(i, i + 500);
                try {
                    await axios.post(
                        `${API_BASE}/whatsapp-config/whatsapp_gateway_bulk/`,
                        { user_id: USER_ID, messages: batch },
                        { headers: authHeaders() }
                    );
                    console.log(`Sent batch ${i / 500 + 1}`);
                } catch (err) {
                    console.error(`Error in bulk gateway batch ${i / 500 + 1}:`, err.message);
                }
            }
            console.log('Finished bulk history sync.');
        });

        sock.ev.on('contacts.upsert', async (contacts) => {
            try {
                await axios.post(
                    `${API_BASE}/whatsapp-config/sync_whatsapp_contacts/`,
                    { user_id: USER_ID, contacts },
                    { headers: authHeaders() }
                );
                console.log(`Synced ${contacts.length} upserted contacts`);
            } catch (err) {
                console.error('Error syncing upserted contacts:', err.message);
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify' || m.type === 'append') {
                const now = Math.floor(Date.now() / 1000);
                for (const msg of m.messages) {
                    const msgTime = Number(msg.messageTimestamp) || now;
                    const is_historical = m.type === 'append' || now - msgTime > 30 * 60;
                    const text = extractMessageText(msg.message);
                    const from = resolveContactJid(msg);
                    if (!text || !from || from === 'status@broadcast') continue;

                    try {
                        await axios.post(
                            `${API_BASE}/whatsapp-config/whatsapp_gateway/`,
                            {
                                user_id: USER_ID,
                                message: text,
                                message_id: msg.key.id,
                                sender: from,
                                push_name: msg.pushName || null,
                                is_historical,
                                is_me: !!msg.key.fromMe,
                            },
                            { headers: authHeaders() }
                        );
                    } catch (err) {
                        console.error('Error in whatsapp_gateway:', err.message);
                    }
                }
            }
        });
    } catch (err) {
        console.error('connectToWhatsApp failed:', err.message);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectToWhatsApp();
        }, 5000);
    } finally {
        connecting = false;
    }
}

/* ── Single HTTP server (never recreated on reconnect) ── */
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        connected: isSocketOpen && !!currentSock,
        user_id: USER_ID,
    });
});

app.post('/send_message', async (req, res) => {
    try {
        const { to, text } = req.body;
        if (!text || !String(text).trim()) {
            return res.status(400).json({ error: 'Message vide' });
        }
        if (!currentSock || !isSocketOpen) {
            return res.status(503).json({
                error:
                    'WhatsApp est déconnecté ou en reconnexion. ' +
                    'Attendez quelques secondes ou reconnectez WhatsApp dans Paramètres.',
            });
        }

        const jid = await resolveSendJid(to);
        await currentSock.sendMessage(jid, { text: String(text) });
        res.json({ success: true, to: jid });
    } catch (error) {
        const msg = error?.message || String(error);
        console.error('send_message error:', msg);
        const isClosed = /connection closed/i.test(msg);
        res.status(isClosed ? 503 : 500).json({
            error: isClosed
                ? 'Connexion WhatsApp fermée. Reconnectez WhatsApp dans Paramètres puis réessayez.'
                : msg,
        });
    }
});

const port = getPort(USER_ID);
app.listen(port, () => {
    console.log(`WhatsApp HTTP server for user ${USER_ID} listening on port ${port}`);
});

setInterval(() => {
    if (isSocketOpen) fetchAgents();
}, 5 * 60 * 1000);

connectToWhatsApp();
