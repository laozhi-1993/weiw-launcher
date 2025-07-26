const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');


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
				
				.then(() => {
					fileDownload.saveToFile(readyToDownloadFile.path);
					
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
				
				
				this.trigger('start', readyToDownloadFile.id, path.basename(readyToDownloadFile.url));
				this.downloadingFiles[readyToDownloadFile.id] = fileDownload;
			}
			
			
			await new Promise(resolve => setTimeout(resolve));
		}
	}
}


class FileDownload
{
    constructor(downloadUrl, savePath)
    {
		this.downloadUrl = downloadUrl;
		this.request = null;
		
		
		this.totalBytes       = 0;
		this.downloadedBytes  = 0;
		this.downloadedChunks = [];
    }
	
	
	saveToFile(savePath)
	{
		try {
			if(!fs.existsSync(path.dirname(savePath))) {
				fs.mkdirSync(path.dirname(savePath), { recursive: true });
			}
			
			fs.writeFileSync(savePath, Buffer.concat(this.downloadedChunks));
		}
		catch (error) {
			throw error;
		}
	}
	
	
	dataToJson(encoding = 'utf-8')
	{
		try {
			return JSON.parse(Buffer.concat(this.downloadedChunks).toString(encoding));
		} catch (error) {
			throw error;
		}
	}
	
	
	getRequest(callback)
	{
		if (this.downloadUrl.toLowerCase().startsWith('https:'))
		{
			return https.get(this.downloadUrl, callback);
		}
		else
		{
			return  http.get(this.downloadUrl, callback);
		}
	}
	
	
	stop()
	{
		this.request && this.request.abort();
	}
	
	
	start(speed, progress)
	{
		return new Promise((resolve, reject) => {
			this.request = this.getRequest((response) => {
				if (response.statusCode === 301 || response.statusCode === 302)
				{
					this.downloadUrl = response.headers.location;
					return this.start();
				}
				
				if (response.statusCode === 200)
				{
					this.totalBytes = parseInt(response.headers['content-length'], 10);
					
					
					response.on('data', (chunk) => {
						this.downloadedBytes += chunk.length;
						this.downloadedChunks.push(chunk);
						
						
						if (speed)
						{
							speed.addBytes(chunk.length);
						}
						
						
						if (progress)
						{
							progress(this.totalBytes, this.downloadedBytes);
						}
					});
					
					response.on('end', () => resolve(this));
					response.on('error', (error) => reject(new Error(error)));
				}
				else reject(new Error(response.statusCode));
			});
			
			this.request.on('error', (error) => reject(new Error(error)));
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
		if (!list.some(item => item.path === value.path)) {
			if(!fs.existsSync(value.path)) {
				list.push(value);
			}
		}
	}
	
	if (list.length !== 0)
	{
		return task.start('html/task_downloadFiles.html', (resolve, reject) => {
			
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
				.catch(() => reject(`有 ${fileDownloads.failure} 个文件下载失败请重新尝试下载`));
			
			return function() {
				speed.stop();
				fileDownloads.stop();
			};
		});
	}
}

function taskDownload(task, url, title, failure, callback)
{
	return task.start('html/task_downloadFile.html', (resolve, reject) => {
		
		task.sendEvent('operation', title);
		
		const speed = new Speed((size) => task.sendEvent('speed', size));
		const fileDownload = new FileDownload(url);
		
		
		fileDownload.start(speed, (total, complete) => task.sendEvent('progress', {'total': total, 'complete': complete}))
			.then(callback)
			.then(() => resolve())
			.catch(() => reject(failure));
		
		return function() {
			speed.stop();
			fileDownload.stop();
		}
	});
}


	module.exports = {
		FileDownloads,
		FileDownload,
		Speed,
		taskDownloads,
		taskDownload,
	};