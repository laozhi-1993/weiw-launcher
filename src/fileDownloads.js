const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');


module.exports = class
{
    constructor(downloadCount)
    {
		this.httpRequests = [];
		this.httpRequestsIndex = 0;
		this.downloads = [];
		this.length = 0;
		this.count = 0;
		this.downloadedBytes = 0;
		this.isAborted = false;
		
		this.ons = [];
		this.onErrors = [];
		
		
		for (let i = 0; i < downloadCount; i++) {
			this.thread();
		}
    }
	
	
	on(func) {
		this.ons.push(func);
	}
	
	onError(func) {
		this.onErrors.push(func);
	}
	
	onSpeed(func) {
		let count = this.downloadedBytes;
		const formatBytes = function (bytes) {
			if (bytes < 1024 * 1024) {
				return `${(bytes / 1024).toFixed(2)}KB/s`;
			} else {
				return `${(bytes / (1024 * 1024)).toFixed(2)}MB/s`;
			}
		}
		
		
		const speedInterval = setInterval(() => {
			if (this.isAborted) {
				clearInterval(speedInterval);
			} else {
				func(formatBytes(this.downloadedBytes - count), this.downloadedBytes - count);
				count = this.downloadedBytes;
			}
		}, 1000);
	}
	
	
	add(url, path) {
		return new Promise((resolve, reject) => {
			this.downloads.push({
				'id': ++this.length,
				'url': url, 
				'path': path,
				'resolve': resolve,
				'reject': reject,
			});
		});
	}
	
	
	abort() {
		this.isAborted = true;
		this.httpRequests.forEach((res) => {
			res.abort();
		});
		
		if (this.length !== this.count) {
			this.onErrors.forEach(func => func({error: '被提前终止'}));
		}
	}
	
	writeFileSync(filePath, data)
	{
		if(!fs.existsSync(path.dirname(filePath))) {
			fs.mkdirSync(path.dirname(filePath), { recursive: true });
		}
		
		fs.writeFileSync(filePath, data);
	}
	
	
	fileDownload(URL, filePath, onProgress, index)
	{
		return new Promise((resolve, reject) => {
			const callback = (response) => {
				if (response.statusCode === 301 || response.statusCode === 302) {
					return this.fileDownload(response.headers.location, filePath, onProgress, index).then(resolve).catch(reject);
				}
				
				if (response.statusCode === 200)
				{
					let length = parseInt(response.headers['content-length'], 10);
					let chunks = [];
					
					response.on('data', (chunk) => {
						chunks.push(chunk);
						
						if(onProgress) {
							onProgress(length, chunk.length);
						}
					});
					
					response.on('end', () => {
						if (filePath)
						{
							try {
								this.writeFileSync(filePath, Buffer.concat(chunks));
							} catch (error) {
								reject(error);
							}
							
							resolve(true);
						}
						else resolve(chunks.join(''));
					});
					
					response.on('error', (error) => reject(error));
				}
				else reject(new Error(response.statusCode));
			}
			
			const protocol = URL.toLowerCase().startsWith('https:') ? https : http;
			const res = protocol.get(URL, callback).on('error', (error) => reject( error ));
			
			
			if(index !== undefined) {
				this.httpRequests[index] = res;
			}
		});
	}
	
	
	async waitDone() {
		while(true) {
			if (this.length === this.count) {
				return true;
			}
			
			if (this.isAborted) {
				return false;
			}
			
			await new Promise(resolve => setTimeout(resolve,10));
		}
	}
	
	async thread()
	{
		const index = this.httpRequestsIndex++;
		
		while (this.isAborted === false)
		{
			await new Promise(resolve => setTimeout(resolve,10));
			
			if (this.downloads.length === 0) {
				continue;
			}
			
			const firstElement = this.downloads.shift();
			
			let totalBytes = 0;
			let downloadedBytes = 0;
			
			const createProgressReport = (downloadStatus, error = '') => {
				return {
					'length': this.length,
					'count': this.count,
					'id': firstElement.id,
					'url': firstElement.url,
					'fileName': path.basename(firstElement.url),
					'index': index,
					'error': error,
					'totalBytes': totalBytes,
					'downloadedBytes': downloadedBytes,
					'downloadStatus': downloadStatus
				}
			}
			
			
			try
			{
				this.ons.forEach(func => func(createProgressReport(0)));
				
				const data = await this.fileDownload(firstElement.url, firstElement.path, (length, chunkSize) => {
					if (this.isAborted === false)
					{
						totalBytes = length;
						downloadedBytes += chunkSize;
						
						
						this.downloadedBytes += chunkSize;
						this.ons.forEach(func => func(createProgressReport(1)));
					}
				}, index);
				
				
				firstElement.resolve(data);
				this.count++;
				this.ons.forEach(func => func(createProgressReport(2)));
			}
			catch (error)
			{
				firstElement.reject(error);
				this.count++;
				this.ons.forEach(func => func(createProgressReport(3, error)));
				this.onErrors.forEach(func => func({error: error.message, url: firstElement.url}));
			}
		}
	}
}