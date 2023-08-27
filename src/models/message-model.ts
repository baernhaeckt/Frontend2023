export interface MessageModel {
    messageId: number,
    text: string;
    source: string;
    audio?: Uint8Array;
    emotions?: { name: string, emojiHtml: string }[];
    timestamp: string;
    isError?: boolean;
}