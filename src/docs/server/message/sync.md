# Message Sync
Mesa suports message redelivery (which we call message sync) allowing clients that have been disconnected either purposefully or unpurposefully to recieve any messages that couldn't be delivered.

To enable message sync, add the following to your config:
```js
const server = new Mesa({
  port: 4000,
  // Redis is required for message sync
  redis: 'redis://localhost:6379',

  sync: {
    enabled: true
  },
  authentication: {
    // storeConnectedUsers is also required for message sync
    storeConnectedUsers: true
  }
})
```

Now any time a message is sent to an offline client, either using `Mesa.send` or `Dispatcher.dispatch`, it'll automatically be sent as soon as they connect.

*Notes: Authentication via the `client.authenticate` API is required for message sync to work, and if you're using the Dispatcher API, make sure that `sync.enabled` is set to `true` in your Dispatcher config.*

Clients will recieve undelivered messages in this format:
```json
{ "op": 0, "d": {}, "t": "EXAMPLE_MESSAGE", "s": 3 }
```

The `s` property notates the sequence position of the message. This number is used to help clients reconstruct the order undelivered messages were supposed to be recieved in.

*Note: The sequence property begins counting at one instead of zero due to the way JavaScript handles numbers*

##### Implementing a Custom Sync Interval
If you want to implement a custom interval between message redeliveries, use the following configuration on the Mesa server:
```js
sync: {
  enabled: true,

  redeliveryInterval: 1000 // 1 second
}
```

##### Disabling Initial Sync for Clients
We also support client configuration for message sync. For example, if a client is connecting to Mesa alongside reaching out to a REST API on its initial state load, the client can opt-out of recieving missed messages using the following API:
```js
client.authenticate({ token: fetchToken() }, { shouldSync: false })
```

If you want to only use sync on reconnects, look at the following example:
```js
client.on('connection', async ({ isInitialConnection }) => {
  console.log('Connected to Mesa')

  // Only sync on connections after first connection or on reconnections
  await client.authenticate({ token: fetchToken() }, { shouldSync: !isInitialConnection })
})
```

##### Disabling Sync for Individual Messages
If you want to send a message from the server that isn't synced to clients, set `MessageOptions.sync` to `false` in your Message object options:
```js
client.send(new Message(0, { typing: true }, 'TYPING_UPDATE', { sync: false }))
```

This is useful when sending messages which can be lost with little to no repercussions for the client application state, such as typing indicator updates