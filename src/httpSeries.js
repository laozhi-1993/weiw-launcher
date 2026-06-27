const got  = require('got').default;
const fs   = require('fs');
const path = require('path');
const http = require('http');


class FileDownloads
{
	constructor(threadCount)
	{
		this.threadCount = threadCount;
		this.isStop = false;
		this.events = [];
		
		
		this.total    = 0;
		this.complete = 0;
		this.success  = 0;
		this.failure  = 0;
		
		
		this.readyToDownloadFiles = [];
		this.downloadingFiles = {};
	}
	
	
	on(eventName, callback)
	{
		if (!this.events[eventName]) {
			this.events[eventName] = [];
		}
		
		this.events[eventName].push(callback);
	}
	
	
	trigger(eventName, ...args)
	{
		if (this.events[eventName])
		{
			for (const callback of this.events[eventName])
			{
				callback(...args);
			}
		}
	}
	
	
	add(parameter)
	{
		const id = () => {
			return this.total+'_'+Date.now();
		};
		
		this.total++;
		this.readyToDownloadFiles.push({'id': id(), ...parameter});
	}
	
	
	stop()
	{
		this.isStop = true;
		
		for(const key in this.downloadingFiles)
		{
			this.downloadingFiles[key].stop();
		}
	}
	
	
	async start(speed)
	{
		const httpserver = new httpServer();
		await httpserver.run();
		
		while (true)
		{
			this.trigger('progress', this.total, this.complete);
			
			
			if (this.isStop || this.total <= this.complete)
			{
				httpserver.close();
				
				if (this.failure)
				{
					throw this.failure;
				}
				else
				{
					return this;
				}
			}
			
			
			if (this.threadCount && this.readyToDownloadFiles.length)
			{
				this.threadCount--;
				
				
				const readyToDownloadFile = this.readyToDownloadFiles.shift();
				const fileDownload = new FileDownload(httpserver.isFile(readyToDownloadFile.cachePath) ? httpserver.getUrl(readyToDownloadFile.cachePath) : readyToDownloadFile.url);
				
				fileDownload.start(speed, (...args) => this.trigger('data', readyToDownloadFile.id, ...args))
				
					.then((data) => {
						if (readyToDownloadFile.path) {
							data.saveToFile(readyToDownloadFile.path);
						}
						
						if (readyToDownloadFile.cachePath && !httpserver.isFile(readyToDownloadFile.cachePath)) {
							data.saveToFile(httpserver.getCacheDir(readyToDownloadFile.cachePath));
						}
						
						
						this.success++;
						this.trigger('success', readyToDownloadFile.id);
					})
					
					.catch((error) => {
						this.failure++;
						this.trigger('failure', readyToDownloadFile.id, error.message);
					})
					
					.finally(() => {
						this.complete++;
						this.threadCount++;
						
						delete this.downloadingFiles[readyToDownloadFile.id];
					});
				
				
				this.trigger('start', readyToDownloadFile.id, path.basename(decodeURIComponent(readyToDownloadFile.url)));
				this.downloadingFiles[readyToDownloadFile.id] = fileDownload;
			}
			
			
			await new Promise(resolve => setTimeout(resolve));
		}
	}
}

class FileDownload
{
	constructor(url) 
	{
		this.url = url;
		this.request = null;
		this.buffer = null;
		this.transferred = 0;
		this.controller = new AbortController();
	}
	
	saveToFile(savePath)
	{
		try {
			if (!fs.existsSync(path.dirname(savePath))) {
				fs.mkdirSync(path.dirname(savePath), { recursive: true });
			}
			fs.writeFileSync(savePath, this.buffer);
		} catch (error) {
			throw error;
		}
	}
	
	dataToText(encoding = 'utf-8')
	{
		try {
			return this.buffer.toString(encoding);
		} catch (error) {
			throw error;
		}
	}
	
	dataToJson(encoding = 'utf-8')
	{
		try {
			return JSON.parse(this.dataToText(encoding));
		} catch (error) {
			throw error;
		}
	}
	
	stop()
	{
		if (this.request) {
			this.controller.abort();
		}
	}
	
	start(speed, progress)
	{
		return new Promise((resolve, reject) => {
			this.request = got(this.url, {
				signal: this.controller.signal,
				responseType: 'buffer',

				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
					'Accept-Encoding': 'gzip, deflate, br',
					'Connection': 'keep-alive',
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache',
				},

				retry: {
					limit: 5
				}
			});
			
			this.request.on('downloadProgress', ({ transferred, total, percent }) => {
				if (progress) {
					progress(total, transferred);
				}
				
				if (speed) {
					speed.addBytes(transferred-this.transferred);
				}
				
				this.transferred = transferred;
			});
			
			this.request.then(response => {
				this.buffer = response.body;
				resolve(this);
			});
			
			this.request.catch(error => {
				reject(error);
			});
		});
	}
}

class Speed
{
	constructor(callback)
	{
		this.speedInterval = setInterval(() => {
			if (this.isStop)
			{
				clearInterval(this.speedInterval);
			}
			
			
			callback(this.formatBytes(this.downloadedSpeedBytes));
			this.downloadedSpeedBytes = 0;
		}, 1000);
		
		this.downloadedSpeedBytes = 0;
		this.isStop = false;
	}
	
	
	formatBytes(bytes)
	{
		if (bytes < 1024 * 1024)
		{
			return `${(bytes / 1024).toFixed(2)}KB/s`;
		}
		else
		{
			return `${(bytes / (1024 * 1024)).toFixed(2)}MB/s`;
		}
	}
	
	
	addBytes(bytes)
	{
		this.downloadedSpeedBytes += bytes;
	}
	
	stop()
	{
		this.isStop = true;
	}
}

function taskDownloads(task, downloads, title, html = 'html/task_downloads.html', threadCount = 20)
{
	let list = [];
	
	for(const value of downloads) {
		if (!list.some(item => item.path === value.path))
		{
			if(!fs.existsSync(value.path)) {
				list.push(value);
				continue;
			}
			
			if(value.time >= Math.floor(fs.statSync(value.path).mtimeMs / 1000)) {
				list.push(value);
				continue;
			}
		}
	}
	
	if (list.length !== 0)
	{
		return task.start(html, (resolve, reject) => {
			
			task.sendEvent('operation', title);
			
			const speed = new Speed((size) => task.sendEvent('speed', size));
			const fileDownloads = new FileDownloads(threadCount);
			
			
			fileDownloads.on('progress', (total, complete) => {
				task.sendEvent('progress', {'total': total, 'complete': complete});
			});
			
			fileDownloads.on('start', (id, fileName) => {
				task.sendEvent('downloadStart', {'id': id, 'fileName': fileName});
			});
			
			fileDownloads.on('data', (id, totalBytes, downloadedBytes) => {
				task.sendEvent('downloadProgress', {'id': id, 'totalBytes': totalBytes, 'downloadedBytes': downloadedBytes});
			});
			
			
			for (const value of list) {
				fileDownloads.add(value);
			}
			
			fileDownloads.start(speed)
				.then(() => resolve())
				.catch((error) => {
					if (error instanceof Error) {
						reject(error);
						return;
					}
					
					reject(`有 ${error} 个文件下载失败请重新尝试下载`);
				});
			
			return function() {
				speed.stop();
				fileDownloads.stop();
			};
		});
	}
}

function taskDownload(task, parameter, json = true)
{
	if (parameter.path && fs.existsSync(parameter.path)) {
		return;
	}
	
	return task.start('html/task_download.html', (resolve, reject) => {
		
		task.sendEvent('operation', parameter.title);
		
		
		const httpserver = new httpServer();
		const speed = new Speed((size) => task.sendEvent('speed', size));
		const fileDownload = new FileDownload(httpserver.isFile(parameter.cachePath) ? httpserver.getUrl(parameter.cachePath) : parameter.url);
		
		httpserver.run().then(() => {
			
			fileDownload.start(speed, (total, complete) => task.sendEvent('progress', {'total': total, 'complete': complete}))
				.then((data) => {
					if (parameter.path) {
						data.saveToFile(parameter.path);
						resolve();
					} else {
						resolve(json ? data.dataToJson() : data.dataToText());
					}
					
					if (parameter.cachePath && !httpserver.isFile(parameter.cachePath)) {
						data.saveToFile(httpserver.getCacheDir(parameter.cachePath));
					}
				})
				.catch((error) => {
					if (error instanceof Error) {
						reject(error);
						return;
					}
					
					reject(parameter.failure);
				});
		});
		
		
		return function() {
			httpserver.close();
			speed.stop();
			fileDownload.stop();
		}
	});
}


class httpServer
{
	constructor()
	{
		this.server = null;
		this.PORT = 51234;
		this.STATIC_DIR = path.resolve("cache");
	}
	
	getUrl(pathname)
	{
		return `http://localhost:${this.PORT}/${pathname}`;
	}
	
	getCacheDir()
	{
		return path.join(this.STATIC_DIR, ...arguments);
	}
	
	isFile(pathname)
	{
		if (pathname) {
			return fs.existsSync(path.join(this.STATIC_DIR, pathname));
		}
		
		return false;
	}
	
	close()
	{
		if (this.server) {
			this.server.close();
		}
	}
	
	run()
	{
		return new Promise((resolve) => {
			this.server = http.createServer(async (req, res) => {
				const fullPath = path.join(this.STATIC_DIR,  req.url);

				try {
					const stats = await fs.promises.stat(fullPath);

					if (stats.isDirectory()) {
						res.writeHead(403, {'Content-Type': 'text/html; charset=utf-8'});
						res.end('不允许访问文件夹');
						return;
					}

					// 设置响应头 - 强制下载
					res.writeHead(200, {
						'Content-Type': 'application/octet-stream',
						'Content-Length': stats.size,
					});

					// 流式输出（支持大文件，不会占满内存）
					fs.createReadStream(fullPath).pipe(res);
				} catch (err) {
					if (err.code === 'ENOENT') {
						res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
						res.end('文件不存在');
					} else {
						res.writeHead(500, {'Content-Type': 'text/html; charset=utf-8'});
						res.end('服务器错误');
					}
				}
			});

			this.server.listen(this.PORT, 'localhost', resolve);
		});
	}
}


	module.exports = {
		FileDownloads,
		FileDownload,
		Speed,
		taskDownloads,
		taskDownload,
		httpServer,
	};