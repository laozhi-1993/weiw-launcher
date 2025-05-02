const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');
const { FileDownloads, FileDownload, Speed } = load('httpSeries');


function downloadFiles(taskWindow, downloads, title, threadCount = 20)
{
	return new Promise(async (resolve, reject) => {
		const speed = new Speed((size) => taskWindow.addEvent('speed', size));
		const fileDownloads = new FileDownloads(threadCount);
		
		const stop = function()
		{
			speed.stop();
			fileDownloads.stop();
		}
		
		fileDownloads.on('progress', (total, complete) => {
			taskWindow.addEvent('progress', {'total': total, 'complete': complete});
		});
		
		fileDownloads.on('start', (id, fileName) => {
			taskWindow.addEvent('downloadStart', {'id': id, 'fileName': fileName});
		});
		
		fileDownloads.on('data', (id, totalBytes, downloadedBytes) => {
			taskWindow.addEvent('downloadProgress', {'id': id, 'totalBytes': totalBytes, 'downloadedBytes': downloadedBytes});
		});
		
		
		for (const download of downloads) {
			fs.existsSync(download.path) || fileDownloads.add(download.url, download.path);
		}
		
		if (fileDownloads.total)
		{
			await taskWindow.start('src_html/task_downloadFiles.html');
			
			taskWindow.addEvent('operation', title);
			taskWindow.once('hide', () => {
				reject('stop');
				stop();
			});
		}
		
		fileDownloads.start(speed)
			.then(() => resolve())
			.catch(() => reject(`有 ${fileDownloads.failure} 个文件下载失败请重新尝试下载`))
			.finally(stop);
	});
}

function downloadFile(taskWindow, url, title, failure, callback)
{
	return new Promise(async (resolve, reject) => {
		const speed = new Speed((size) => taskWindow.addEvent('speed', size));
		const fileDownload = new FileDownload(url);
		
		const stop = function()
		{
			speed.stop();
			fileDownload.stop();
		}
		
		
		await taskWindow.start('src_html/task_downloadFile.html');
		
		taskWindow.addEvent('operation', title);
		taskWindow.once('hide', () => {
			reject('stop');
			stop();
		});
		
		fileDownload.start(speed, (total, complete) => taskWindow.addEvent('progress', {'total': total, 'complete': complete}))
			.then(callback)
			.then(() => resolve())
			.catch(() => reject(failure))
			.finally(stop);
	});
}

function install(taskWindow, command, args, title, failure)
{
	return new Promise(async (resolve, reject) => {
		await taskWindow.start('src_html/task_install.html');
		
		taskWindow.addEvent('operation', title);
		taskWindow.once('hide', () => {
			reject('stop');
			result.kill();
		});
		
		
		const result = spawn(command, args);
		
		result.on('exit', (code) => {
			if (code === 0) {
				resolve(code);
			} else {
				reject(failure);
			}
		});
		
		result.stdout.on('data', ( data ) => taskWindow.addEvent('install', data.toString()));
		result.stderr.on('data', ( data ) => taskWindow.addEvent('install', data.toString()));
	});
}


module.exports = {downloadFiles, downloadFile, install};