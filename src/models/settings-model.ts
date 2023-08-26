export interface SettingsModel {
    avatar: string;
    avatarConfiguration: { [key: string]: string };
    avatarConfigurationFinished: boolean;
    conversationId: string;
}