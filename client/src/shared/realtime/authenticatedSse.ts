export type SseFrame = {
    event: string;
    data: unknown;
};

export type RealtimeAbortReason =
    | "logout"
    | "token-change"
    | "unmount"
    | "replacement"
    | "disconnect"
    | "dispose";

export interface AuthenticatedRealtimeClientOptions {
    url: string;
    getToken: () => string | null;
    onEvent?: (event: string, data: unknown) => void;
    onConnected?: (data: unknown) => void;
    onError?: (error: unknown) => void;
    onAbort?: (reason: RealtimeAbortReason) => void;
    shouldReconnect?: boolean;
    backoffMs?: number;
    maxBackoffMs?: number;
    connectionName?: string;
}

const safeJsonParse = (value: string): unknown => {
    if (!value) return value;

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

const parseSseFrame = (frame: string): SseFrame | null => {
    if (!frame.trim()) return null;

    const lines = frame.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let eventName = "";
    const dataLines: string[] = [];

    for (const line of lines) {
        if (!line || line.startsWith(":")) continue;

        if (line.startsWith("event:")) {
            eventName = line.slice("event:".length).trim();
            continue;
        }

        if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trim());
        }
    }

    const rawData = dataLines.join("\n");
    return {
        event: eventName || "message",
        data: rawData ? safeJsonParse(rawData) : null,
    };
};

export const parseSseChunk = (chunk: string, buffer = ""): { frames: SseFrame[]; remainder: string } => {
    const combined = `${buffer}${chunk}`;
    const trailingCarriageReturn = combined.endsWith("\r");
    const normalizedInput = trailingCarriageReturn ? combined.slice(0, -1) : combined;
    const normalized = normalizedInput.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const frames: SseFrame[] = [];
    let remainder = normalized;

    while (true) {
        const separatorIndex = remainder.indexOf("\n\n");
        if (separatorIndex === -1) break;

        const frameText = remainder.slice(0, separatorIndex);
        remainder = remainder.slice(separatorIndex + 2);

        const parsed = parseSseFrame(frameText);
        if (parsed) {
            frames.push(parsed);
        }
    }

    return {
        frames,
        remainder: `${remainder}${trailingCarriageReturn ? "\r" : ""}`,
    };
};

export const parseSseFrames = (source: string): SseFrame[] => parseSseChunk(source).frames;

export const createAuthenticatedRealtimeClient = ({
    url,
    getToken,
    onEvent,
    onConnected,
    onError,
    onAbort,
    shouldReconnect = true,
    backoffMs = 1000,
    maxBackoffMs = 15_000,
}: AuthenticatedRealtimeClientOptions) => {
    let abortReason: RealtimeAbortReason | null = null;
    let connection: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let buffer = "";
    let isStarted = false;
    let reconnectAttempt = 0;
    let disposed = false;
    let generation = 0;

    const clearReconnectTimer = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    const resetConnectionBuffer = () => {
        buffer = "";
    };

    const scheduleReconnect = () => {
        if (disposed || abortReason || !shouldReconnect) return;

        const delay = Math.min(backoffMs * 2 ** reconnectAttempt, maxBackoffMs);
        reconnectAttempt += 1;
        clearReconnectTimer();
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            void connect();
        }, delay);
    };

    const abort = (reason: RealtimeAbortReason = "disconnect") => {
        abortReason = reason;
        generation += 1;
        isStarted = false;
        clearReconnectTimer();
        resetConnectionBuffer();

        if (connection) {
            const current = connection;
            connection = null;
            current.abort();
        }

        onAbort?.(reason);
    };

    const connect = async () => {
        if (disposed || abortReason) return;

        const token = getToken();
        if (!token) return;

        const currentGeneration = generation;
        resetConnectionBuffer();
        const currentConnection = new AbortController();
        connection = currentConnection;

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "text/event-stream",
                },
                signal: currentConnection.signal,
                cache: "no-store",
            });

            if (currentGeneration !== generation) {
                currentConnection.abort();
                return;
            }

            if (response.status === 401 || response.status === 403) {
                abortReason = "logout";
                isStarted = false;
                clearReconnectTimer();
                resetConnectionBuffer();
                if (connection === currentConnection) {
                    connection = null;
                }
                currentConnection.abort();
                onError?.(new Error(`Realtime stream rejected credentials with status ${response.status}`));
                return;
            }

            if (!response.ok) {
                throw new Error(`Realtime stream failed with status ${response.status}`);
            }

            if (!response.body) {
                throw new Error("Realtime stream response did not include a body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (!disposed && !abortReason && currentGeneration === generation) {
                const result = await reader.read();
                if (result.done) {
                    throw new Error("Realtime stream closed unexpectedly");
                }

                const chunk = decoder.decode(result.value, { stream: true });
                const parsed = parseSseChunk(chunk, buffer);
                buffer = parsed.remainder;

                for (const frame of parsed.frames) {
                    if (frame.event === "connected") {
                        reconnectAttempt = 0;
                        onConnected?.(frame.data);
                    }

                    onEvent?.(frame.event, frame.data);
                }
            }
        } catch (error) {
            if (currentGeneration !== generation) {
                buffer = "";
                return;
            }

            if (currentConnection.signal.aborted && abortReason) {
                buffer = "";
                return;
            }

            if (!disposed && !abortReason) {
                buffer = "";
                onError?.(error);
                scheduleReconnect();
            }
        } finally {
            if (connection === currentConnection) {
                connection = null;
            }
        }
    };

    const start = () => {
        if (disposed || isStarted) return;
        abortReason = null;
        isStarted = true;
        reconnectAttempt = 0;
        generation += 1;
        resetConnectionBuffer();
        void connect();
    };

    const dispose = () => {
        disposed = true;
        abort("dispose");
    };

    return { start, abort, dispose };
};
