const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');
const { downloadFiles, downloadFile, install } = load('taskManager');


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
		const versionEntry = admZip.getEntry('version.json');
		
		
		if (installProfileEntry) {
			this.installProfileJson = JSON.parse(installProfileEntry.getData().toString());
		} else {
			throw('未找到 install_profile.json 文件！');
		}
		
		if (versionEntry) {
			this.versionJson = JSON.parse(versionEntry.getData().toString());
		} else {
			throw('未找到 version.json 文件！');
		}
		
		if (this.minecraft.getVersion() !== this.installProfileJson.minecraft) {
			throw('我的世界版本与forge版本不匹配');
		}
		
		
		if (this.versionJson.minecraftArguments) {
			this.minecraft.setMainClass(this.versionJson.mainClass);
			this.minecraft.setArguments(this.versionJson.minecraftArguments);
		} else {
			this.minecraft.setMainClass(this.versionJson.mainClass);
			this.minecraft.setArguments(this.versionJson.arguments)
		}
	}
	
    initializeLibraries()
	{
		for (const librarie of this.installProfileJson.libraries) {
			if (librarie.downloads.artifact.url) {
				this.downloads.push({
					'url':  librarie.downloads.artifact.url,
					'path': this.minecraft.getLibrariesDir(librarie.downloads.artifact.path),
				});
			}
		}
		
		for (const librarie of this.versionJson.libraries) {
			if (librarie.downloads.artifact.url) {
				this.downloads.push({
					'url':  librarie.downloads.artifact.url,
					'path': this.minecraft.getLibrariesDir(librarie.downloads.artifact.path),
				});
			}
			
			this.minecraft.setClassPath(this.minecraft.getLibrariesDir(librarie.downloads.artifact.path));
		}
	}
	
	
	checkInstallation()
	{
		try {
			const profilesPath = this.minecraft.getRootDir('launcher_profiles.json');
			const launcherProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
			
			for (const download of this.downloads) {
				if (!fs.existsSync(download.path)) {
					if (launcherProfiles.profiles?.forge) {
						delete launcherProfiles.profiles.forge;
						fs.writeFileSync(profilesPath, JSON.stringify(launcherProfiles, null, 4));
					}
					
					return true;
				}
			}
			
			if (launcherProfiles.profiles?.forge) {
				return false;
			}
			
			return true;
		} catch (error) {
			return true;
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
		
		const checkInstallation = this.checkInstallation();
		
		await downloadFiles(taskWindow, this.downloads, '下载forge依赖库');
		
		
		if (checkInstallation)
		{
			await install(taskWindow, this.minecraft.getJava(), ['-jar', this.extensionPath, '--installClient', this.minecraft.getRootDir()], '安装forge中请稍等', '安装失败');
		}
	}
}