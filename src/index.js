const { app, ipcMain, globalShortcut, shell } = require('electron');
const path     = require('path');
const fs       = require('fs');
const launcher = require('./launcher.js');
const Window   = require('./window.js');


function main()
{
	fs.readFile('config.json', 'utf8', (err, data) => {
		if (err) {
			throw new Error(`读取配置文件时发生错误：${err}`);
			return;
		}
		
		var state = 0;
		var config = JSON.parse(data);
		var Minecraft = null;
		var mainWindow = Window(`${config.URL}/weiw_launcher/login.php`,500,380,false);
		
		
		app.on('second-instance', () => {
			mainWindow.isMinimized() && mainWindow.restore();
			mainWindow.focus();
		});
		
		
		ipcMain.on('login', (event) => {
			mainWindow.removeAllListeners('close');
			mainWindow.close();
			mainWindow = Window(`${config.URL}/weiw_launcher/login.php`,500,380,false);
		});
		
		
		ipcMain.on('index', (event) => {
			mainWindow.removeAllListeners('close');
			mainWindow.close();
			mainWindow = Window(`${config.URL}/weiw_launcher/index.php`,1100,750,true);
			
			
			mainWindow.webContents.on('dom-ready', () => {
				mainWindow.webContents.send('mc_state',state);
			});
		});
		
		
		ipcMain.on('open', (event,message) => {
			shell.openExternal(message);
		});
		
		
		ipcMain.on('start', (event,message) => {
			if(event.sender === mainWindow.webContents)
			{
				if(state == 2)
				{
					Minecraft.kill();
					Minecraft = null;
				}
				if(state == 0)
				{
					var success = () => {
						for(let value of config.key)
						{
							globalShortcut.register(value.key,() => {
								mainWindow.webContents.send("mc_key",value);
							});
						}
						
						
						globalShortcut.register('`',() => {
							if(!mainWindow.isFocused())
							{
								mainWindow.isMinimized() && mainWindow.restore();
								mainWindow.center();
								mainWindow.focus();
							}
							else mainWindow.minimize();
						});
						
						
						mainWindow.webContents.send('mc_state',state = 2);
						mainWindow.minimize();
					}
					var exit = () => {
						globalShortcut.unregisterAll();
						
						
						mainWindow.webContents.send('mc_state',state = 0);
						mainWindow.restore();
					}
					Minecraft = new launcher(path.resolve('.'),path.resolve('java/bin/java.exe'),config.versions,config.xmn,config.xmx);
					Minecraft.username   = message.username;
					Minecraft.uuid       = message.uuid;
					Minecraft.token      = message.token;
					Minecraft.fullscreen = config.fullscreen;
					Minecraft.server     = config.server;
					Minecraft.port       = config.port;
					Minecraft.width      = config.width;
					Minecraft.height     = config.height;
					Minecraft.auth_route = `authlib-injector.jar`;
					Minecraft.auth_url   = `${config.URL}/weiw/index_auth.php/`;
					Minecraft.start((data)=>mainWindow.webContents.send('mc_data',data),success,exit);
					mainWindow.webContents.send('mc_state',state = 1);
				}
			}
		});
	});
}


if(app.requestSingleInstanceLock())
{
	app.on('ready', main);
}
else
{
	app.quit();
}