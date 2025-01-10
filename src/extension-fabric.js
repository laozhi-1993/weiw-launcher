const path  = require('path');
const fs    = require('fs');
const myUrl = require('url');

module.exports = class
{
    constructor(taskManager, minecraft, version)
	{
		this.taskManager   = taskManager;
		this.minecraft     = minecraft;
		this.fabricVersion = version;
		this.fabricId      = `fabric-loader-${this.minecraftVersion}-${this.fabricVersion}`;
    }
	
	async setup() {
		this.versionJsonUrl = `https://meta.fabricmc.net/v2/versions/loader/${this.minecraft.version}/${this.fabricVersion}/profile/json`;
		this.versionJsonPath = this.minecraft.getRootDir('versions', this.fabricId, `${this.fabricId}.json`);
		
		if (!fs.existsSync(this.versionJsonPath)) {
			this.taskManager.start();
			this.taskManager.operation('下载fabric配置文件');
			
			await this.taskManager.fileDownloads.add(this.versionJsonUrl, this.versionJsonPath).catch((error) => {
				this.taskManager.operation('fabric配置文件下载失败');
				this.taskManager.stop();
			});
		}
		
		
		let success = 0;
		let failure = 0;
		
		this.versionJson = JSON.parse(fs.readFileSync(this.versionJsonPath, 'utf8'));
		this.minecraft.setMainClass(this.versionJson.mainClass);
		this.minecraft.setArguments(this.versionJson.arguments);
		
		for (const librarie of this.versionJson.libraries) {
			const librariePath = this.minecraft.getLibrariesDir(this.minecraft.generateJarPath(librarie.name));
			const librarieUrl = myUrl.resolve(librarie.url, this.minecraft.generateJarPath(librarie.name));
			
			
			if (!fs.existsSync(librariePath)) {
				this.taskManager.start();
				this.taskManager.operation('下载fabric依赖库');
				
				this.taskManager.fileDownloads.add(librarieUrl, librariePath).then(() => success++).catch(() => failure++);
			}
			
			this.minecraft.setClassPath(librariePath);
		}
		
		await this.taskManager.fileDownloads.waitDone();
		if (failure) {
			this.taskManager.operation(`有 ${failure} 个文件下载失败请重新尝试下载`);
			this.taskManager.stop();
		}
	}
}