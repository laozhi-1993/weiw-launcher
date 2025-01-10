const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');

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
		const versionEntry = admZip.getEntry('version.json');
		
		
		if (installProfileEntry) {
			this.installProfileJson = JSON.parse(installProfileEntry.getData().toString());
		} else {
			throw new Error('未找到 install_profile.json 文件！');
		}
		
		if (versionEntry) {
			this.versionJson = JSON.parse(versionEntry.getData().toString());
		} else {
			throw new Error('未找到 version.json 文件！');
		}
		
		if (this.minecraft.getVersion() !== this.installProfileJson.minecraft) {
			throw new Error('我的世界版本与forge版本不匹配');
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
	
	
	checkInstallation() {
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
		
		const checkInstallation = this.checkInstallation();
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
		
		if (checkInstallation) {
			this.taskManager.start();
			this.taskManager.operation('安装forge中请不要关闭此窗口');
			
			await this.taskManager.spawn(this.minecraft.getJava(), ['-jar', this.extensionPath, '--installClient', this.minecraft.getRootDir()]).catch((error) => {
				this.taskManager.operation(`安装forge失败`);
				this.taskManager.stop();
			});
		}
	}
}