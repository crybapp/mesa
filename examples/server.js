const axios = require('axios').default

const { default: Mesa, Message } = require('../dist')

const mesa = new Mesa({
    port: 4000,
    namespace: 'example',
    
    redis: 'redis://localhost:6379'
})

mesa.on('connection', client => {
    console.log('A client connected')
    
 //    client.authenticate(async ({ token }, done) => {
 //        try {
 //            const { data: user } = await axios.post('http://localhost:4500', { token }),
 //                    { info: { id } } = user

 //            done(null, { id, user })
 //        } catch(error) {
 //            done(error)
 //        }
	// })

    client.on('message', message => {
		const { data, type } = message
		
		// switch (type) {
		// 	case 'PING':
		// 		client.send(new Message(0, {}, 'PONG'))
		// }

        console.log('Recieved', data, type, 'from', client.id || 'client')
    })

    client.on('disconnect', ({ code, reason }) => {
        console.log(`Client${client.id ? ` (${client.id})` : ' '}disconnected with`, code, reason ? ('with reason', reason) : '')
    })
})