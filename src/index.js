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
const MinecraftCore     = load('minecraft-core');
const MinecraftFabric   = load('minecraft-fabric');
const MinecraftNeoForge = load('minecraft-neoforge');
const MinecraftForge    = load('minecraft-forge');
const MinecraftLauncher = load('minecraft-launcher');


function main()
{
	const config = JSON.parse(fs.readFileSync('config.json','utf-8'));
	const mainWindow = window(config.url, 1100, 800, true);
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
		
		mainWindow.addEvent('jvm', [
			'-Xmx6G',
			'-XX:+UseG1GC',
			'-XX:-UseAdaptiveSizePolicy',
			'-XX:-OmitStackTraceInFastThrow',
			'-Dfml.ignoreInvalidMinecraftCertificates=true',
			'-Dfml.ignorePatchDiscrepancies=true',
			'-Djdk.lang.Process.allowAmbiguousCommands=true',
			'-Dlog4j2.formatMsgNoLookups=true',
		]);
		
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
		
		
		minecraft = new Minecraft(path.resolve(message[0].name));
		minecraft.launcherName(app.getName());
		minecraft.launcherVersion(app.getVersion());
		minecraft.version(message[0].version);
		minecraft.uuid(message[0].uuid);
		minecraft.userName(message[0].username);
		minecraft.accessToken(message[0].accessToken);
		
		
		try
		{
			const checkJava = new CheckJava();
			await checkJava.checkJavaVersion(minecraft);
		}
		catch
		{
			minecraft = null;
			minecraftLauncher = null;
			
			return;
		}
		
		try
		{
			minecraft.game.size(config.width, config.height);
			minecraft.jvm.auth(message[0].authPath, message[0].authServerUrl);
			
			for(const value of message[0].jvm) {
				minecraft.jvm.add(value);
			}
			
			if (minecraft.versionCompare('1.13', '=>')) {
				minecraft.jvm.add('-Dfile.encoding=UTF-8');
				minecraft.jvm.add('-Dstdout.encoding=UTF-8');
				minecraft.jvm.add('-Dstderr.encoding=UTF-8');
			}
			
			
			const fileManager = new FileManager(minecraft);
			await fileManager.clearUnwantedMods(message[0].mods);
			await fileManager.downloadFiles(mainTaskWindow, message[0].downloads);
			
			
			const minecraftGame = new MinecraftCore(minecraft);
			await minecraftGame.setup(mainTaskWindow);
			await minecraftGame.ensureConfigExists();
			
			if (message[0].extensionType === 'fabric') {
				const fabric = new MinecraftFabric(minecraft, message[0].extensionValue);
				await fabric.setup(mainTaskWindow);
			}
			
			if (message[0].extensionType === 'forge') {
				const forge = new MinecraftForge(minecraft, message[0].extensionValue);
				await forge.setup(mainTaskWindow);
			}
			
			if (message[0].extensionType === 'neoforge') {
				const neoforge = new MinecraftNeoForge(minecraft, message[0].extensionValue);
				await neoforge.setup(mainTaskWindow);
			}
		}
		catch(error)
		{
			minecraft = null;
			minecraftLauncher = null;
			
			return mainTaskWindow.error(error);
		}
		
		try {
			const closes = [];
			
			for(const { name, address, port } of message[0].server) {
				closes.push(broadcastAddress( name, address, port ));
			}
			
			mainTaskWindow.hide();
			mainWindow.addEvent('start');
			
			minecraftLauncher = new MinecraftLauncher(minecraft);
			minecraftLauncher.start(function (data) {
				if (data === 'show') {
					mainWindow.minimize();
				}
				
				if (data === 'exit')
				{
					for(const close of closes) {
						close();
					}
					
					minecraft = null;
					minecraftLauncher = null;
					
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
		} catch (error) {
			dialog.showErrorBox('启动错误', error.stack)
		}
	});
}
//dialog.showErrorBox('提示', error.stack);
//fs.writeFileSync('error.txt', JSON.stringify(assets, null, 4));