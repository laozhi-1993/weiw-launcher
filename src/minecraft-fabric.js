const path = require('path');
const fs   = require('fs');
const { taskDownloads, taskDownload } = load('httpSeries');


module.exports = class
{
    constructor(minecraft, version) {
		this.minecraft = minecraft;
		this.version = version;
    }
	
	
	setMainClass(mainClass) {
		this.minecraft.mainClass(mainClass);
	}
	
	setArguments(args) {
		for(const value of args.game) {
			this.minecraft.game.add(value);
		}
		
		for(const value of args.jvm) {
			this.minecraft.jvm.add(value);
		}
	}
	
	setLibraries(libraries) {
		for(const value of libraries) {
			this.minecraft.libraries.addPath(value);
		}
	}
	
	
	getLibraries(librariesData) {
		const downloads = [];
		const libraries = [];
		
		for (const librarie of librariesData)
		{
			const filePath = this.minecraft.mavenToPath(librarie.name);
			const fileUrl  = path.posix.join(librarie.url, filePath);
			
			
			downloads.push({
				'url': fileUrl,
				'path': this.minecraft.getLibrariesDir(filePath),
			});
			
			libraries.push(filePath);
		}
		
		return { downloads, libraries };
	}
	
	getVersion() {
		return this.version;
	}
	
	getFabricId() {
		const Arror = [
			'fabric',
			'loader',
			this.minecraft.version(),
			this.getVersion(),
		];
		
		return Arror.join('-');
	}
	
	
	async setup(task)
	{
		const versionJsonUrl = path.posix.join('https://meta.fabricmc.net/v2/versions/loader/', this.minecraft.version(), this.getVersion(), 'profile', 'json');
		const versionJsonPath = this.minecraft.getVersionsDir(this.getFabricId(), this.getFabricId() + '.json');
		
		if (!fs.existsSync(versionJsonPath)) {
			await taskDownload(task, versionJsonUrl, '获取fabric元数据', '获取失败', f => f.saveToFile(versionJsonPath));
		}
		
		
		const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
		const { downloads, libraries } = this.getLibraries(versionData.libraries);
		
		
		this.setLibraries(libraries);
		
		this.setMainClass(versionData.mainClass);
		this.setArguments(versionData.arguments);
		
		
		await taskDownloads(task, downloads, '下载fabric依赖库');
	}
}