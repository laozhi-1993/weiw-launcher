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


const { Windows, closeAll } = load('windows');
const CheckJava             = load('checkJava');
const FileManager           = load('fileManager');
const Minecraft             = load('minecraft');
const MinecraftCore         = load('minecraft-core');
const MinecraftFabric       = load('minecraft-fabric');
const MinecraftNeoForge     = load('minecraft-neoforge');
const MinecraftForge        = load('minecraft-forge');
const MinecraftLauncher     = load('minecraft-launcher');


function main()
{
	const config = JSON.parse(fs.readFileSync('config.json','utf-8'));
	const mainWindows = new Windows(config.url, 1100, 800);
	
	
	app.on('second-instance', () => {
		mainWindows.window.isMinimized() && mainWindows.window.restore();
		mainWindows.window.focus();
	});
	
	
	mainWindows.window.once('closed', () => {
		closeAll();
	});
	
	mainWindows.window.webContents.on('did-frame-finish-load', () => {
		if (minecraftLauncher) {
			mainWindows.addEvent('start');
		} else {
			mainWindows.addEvent('exit');
		}
		
		mainWindows.addEvent('jvm', [
			'-Xmx6G',
			'-XX:+UseG1GC',
			'-XX:-UseAdaptiveSizePolicy',
			'-XX:-OmitStackTraceInFastThrow',
			'-Dfml.ignoreInvalidMinecraftCertificates=true',
			'-Dfml.ignorePatchDiscrepancies=true',
			'-Djdk.lang.Process.allowAmbiguousCommands=true',
			'-Dlog4j2.formatMsgNoLookups=true',
		]);
		
		mainWindows.addEvent('version', app.getVersion());
	});
	
	
	let minecraft = null;
	let minecraftLauncher = null;
	
	
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
			await fileManager.downloadFiles(mainWindows, message[0].downloads);
			
			
			const minecraftCore = new MinecraftCore(minecraft);
			await minecraftCore.setup(mainWindows);
			await minecraftCore.generateServers(message[0].server);
			await minecraftCore.generateConfig();
			
			if (message[0].extensionType === 'fabric') {
				const fabric = new MinecraftFabric(minecraft, message[0].extensionValue);
				await fabric.setup(mainWindows);
			}
			
			if (message[0].extensionType === 'forge') {
				const forge = new MinecraftForge(minecraft, message[0].extensionValue);
				await forge.setup(mainWindows);
			}
			
			if (message[0].extensionType === 'neoforge') {
				const neoforge = new MinecraftNeoForge(minecraft, message[0].extensionValue);
				await neoforge.setup(mainWindows);
			}
		}
		catch(error)
		{
			minecraft = null;
			minecraftLauncher = null;
			
			return mainWindows.error(error);
		}
		
		try {
			mainWindows.remove();
			mainWindows.addEvent('start');
			
			minecraftLauncher = new MinecraftLauncher(minecraft);
			minecraftLauncher.start(function (data) {
				if (data === 'show') {
					mainWindows.window.minimize();
				}
				
				if (data === 'exit')
				{
					minecraft = null;
					minecraftLauncher = null;
					
					mainWindows.addEvent('exit');
					mainWindows.window.isMinimized() && mainWindows.window.restore();
					mainWindows.window.focus();
				}
				
				if (data === 'exitError')
				{
					const result = dialog.showMessageBoxSync(mainWindows, {
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