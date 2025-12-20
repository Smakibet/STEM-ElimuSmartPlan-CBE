class WSService {
    private socket: WebSocket | null = null;
    private listeners: ((msg: any) => void)[] = [];

    connect(sessionId: string) {
        this.socket = new WebSocket(
            `${import.meta.env.VITE_WS_URL}/appraisal/${sessionId}`
        );

        this.socket.onmessage = e => {
            const data = JSON.parse(e.data);
            this.listeners.forEach(cb => cb(data));
        };
    }

    subscribe(cb: (msg: any) => void) {
        this.listeners.push(cb);
    }

    disconnect() {
        this.socket?.close();
        this.socket = null;
        this.listeners = [];
    }
}

export const wsService = new WSService();
