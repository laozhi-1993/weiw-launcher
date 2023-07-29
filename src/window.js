const { BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');


module.exports = function ( setURL, setWidth, setHeight, setResizable )
{
	var Window = new BrowserWindow({
		width: setWidth,
		height: setHeight,
		frame: false,
		webPreferences: {
			preload: path.join(__dirname, 'window.preload.js')
		}
	});
	var load       = null;
	var load_error = null;
	
	
	Window.webContents.on('did-start-navigation', (event,url,isInPlace,isMainFrame) => {
		if(isMainFrame)
		{
			if(load)
			{
				Window.removeBrowserView(load);
				load.webContents.destroy();
				load = null;
			}
			
			
			load = new BrowserView({
				webPreferences:{
					preload: path.join(__dirname, 'window.preload.js')
				}
			});
			
			
			Window.setBrowserView(load);
			load.setBounds({ x: 0, y: 0, width: Window.getContentBounds().width, height: Window.getContentBounds().height });
			load.webContents.loadFile('src_html/load.html');
		}
		
		
		if(load_error)
		{
			Window.removeBrowserView(load_error);
			load_error.webContents.destroy();
			load_error = null;
		}
	});
	
	
	Window.webContents.on('did-finish-load', (event,url,isInPlace,isMainFrame) => {
		if(load)
		{
			Window.removeBrowserView(load);
			load.webContents.destroy();
			load = null;
		}
	});
	
	
	Window.webContents.on('did-fail-load', () => {
		if(load_error)
		{
			Window.removeBrowserView(load_error);
			load_error.webContents.destroy();
			load_error = null;
		}
			
		load_error = new BrowserView({
			webPreferences:{
				preload: path.join(__dirname, 'window.preload.js')
			}
		});
		
		Window.setBrowserView(load_error);
		load_error.setBounds({ x: 0, y: 0, width: Window.getBounds().width, height: Window.getBounds().height });
		load_error.webContents.loadFile('src_html/load_error.html');
	});
	
	
	Window.on('resize',() => {
		if(load) load.setBounds({ x: 0, y: 0, width: Window.getContentBounds().width, height: Window.getContentBounds().height });
		if(load_error) load_error.setBounds({ x: 0, y: 0, width: Window.getContentBounds().width, height: Window.getContentBounds().height });
	});
	
	
	if(setResizable)
	{
		Window.setMinimumSize(setWidth, setHeight); //设置窗口最小宽度和高度
		Window.setResizable(true); //设置窗口是否可以调整大小
		Window.loadURL(setURL); //打开一个页面
	}
	else
	{
		Window.setResizable(false); //设置窗口是否可以调整大小
		Window.loadURL(setURL); //打开一个页面
	}
	
	return Window;
}


ipcMain.on('isMaximized' ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.isMaximized()  });
ipcMain.on('minimize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.minimize()     });
ipcMain.on('maximize'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.maximize()     });
ipcMain.on('close'       ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.close()        });
ipcMain.on('restore'     ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.restore()      });
ipcMain.on('DevTools'    ,(event) => { if(BW = BrowserWindow.fromWebContents(event.sender)) event.returnValue = BW.openDevTools() });