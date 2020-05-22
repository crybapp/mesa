"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const message_1 = __importDefault(require("./message"));
const getters_util_1 = require("../utils/getters.util");
const id_util_1 = require("../utils/id.util");
class Client extends events_1.EventEmitter {
    constructor(socket, server, additional) {
        super();
        this.serverId = id_util_1.generateId();
        this.authenticated = false;
        this.messages = { sent: [], recieved: [] };
        this.heartbeatCount = 0;
        this.heartbeatAttempts = 0;
        this.heartbeatBuffer = [];
        this.socket = socket;
        this.server = server;
        if (additional && additional.req)
            this.request = additional.req;
        this.setup();
    }
    send(message, sendDirectly = false) {
        if (message.opcode === 5) {
            switch (message.type) {
                case 'DISCONNECT_CLIENT':
                    this.disconnect(1000);
            }
            return;
        }
        // if (!this.server.redis && !this.id && message.opcode === 0)
        // 	console.warn(
        // 		'Mesa pub/sub only works when users are identified using the client.authenticate API.\
        // 		Please use this API in order to enable pub/sub'
        // 	)
        if (this.server.serverOptions.storeMessages)
            this.messages.sent.push(message);
        if (sendDirectly)
            return this.socket.send(message.serialize(false, { sentByServer: true }));
        this.server.send(message, [this.id]);
    }
    authenticate(callback) {
        this.authenticationCheck = callback;
    }
    updateUser(update) {
        if (!this.authenticated)
            throw new Error('This user hasn\'t been authenticated yet');
        this.registerAuthentication(null, update);
    }
    disconnect(code) {
        this.socket.close(code);
    }
    parseAuthenticationConfig(_config) {
        const config = Object.assign({}, _config);
        if (typeof config.shouldSync === 'undefined')
            config.shouldSync = true;
        if (config.token)
            delete config.token;
        return config;
    }
    setup() {
        const { socket } = this;
        if (this.server.heartbeatConfig.enabled) {
            this.heartbeatMaxAttempts = this.server.heartbeatConfig.maxAttempts || 3;
            this.heartbeatInterval = setInterval(() => this.heartbeat(), this.server.heartbeatConfig.interval);
        }
        socket.on('message', data => this.registerMessage(data));
        socket.on('close', (code, reason) => this.registerDisconnection(code, reason));
    }
    heartbeat() {
        if (this.heartbeatBuffer.length > 0 || this.heartbeatCount === 0) {
            this.heartbeatBuffer = [];
            this.heartbeatAttempts = 0;
            this.send(new message_1.default(1, {}));
        }
        else {
            this.heartbeatAttempts += 1;
            if (this.heartbeatAttempts > this.heartbeatMaxAttempts)
                return this.disconnect();
            this.send(new message_1.default(1, { tries: this.heartbeatAttempts, max: this.heartbeatMaxAttempts }));
        }
        this.heartbeatCount += 1;
    }
    registerMessage(data) {
        let json;
        try {
            json = JSON.parse(data.toString());
        }
        catch (error) {
            throw error;
        }
        const { op, d, t } = json, message = new message_1.default(op, d, t);
        if (op === 0 && (this.server.clientConfig.enforceEqualVersions))
            switch (t) {
                case 'CLIENT_VERSION':
                    const { v } = d;
                    if (v !== getters_util_1.getVersion() && this.server.clientConfig.enforceEqualVersions)
                        return this.disconnect(1002);
            }
        else if (op === 2 && this.authenticationCheck) {
            this.clientConfig = this.parseAuthenticationConfig(d);
            return this.authenticationCheck(d, (error, result) => this.registerAuthentication(error, result));
        }
        else if (op === 11)
            return this.heartbeatBuffer.push(message);
        this.emit('message', message);
        this.server.emit('message', message);
        this.server.sendPortalableMessage(message, this);
        if (this.server.serverOptions.storeMessages)
            this.messages.recieved.push(message);
    }
    registerAuthentication(error, result) {
        if (error && this.server.authenticationConfig.disconnectOnFail)
            return this.disconnect(1008);
        const { id, user } = result;
        if (typeof id === 'undefined')
            throw new Error('No user id supplied in result callback');
        else if (typeof user === 'undefined')
            throw new Error('No user object supplied in result callback');
        this.id = id;
        this.user = user;
        if (this.server.redis) {
            if (this.server.syncConfig.enabled)
                if (this.clientConfig.shouldSync)
                    this.redeliverUndeliverableMessages();
                else
                    this.clearUndeliveredMessages();
            if (this.server.authenticationConfig.storeConnectedUsers)
                this.server.redis.sadd(this.clientNamespace('connected_clients'), id);
        }
        if (!this.authenticated)
            this.send(new message_1.default(22, this.server.authenticationConfig.sendUserObject ? user : {}));
        this.authenticated = true;
        this.server.registerAuthentication(this);
    }
    registerDisconnection(code, reason) {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        if (this.id && this.server.authenticationConfig.storeConnectedUsers && this.server.redis)
            this.server.redis.srem(this.clientNamespace('connected_clients'), this.id);
        this.emit('disconnect', code, reason);
        this.server.emit('disconnection', code, reason);
        this.server.registerDisconnection(this);
    }
    async redeliverUndeliverableMessages() {
        const namespace = this.clientNamespace('undelivered_messages'), _undeliveredMessages = await this.server.redis.hget(namespace, this.id), messageRedeliveryInterval = this.server.syncConfig.redeliveryInterval;
        let undeliveredMessages = [];
        if (_undeliveredMessages)
            try {
                undeliveredMessages = JSON.parse(_undeliveredMessages);
            }
            catch (error) {
                console.error(error);
            }
        const messages = undeliveredMessages.map(message => new message_1.default(message.op, message.d, message.t)).map((message, sequence) => {
            message.sequence = sequence + 1;
            return message;
        });
        let interval, messageIndex = 0;
        interval = setInterval(() => {
            const message = messages[messageIndex];
            if (!message)
                return clearInterval(interval);
            this.send(message, true);
            messageIndex += 1;
        }, messageRedeliveryInterval || 0);
        this.clearUndeliveredMessages();
    }
    async clearUndeliveredMessages() {
        const namespace = this.clientNamespace('undelivered_messages');
        this.server.redis.hdel(namespace, this.id);
    }
    clientNamespace(prefix) {
        return this.server.namespace ? `${prefix}_${this.server.namespace}` : prefix;
    }
}
exports.default = Client;
