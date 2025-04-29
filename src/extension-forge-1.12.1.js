const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');
const myUrl  = require('url');
const { downloadFiles, downloadFile } = load('taskManager');


module.exports = class
{
    constructor(minecraft, extension)
	{
		this.downloads     = [];
		this.minecraft     = minecraft;
		this.extensionUrl  = extension;
		this.extensionPath = this.minecraft.getRootDir(path.basename(extension));
    }
	
	
	initializeProperties()
	{
		const admZip = new AdmZip(this.extensionPath);
		const installProfileEntry = admZip.getEntry('install_profile.json');
		
		
		if (installProfileEntry) {
			this.installProfileJson = JSON.parse(installProfileEntry.getData().toString());
		} else {
			throw('未找到 install_profile.json 文件！');
		}
		
		if (!this.installProfileJson.install || this.minecraft.getVersion() !== this.installProfileJson.install.minecraft) {
			throw('我的世界版本与forge版本不匹配');
		}
		
		
		this.minecraft.setMainClass(this.installProfileJson.versionInfo.mainClass);
		this.minecraft.setArguments(this.installProfileJson.versionInfo.minecraftArguments);
	}
	
    initializeLibraries()
	{
		for (const librarie of this.installProfileJson.versionInfo.libraries)
		{
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
	
	
	async setup(taskWindow)
	{
		if (!fs.existsSync(this.extensionPath))
		{
			await downloadFile(taskWindow, this.extensionUrl, '下载forge安装程序', '下载失败', f => f.saveToFile(this.extensionPath));
		}
		
		this.initializeProperties();
		this.initializeLibraries();
		
		await downloadFiles(taskWindow, this.downloads, '下载forge依赖库');
	}
}