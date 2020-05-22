import { IMessage } from '../server/message';
export interface IPortalUpdate {
    id: string;
    ready: boolean;
}
export interface IPortalConfig {
    namespace?: string;
}
declare type PortalInternalSocketType = 'connection' | 'disconnection';
export interface IPortalInternalSocketUpdate {
    id?: string;
    type: PortalInternalSocketType;
}
declare type PortalInternalMessageType = PortalInternalSocketType | 'message';
export interface IPortalInternalMessage {
    type: PortalInternalMessageType;
    update?: IPortalInternalSocketUpdate;
    message?: IMessage;
}
export {};
