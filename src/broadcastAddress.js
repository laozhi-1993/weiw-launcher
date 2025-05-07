const net = require('net');
const dgram = require('dgram');


module.exports = function (motd, host, port)
{
	let isClose;
	let intervalId;
	let client;
	
	// 创建本地服务器
	const server = net.createServer((localSocket) => {
		const remoteSocket = net.createConnection({
			'host': host,
			'port': port
		}, () => {
			localSocket.pipe(remoteSocket);
			remoteSocket.pipe(localSocket);
		});

		// 错误处理
		localSocket.on('error', () => remoteSocket.end());
		localSocket.on('close', () => remoteSocket.end());

		remoteSocket.on('error', () => localSocket.end());
		remoteSocket.on('close', () => localSocket.end());
	}).once('error', () => {});



	// 启动本地服务器
	server.listen(0, () => {
		// 启用广播
		client = dgram.createSocket('udp4');
		client.bind(() => {
			client.setBroadcast(true);
		});

		// 构造Minecraft广播数据包
		const address = server.address();
		const message = Buffer.from(`[MOTD]${motd}[/MOTD][AD]${address.port}[/AD]`);

		// 每隔0.5秒发送一次广播
		intervalId = setInterval(() => client.send(message, 4445, '127.0.0.1'), 500);
	});

	return function()
	{
		if (isClose) {
			return;
		}

		clearInterval(intervalId);
		client.close();
		server.close();

		isClose = true;
	}
}