export interface MessageModel {
    messageId: number,
    text: string;
    source: string;
    audio?: Uint8Array;
    timestamp: Date;
}