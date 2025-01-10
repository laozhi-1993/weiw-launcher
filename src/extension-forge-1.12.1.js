const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');
const myUrl  = require('url');

module.exports = class
{
    constructor(taskManager, minecraft, extension)
	{
		this.taskManager = taskManager;
		this.minecraft   = minecraft;
		
		this.extensionUrl  = extension;
		this.extensionPath = this.minecraft.getRootDir(path.basename(extension));
		this.downloads     = [];
    }
	
	
	initializeProperties()
	{
		const admZip = new AdmZip(this.extensionPath);
		const installProfileEntry = admZip.getEntry('install_profile.json');
		
		
		if (installProfileEntry) {
			this.installProfileJson = JSON.parse(installProfileEntry.getData().toString());
		} else {
			throw new Error('未找到 install_profile.json 文件！');
		}
		
		if (!this.installProfileJson.install || this.minecraft.getVersion() !== this.installProfileJson.install.minecraft) {
			throw new Error('我的世界版本与forge版本不匹配');
		}
		
		
		this.minecraft.setMainClass(this.installProfileJson.versionInfo.mainClass);
		this.minecraft.setArguments(this.installProfileJson.versionInfo.minecraftArguments);
	}
	
    initializeLibraries()
	{
		for (const librarie of this.installProfileJson.versionInfo.libraries) {
			let url = librarie.url || 'https://libraries.minecraft.net/';
			let filePath = false;
			
			if (librarie.name === this.installProfileJson.install.path) {
				filePath = this.installProfileJson.install.filePath;
			}
			
			this.downloads.push({
				'url':  myUrl.resolve(url, this.minecraft.generateJarPath(librarie.name, filePath)),
				'path': this.minecraft.getLibrariesDir(this.minecraft.generateJarPath(librarie.name)),
			});
			
			this.minecraft.setClassPath(this.minecraft.getLibrariesDir(this.minecraft.generateJarPath(librarie.name)));
		}
	}
	
	
	async setup() {
		if (!fs.existsSync(this.extensionPath)) {
			this.taskManager.start();
			this.taskManager.operation('下载forge安装程序');
			
			await this.taskManager.fileDownloads.add(this.extensionUrl, this.extensionPath).catch((error) => {
				this.taskManager.operation(`安装程序下载失败`);
				this.taskManager.stop();
			});
		}
		
		this.initializeProperties();
		this.initializeLibraries();
		
		let success = 0;
		let failure = 0;
		
		for (const download of this.downloads) {
			if (!fs.existsSync(download.path)) {
				this.taskManager.start();
				this.taskManager.operation('下载forge依赖库');
				
				this.taskManager.fileDownloads.add(download.url, download.path).then(() => success++).catch(() => failure++);
			}
		}
		
		await this.taskManager.fileDownloads.waitDone();
		if (failure) {
			this.taskManager.operation(`有 ${failure} 个文件下载失败请重新尝试下载`);
			this.taskManager.stop();
		}
	}
}