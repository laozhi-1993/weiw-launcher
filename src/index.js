const { app, ipcMain, shell, dialog } = require('electron');
const path  = require('path');
const fs    = require('fs');


	global.load = function (name)
	{
		return require(path.join(__dirname, name));
	}

	if(app.requestSingleInstanceLock()) {
		app.on('ready', main);
	} else {
		app.quit();
	}


const { closeAll, window, taskWindow } = load('windows');
const broadcastAddress  = load('broadcastAddress');
const CheckJava         = load('checkJava');
const FileManager       = load('fileManager');
const Minecraft         = load('minecraft');
const MinecraftGame     = load('minecraftGame');
const MinecraftLauncher = load('minecraftLauncher');


function main()
{
	const config = JSON.parse(fs.readFileSync('config.json','utf-8'));
	const mainWindow = window(config.URL+'/launcher/login.php', 1100, 800, true);
	const mainTaskWindow = taskWindow(500, 600, mainWindow);
	
	
	app.on('second-instance', () => {
		mainWindow.isMinimized() && mainWindow.restore();
		mainWindow.focus();
	});
	
	
	mainWindow.once('closed', () => {
		closeAll();
	});
	
	mainWindow.webContents.on('did-frame-finish-load', () => {
		if (minecraftLauncher) {
			mainWindow.addEvent('start');
		} else {
			mainWindow.addEvent('exit');
		}
		
		mainWindow.addEvent('version', app.getVersion());
	});
	
	
	let minecraft = null;
	let minecraftLauncher = null;
	
	
	ipcMain.on('windowApi', (event, message) => {
		window(...message);
	});
	
	
	ipcMain.on('openApi', (event, message) => {
		shell.openExternal(...message);
	});
	
	
	ipcMain.on('start', async (event, message) => {
		if (minecraftLauncher) {
			return minecraftLauncher.kill();
		}
		
		if (minecraft) {
			return;
		}
		
		
		minecraft = new Minecraft(message[0].version, path.resolve(message[0].name));
		minecraft.setAuthUrl(config.URL+'/weiw/index_auth.php/');
		minecraft.setUserName(message[0].username);
		minecraft.setUuid(message[0].uuid);
		minecraft.setAccessToken(message[0].accessToken);
		
		
		try
		{
			const checkJava = new CheckJava();
			await checkJava.checkJavaVersion(minecraft);
			
			
			const fileManager = new FileManager(minecraft);
			await fileManager.clearUnwantedMods(message[0].mods);
			await fileManager.downloadFiles(mainTaskWindow, message[0].downloads);
			await fileManager.downloadAuth(mainTaskWindow, message[0].authModule);
			
			
			const minecraftGame = new MinecraftGame(minecraft);
			await minecraftGame.setup(mainTaskWindow);
			await minecraftGame.extension(mainTaskWindow, message[0].extensionType, message[0].extensionValue);
		}
		catch(error)
		{
			minecraft = null;
			minecraftLauncher = null;
			
			return mainTaskWindow.error(error);
		}
		
		mainTaskWindow.hide();
		mainTaskWindow.waiting().then(() => {
			mainWindow.addEvent('start');
			
			let baClose;
			
			if (message[0].address !== '') {
				const [address, port] = message[0].address.split(':');
				baClose = broadcastAddress('§e我的世界服务器', address, port ?? 25565);
			}
			
			
			minecraftLauncher = new MinecraftLauncher(minecraft);
			minecraftLauncher.setSize(config.width, config.height);
			minecraftLauncher.setJVM(message[0].jvm);
			//minecraftLauncher.setAddress(message[0].address);
			minecraftLauncher.setAuth(minecraft.getAuthPath(), minecraft.getAuthUrl());
			
			minecraftLauncher.start(function (data) {
				if (data === 'show') {
					mainWindow.minimize();
				}
				
				if (data === 'exit')
				{
					minecraft = null;
					minecraftLauncher = null;
					
					baClose && baClose();
					mainWindow.addEvent('exit');
					mainWindow.isMinimized() && mainWindow.restore();
					mainWindow.focus();
				}
				
				if (data === 'exitError')
				{
					const result = dialog.showMessageBoxSync(mainWindow, {
						type: 'question',
						title: '游戏异常退出！',
						buttons: ['关闭', '打开'],
						message: '是否需要打开日志文件？',
					});
					
					if (result === 1) {
						shell.openPath('error.log');
					}
				}
			});
		});
	});
}
//dialog.showErrorBox('提示', error.stack);
//fs.writeFileSync('error.txt', JSON.stringify(assets, null, 4));