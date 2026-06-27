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
				'cachePath': path.posix.join("libraries", filePath),
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
		const versionPath = path.posix.join('versions', this.getFabricId(), this.getFabricId() + '.json');
		const versionsUrl = {
			'url': path.posix.join('https://meta.fabricmc.net/v2/versions/loader/', this.minecraft.version(), this.getVersion(), 'profile', 'json'),
			'path': this.minecraft.getRootDir(versionPath),
			'cachePath': versionPath,
			'title': '获取fabric元数据',
			'failure': '获取失败',
		};
		await taskDownload(task, versionsUrl);
		
		const versionData = JSON.parse(fs.readFileSync(versionsUrl.path, 'utf8'));
		const { downloads, libraries } = this.getLibraries(versionData.libraries);
		
		
		this.setLibraries(libraries);
		
		this.setMainClass(versionData.mainClass);
		this.setArguments(versionData.arguments);
		
		
		await taskDownloads(task, downloads, '下载fabric依赖库');
	}
}