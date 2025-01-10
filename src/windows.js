const { BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');


module.exports = class
{
	constructor( setURL, setWidth, setHeight, setResizable )
	{
		const handler = {
			get: (target, prop) => (...args) => {
				for(const window of BrowserWindow.getAllWindows())
				{
					if(prop in window)
					{
						window[prop](...args);
					}
					else
					{
						return;
					}
				}
			}
		};
		
		
		this.all = new Proxy({}, handler);
		
		this.mainWindow = this.windowUrl( setURL, setWidth, setHeight, setResizable );
		this.mainWindow.on('closed', () => {
			BrowserWindow.getAllWindows().forEach(window => {
				if (window !== this.mainWindow) {
					window.close();
				}
			});
		});
	}
	
	
	windowUrl( setURL, setWidth, setHeight, setResizable )
	{
		const window = new BrowserWindow({
			width: setWidth,
			height: setHeight,
			frame: false,
			show: false,
			webPreferences: {
				preload: path.join(__dirname, 'windowsPreload.js')
			}
		});
		
		const view = new BrowserView({
			webPreferences:{
				preload: path.join(__dirname, 'windowsPreload.js')
			}
		});
		
		const resize = function () {
			view.setBounds({
				x: 0,
				y: 0,
				width: window.getContentBounds().width,
				height: window.getContentBounds().height,
			});
			
			return resize;
		}
		
		view.webContents.loadURL('about:blank');
		view.webContents.once('dom-ready', () => window.show());
		
		window.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
			if (isMainFrame) {
				view.webContents.loadFile('src_html/load.html');
				window.setBrowserView(view);
			}
		});
		window.webContents.on('did-fail-load', (event, errorCode) => {
			if (errorCode !== -3) {
				view.webContents.loadFile('src_html/load_error.html');
			}
		});
		window.webContents.on('did-navigate', (event, url, httpResponseCode, httpStatusText) => {
			window.webContents.once('did-finish-load', () => {
				if (httpResponseCode === 404) view.webContents.loadFile('src_html/load_404.html');
				if (httpResponseCode === 200) window.removeBrowserView(view);
			});
		});
		
		
		window.on('resize', resize());
		window.on('closed', () => view.webContents.destroy());
		
		if(setResizable) {
			window.setMinimumSize(setWidth, setHeight); //设置窗口最小宽度和高度
			window.setResizable(true); //设置窗口是否可以调整大小
		} else {
			window.setResizable(false); //设置窗口是否可以调整大小
		}
		
		window.loadURL(setURL);
		window.addEvent = function (name, data)
		{
			if(data === undefined) {
				window.webContents.send('addEvent', {'name': name});
			} else {
				window.webContents.send('addEvent', {'name': name, 'data': data});
			}
		}
		
		return window;
	}
	
	
	windowModal( setFile, setWidth, setHeight )
	{
		const window = new BrowserWindow({
			width: setWidth,
			height: setHeight,
			parent: this.mainWindow,
			frame: false,
			show: false,
			modal: true,
			webPreferences: {
				preload: path.join(__dirname, 'windowsPreload.js')
			}
		});
		
		
		window.loadFile(setFile);
		window.setResizable(false);
		
		window.addEvent = function (name, data)
		{
			if(data === undefined) {
				window.webContents.send('addEvent', {'name': name});
			} else {
				window.webContents.send('addEvent', {'name': name, 'data': data});
			}
		}
		
		return window;
	}
}


ipcMain.on('isResizable' ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.isResizable()  });
ipcMain.on('isMaximized' ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.isMaximized()  });
ipcMain.on('minimize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.minimize()     });
ipcMain.on('maximize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.maximize()     });
ipcMain.on('close'       ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.close()        });
ipcMain.on('restore'     ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.restore()      });
ipcMain.on('reload'      ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.reload()       });
ipcMain.on('DevTools'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.openDevTools() });