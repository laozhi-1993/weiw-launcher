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
	
	
	async install(taskWindow)
	{
		const getLibraryFiles = () => {
			const librariesDir = this.minecraft.getLibrariesDir();
			const files = [];
			
			const processDirectory = (currentDir, relativePath = "") => {
				const entries = fs.readdirSync(currentDir, { withFileTypes: true });
				
				for (const entry of entries) {
					const itemRelativePath = path.posix.join(relativePath, entry.name);
					const fullPath = path.join(currentDir, entry.name);
					
					if (entry.isDirectory()) {
						processDirectory(fullPath, itemRelativePath);
					} else {
						files.push(itemRelativePath);
					}
				}
				
				return files;
			};
			
			
			return processDirectory(librariesDir);
		};
		
		const getJsonPath = () => {
			const parsed = path.parse(this.extensionPath);
			
			return path.format({
				dir: parsed.dir,
				name: parsed.name,
				ext: '.json'
			});
		};
		
		
		try {
			const json = JSON.parse(fs.readFileSync(getJsonPath(), 'utf8'));
			
			for (const librarie of json.libraries) {
				fs.statSync(this.minecraft.getLibrariesDir(librarie)).isFile();
			}
		} catch {
			await install(taskWindow, this.minecraft.getJava(), this.extensionPath, this.minecraft.getRootDir(), '安装forge中请稍等', '安装失败').then(() => {
				fs.writeFileSync(getJsonPath(), JSON.stringify({ 'libraries': getLibraryFiles() }, null, 4));
			});
		}
	}
	
	
	async setup(taskWindow)
	{
		if (!fs.existsSync(this.extensionPath)) {
			await downloadFile(taskWindow, this.extensionUrl, '下载forge安装程序', '下载失败', f => f.saveToFile(this.extensionPath));
		}
		
		this.initializeProperties();
		this.initializeLibraries();
		
		await downloadFiles(taskWindow, this.downloads, '下载forge依赖库');
		await this.install(taskWindow);
	}
}