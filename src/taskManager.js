const { spawn } = require('child_process');
const path      = require('path');
const fileDownloads = require(path.join(__dirname, "fileDownloads.js"));

module.exports = class
{
    constructor(mainWindows, downloadCount = 20)
	{
		this.mainWindows   = mainWindows;
		this.downloadCount = downloadCount;
		this.results       = [];
		
		
		this.isStart = false;
		this.isClose = false;
		
		
		this.setURL    = 'src_html/task_manager.html';
		this.setWidth  = 500;
		this.setHeight = 600;
    }
	
	spawn(command, args) {
		return new Promise((resolve, reject) => {
			const result = spawn(command, args);
			
			result.stdout.on('data', ( data ) => this.window.addEvent('spawn', data.toString()));
			result.stderr.on('data', ( data ) => this.window.addEvent('spawn', data.toString()));
			
			result.on('exit', (code) => {
				if (code === 0) {
					resolve(code);
				} else {
					reject(code);
				}
			});
			
			this.results.push(result);
		});
	}
	
	start() {
		if (this.isStart === false) {
			this.isStart = true;
			this.window.show();
		}
	}
	
	operation(data) {
		this.isClose || this.window.addEvent('operation', data);
	}
	
	async run(onStart)
	{
		try
		{
			this.window = this.mainWindows.windowModal(this.setURL, this.setWidth, this.setHeight);
			this.window.once('close', () => {
				this.isClose = true;
				
				this.fileDownloads.abort();
				this.results.forEach(func => func.kill());		
			});
			
			
			this.fileDownloads = new fileDownloads(this.downloadCount);
			this.fileDownloads.on((downloadQueue) => this.window.addEvent('downloadQueue', downloadQueue));
			this.fileDownloads.onSpeed((speed) => this.window.addEvent('speed', speed));
			
			
			this.stop = () => {
				throw new Error('stop');
			};
			
			throw await Promise.resolve(onStart(this));
		}
		catch (error)
		{
			if (error instanceof Error) {
				if (error.message === 'stop') {
					this.isStart || this.window.close();
				} else {
					this.window.close();
				}
				
				throw error;
			} else {
				this.window.close();
				return error;
			}
		}
	}
}