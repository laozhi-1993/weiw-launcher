const { app, ipcMain, globalShortcut, shell, dialog } = require('electron');
const path  = require('path');
const fs    = require('fs');
const myUrl = require('url');

const Windows     = require(path.join(__dirname, "windows.js"));
const TaskManager = require(path.join(__dirname, "taskManager.js"));
const CheckJava   = require(path.join(__dirname, "checkJava.js"));
const FileManager = require(path.join(__dirname, "fileManager.js"));

const Minecraft         = require(path.join(__dirname, "minecraft.js"));
const MinecraftGame     = require(path.join(__dirname, "minecraftGame.js"));
const MinecraftLauncher = require(path.join(__dirname, "minecraftLauncher.js"));


	if(app.requestSingleInstanceLock()) {
		app.on('ready', main);
	} else {
		app.quit();
	}


function main()
{
	global.config = JSON.parse(fs.readFileSync('config.json','utf-8'));
	global.mainWindows = new Windows(myUrl.resolve(config.URL, '/launcher/login.php'), 1100, 750, true);
	
	
	app.on('second-instance', () => {
		mainWindows.all.isMinimized() && mainWindows.all.restore();
		mainWindows.all.focus();
	});
	
	mainWindows.mainWindow.webContents.on('dom-ready', () => {
		if (minecraftLauncher) {
			mainWindows.all.addEvent('start');
		} else {
			mainWindows.all.addEvent('exit');
		}
	});
	
	
	let taskManager       = null;
	let minecraft         = null;
	let minecraftLauncher = null;
	
	
	ipcMain.on('windowApi', (event, message) => {
		mainWindows.windowUrl(...message);
	});
	
	
	ipcMain.on('openApi', (event, message) => {
		shell.openExternal(message);
	});
	
	
	ipcMain.on('start', (event, message) => {
		if (minecraftLauncher) {
			minecraftLauncher.kill();
			return;
		}
		
		if (taskManager) {
			return;
		}
		
		
		taskManager = new TaskManager(mainWindows);
		taskManager.run(async (taskManager) => {
			minecraft = new Minecraft(message.version, path.resolve('.minecraft'));
			minecraft.setUserName(message.username);
			minecraft.setUuid(message.uuid);
			minecraft.setAccessToken(message.accessToken);
			
			
			const checkJava = new CheckJava(taskManager, minecraft);
			await checkJava.checkJavaVersion();
			
			
			const fileManager = new FileManager(taskManager, minecraft);
			await fileManager.downloadAdditionalFiles(message.downloads);
			await fileManager.downloadAuthModule(message.authModule);
			await fileManager.clearUnwantedMods(message.mods);
			
			
			const minecraftGame = new MinecraftGame(taskManager, minecraft);
			await minecraftGame.setup();
			await minecraftGame.loadExtension(message.extensionType, message.extensionValue);
		}).then(() => {
			mainWindows.mainWindow.addEvent('start');
			
			minecraftLauncher = new MinecraftLauncher(minecraft);
			minecraftLauncher.setSize(config.width, config.height);
			minecraftLauncher.setJVM(message.jvm);
			minecraftLauncher.setAddress(message.quickPlayAddress);
			minecraftLauncher.setAuth(minecraft.getAuthModulePath(), myUrl.resolve(config.URL, '/weiw/index_auth.php/'));
			
			minecraftLauncher.start(function (data) {
				if (data === 'show') {
					mainWindows.all.minimize();
				}
				
				if (data === 'exit') {
					taskManager = null;
					minecraftLauncher = null;
					
					mainWindows.mainWindow.addEvent('exit');
					mainWindows.all.restore();
				}
				
				if (data === 'exitError') {
					const result = dialog.showMessageBoxSync(mainWindows.mainWindow, {
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
		}).catch((error) => {
			if (error.message !== 'stop') {
				dialog.showMessageBoxSync(mainWindows.mainWindow, {
					type: 'error',
					title: '出错了！',
					message: error.stack,
				});
			}
			
			taskManager = null;
			minecraftLauncher = null;
		});
	});
}
//dialog.showErrorBox('提示', error.stack);
//fs.writeFileSync('error.txt', JSON.stringify(assets, null, 4));