const { BrowserWindow, WebContentsView, ipcMain, dialog } = require('electron');
const path = require('path');


	function closeAll() {
		for(const window of BrowserWindow.getAllWindows()) {
			window.close();
		}
	}

	class Windows
	{
		constructor(setURL, setWidth, setHeight, setResizable)
		{
			this.view = new WebContentsView({
				webPreferences:{
					preload: path.join(__dirname, 'windowsPreload.js')
				}
			});
			
			this.window = new BrowserWindow({
				width: setWidth,
				height: setHeight,
				minWidth: setWidth,
				minHeight: setHeight,
				frame: false,
				show: false,
				webPreferences: {
					preload: path.join(__dirname, 'windowsPreload.js')
				}
			});
			
			
			this.add('html/load.html', () => this.window.show());
			
			this.window.webContents.on('did-start-navigation', (event) => {
				if (!event.isSameDocument && event.isMainFrame) {
					this.add('html/load.html');
				}
			});
			this.window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
				if (isMainFrame) {
					this.add('html/load_error.html');
				}
			});
			this.window.webContents.on('did-navigate', (event, url, httpResponseCode, httpStatusText) => {
				this.window.webContents.once('did-stop-loading', () => {
					(httpResponseCode === 404) && this.add('html/load_404.html');
					(httpResponseCode === 200) && this.remove();
				});
			});
			this.window.on('resize',     () => this.resize());
			this.window.on('show',       () => this.resize());
			this.window.on('maximize',   () => this.resize());
			this.window.on('minimize',   () => this.resize());
			this.window.on('unmaximize', () => this.resize());
			this.window.on('restore',    () => this.resize());
			this.window.on('closed',     () => this.view.webContents.destroy());
			this.window.loadURL(setURL);
		}
		
		add(setFile, callback = () => {})
		{
			this.view.webContents.loadFile(setFile);
			this.view.webContents.once('dom-ready', callback);
			this.window.contentView.addChildView(this.view);
		}
		
		remove()
		{
			this.view.webContents.loadURL('about:blank');
			this.window.contentView.removeChildView(this.view);
		}
		
		resize()
		{
			this.view.setBounds({
				x: 0,
				y: 0,
				width: this.window.getContentBounds().width,
				height: this.window.getContentBounds().height,
			});
		}
		
		addEvent(name, data)
		{
			if (this.window.isDestroyed()) {
				return;
			}
			
			if(data === undefined) {
				this.view.webContents.send('addEvent', {'name': name});
				this.window.webContents.send('addEvent', {'name': name});
			} else {
				this.view.webContents.send('addEvent', {'name': name, 'data': data});
				this.window.webContents.send('addEvent', {'name': name, 'data': data});
			}
		}
		
		start(setFile, callback)
		{
			const domReady = new Promise((resolve) => {
				this.add(setFile, resolve);
			});
			
			return domReady.then(() => {
				let returnValue;
				
				const task = new Promise((resolve, reject) => {
					try {
						returnValue = callback(resolve, reject);
					} catch (error) {
						reject(error);
					}
					
					this.window.once('close', () => {
						this.remove();
						reject('stop');
					});
					
					ipcMain.once('cancel' ,(event) => {
						this.remove();
						reject('stop');
					});
				});
				
				task.finally(returnValue);
				return task;
			});
		}
		
		error(error)
		{
			if (error instanceof Error)
			{
				dialog.showMessageBox(this.window, {
					type: 'error',
					title: '出错了！',
					message: error.stack,
				});
			}
			else
			{
				if (error === 'stop')
				{
					return;
				}
				
				dialog.showMessageBox(this.window, {
					type: 'error',
					title: '出错了！',
					message: error,
				});
			}
		}
	}


	module.exports = {
		Windows,
		closeAll,
	};


ipcMain.on('isResizable' ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.isResizable()  });
ipcMain.on('isMaximized' ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.isMaximized()  });
ipcMain.on('minimize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.minimize()     });
ipcMain.on('maximize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.maximize()     });
ipcMain.on('close'       ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.close()        });
ipcMain.on('restore'     ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.restore()      });
ipcMain.on('reload'      ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.reload()       });
ipcMain.on('DevTools'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.openDevTools() });