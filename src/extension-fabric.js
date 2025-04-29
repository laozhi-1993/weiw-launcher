const path  = require('path');
const fs    = require('fs');
const myUrl = require('url');
const { downloadFiles, downloadFile } = load('taskManager');


module.exports = class
{
    constructor(minecraft, version)
	{
		this.downloads     = [];
		this.minecraft     = minecraft;
		this.fabricVersion = version;
		this.fabricId      = `fabric-loader-${this.minecraftVersion}-${this.fabricVersion}`;
    }
	
	async setup(taskWindow)
	{
		this.versionJsonUrl = `https://meta.fabricmc.net/v2/versions/loader/${this.minecraft.version}/${this.fabricVersion}/profile/json`;
		this.versionJsonPath = this.minecraft.getRootDir('versions', this.fabricId, `${this.fabricId}.json`);
		
		if (!fs.existsSync(this.versionJsonPath))
		{
			await downloadFile(taskWindow, this.versionJsonUrl, '获取fabric元数据', '获取失败', f => f.saveToFile(this.versionJsonPath));
		}
		
		
		
		this.versionJson = JSON.parse(fs.readFileSync(this.versionJsonPath, 'utf8'));
		this.minecraft.setMainClass(this.versionJson.mainClass);
		this.minecraft.setArguments(this.versionJson.arguments);
		
		for (const librarie of this.versionJson.libraries)
		{
			const librariePath = this.minecraft.getLibrariesDir(this.minecraft.generateJarPath(librarie.name));
			const librarieUrl = myUrl.resolve(librarie.url, this.minecraft.generateJarPath(librarie.name));
			
			
			this.downloads.push({'url': librarieUrl, 'path': librariePath});
			this.minecraft.setClassPath(librariePath);
		}
		
		await downloadFiles(taskWindow, this.downloads, '下载fabric依赖库');
	}
}