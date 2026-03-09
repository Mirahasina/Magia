export interface Agent {
    name: string;
    role: string;
    category: string;
    status: "active" | "paused" | "draft";
    stats: {
        conversations: string;
        resolution: string;
        responseTime: string;
        leads: string;
    };
    channels: readonly ("website" | "email" | "whatsapp")[];
    avatarColor: string;
}
