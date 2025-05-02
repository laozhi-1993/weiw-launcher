const { BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');
const path = require('path');


function closeAll()
{
	for(const window of BrowserWindow.getAllWindows())
	{
		window.close();
	}
}


function window( setURL, setWidth, setHeight, setResizable )
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


function taskWindow( setWidth, setHeight, mainWindow )
{
	const window = new BrowserWindow({
		width: setWidth,
		height: setHeight,
		resizable: false,
		maximizable: false,
		frame: false,
		show: false,
		modal: true,
		parent: mainWindow,
		webPreferences: {
			preload: path.join(__dirname, 'windowsPreload.js')
		}
	});
	
	window.loadURL('about:blank');
	window.on('hide', () => window.loadURL('about:blank'));
	
	
	window.addEvent = function(name, data)
	{
		if(data === undefined) {
			window.isDestroyed() || window.webContents.send('addEvent', {'name': name});
		} else {
			window.isDestroyed() || window.webContents.send('addEvent', {'name': name, 'data': data});
		}
	}
	
	window.waiting = function()
	{
		return new Promise((resolve) => window.isVisible() ? window.once('hide', resolve) : resolve());
	}
	
	window.start = function(setFile)
	{
		window.loadFile(setFile);
		window.show();
		
		return new Promise((resolve) => window.webContents.once('dom-ready', resolve));
	}
	
	window.error = function(error)
	{
		if (error instanceof Error)
		{
			dialog.showMessageBox(window, {
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
			
			dialog.showMessageBox(window, {
				type: 'error',
				title: '出错了！',
				message: error,
			});
		}
	}
	
	return window;
}


module.exports = {closeAll, window, taskWindow};


ipcMain.on('isResizable' ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.isResizable()  });
ipcMain.on('isMaximized' ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.isMaximized()  });
ipcMain.on('minimize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.minimize()     });
ipcMain.on('maximize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.maximize()     });
ipcMain.on('close'       ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.close()        });
ipcMain.on('restore'     ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.restore()      });
ipcMain.on('reload'      ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.reload()       });
ipcMain.on('show'        ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.show()         });
ipcMain.on('hide'        ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.hide()         });
ipcMain.on('DevTools'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.openDevTools() });