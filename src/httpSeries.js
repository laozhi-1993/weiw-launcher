const got  = require('got').default;
const fs   = require('fs');
const path = require('path');



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
	
	
	add(downloadUrl, savePath)
	{
		const id = () => {
			return this.total+'_'+Date.now();
		};
		
		this.total++;
		this.readyToDownloadFiles.push({'id': id(), 'url': downloadUrl, 'path': savePath});
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
		while (true)
		{
			this.trigger('progress', this.total, this.complete);
			
			
			if (this.isStop || this.total <= this.complete)
			{
				if (this.failure)
				{
					throw this;
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
				const fileDownload = new FileDownload(readyToDownloadFile.url);
				
				fileDownload.start(speed, (...args) => this.trigger('data', readyToDownloadFile.id, ...args))
				
				.then((data) => {
					data.saveToFile(readyToDownloadFile.path);
					
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
	constructor(downloadUrl) 
	{
		this.downloadUrl = downloadUrl;
		this.request = null;
		this.transferred = 0;
		this.controller = new AbortController();
	}
	
	static data = class
	{
		constructor(buffer) 
		{
			this.buffer = buffer;
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
		
		dataToJson(encoding = 'utf-8')
		{
			try {
				return JSON.parse(this.buffer.toString(encoding));
			} catch (error) {
				throw error;
			}
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
			this.request = got(this.downloadUrl, {
				signal: this.controller.signal,
				responseType: 'buffer',

				headers: {
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
					'accept': '*/*',
					'connection': 'keep-alive'
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
				resolve(new FileDownload.data(response.body));
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

function taskDownloads(task, downloads, title, threadCount = 20)
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
		return task.start('html/task_downloads.html', (resolve, reject) => {
			
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
				fileDownloads.add(value.url, value.path);
			}
			
			fileDownloads.start(speed)
				.then(() => resolve())
				.catch((error) => reject(error));
			
			return function() {
				speed.stop();
				fileDownloads.stop();
			};
		});
	}
}

function taskDownloadAssets(task, downloads, title, threadCount = 20)
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
		return task.start('html/task_download_assets.html', (resolve, reject) => {
			
			task.sendEvent('operation', title);
			
			const speed = new Speed((size) => task.sendEvent('speed', size));
			const fileDownloads = new FileDownloads(threadCount);
			
			
			fileDownloads.on('progress', (total, complete) => {
				task.sendEvent('progress', {'total': total, 'complete': complete});
			});
			
			
			
			for (const value of list) {
				fileDownloads.add(value.url, value.path);
			}
			
			fileDownloads.start(speed)
				.then(() => resolve())
				.catch((error) => reject(error));
			
			return function() {
				speed.stop();
				fileDownloads.stop();
			};
		});
	}
}

function taskDownload(task, url, title, failure, callback)
{
	return task.start('html/task_download.html', (resolve, reject) => {
		
		task.sendEvent('operation', title);
		
		const speed = new Speed((size) => task.sendEvent('speed', size));
		const fileDownload = new FileDownload(url);
		
		
		fileDownload.start(speed, (total, complete) => task.sendEvent('progress', {'total': total, 'complete': complete}))
			.then(callback)
			.then(() => resolve())
			.catch((error) => reject(failure));
		
		return function() {
			speed.stop();
			fileDownload.stop();
		}
	});
}


	module.exports = {
		FileDownloads,
		taskDownloadAssets,
		FileDownload,
		Speed,
		taskDownloads,
		taskDownload,
	};