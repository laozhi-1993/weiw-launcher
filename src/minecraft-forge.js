const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');
const { spawn } = require('child_process');
const { taskDownloads, taskDownload } = load('httpSeries');


module.exports = class
{
    constructor(minecraft, version) {
		this.minecraft = minecraft;
		this.version = version;
    }
	
	
	setArguments(args) {
		if (typeof args === 'string') {
			this.minecraft.game.set(args.split(' '));
			return;
		}
		
		for(const value of args.game) {
			this.minecraft.game.add(value);
		}
		
		for(const value of args.jvm) {
			this.minecraft.jvm.add(value);
		}
	}
	
	setMainClass(mainClass) {
		this.minecraft.mainClass(mainClass);
	}
	
	setLibraries(libraries) {
		for(const value of libraries) {
			this.minecraft.libraries.addPath(value);
		}
	}
	
	
    getLibrariesV1(librariesData, install)
	{
		const downloads = [];
		const libraries = [];
		
		const resolveFilename = function(baseUrl, newFilename) {
			return path.posix.join(path.dirname(baseUrl), newFilename);
		}
		
		for (const librarie of librariesData)
		{
			let filePath = this.minecraft.mavenToPath(librarie.name);
			let fileUrl = path.posix.join(librarie.url ?? 'https://libraries.minecraft.net/', filePath);
			
			
			if (librarie.name === install.path) {
				fileUrl = resolveFilename(fileUrl, install.filePath);
			}
			
			downloads.push({
				'url':  fileUrl,
				'path': this.minecraft.getLibrariesDir(filePath),
			});
			
			libraries.push(filePath);
		}
		
		return { downloads, libraries };
	}
	
    getLibrariesV2(librariesA, librariesB)
	{
		const downloads = [];
		const libraries = [];
		
		for (const librarie of librariesA) {
			const fileUrl = librarie.downloads.artifact.url;
			const filePath = librarie.downloads.artifact.path;
			
			if (fileUrl) {
				downloads.push({
					'url':  fileUrl,
					'path': this.minecraft.getLibrariesDir(filePath),
				});
			}
		}
		
		for (const librarie of librariesB) {
			const fileUrl = librarie.downloads.artifact.url;
			const filePath = librarie.downloads.artifact.path;
			
			if (fileUrl) {
				downloads.push({
					'url':  fileUrl,
					'path': this.minecraft.getLibrariesDir(filePath),
				});
			}
			
			libraries.push(filePath);
		}
		
		return { downloads, libraries };
	}
	
	getLoaderUrl() {
		return `https://maven.minecraftforge.net/net/minecraftforge/forge/${this.version}/forge-${this.version}-installer.jar`;
	}
	
	getLoaderPath() {
		return this.minecraft.getRootDir(path.basename(this.getLoaderUrl()));
	}
	
	
	install(task)
	{
		const getJsonPath = () => {
			const parsed = path.parse(this.getLoaderPath());
			
			return path.format({
				dir: parsed.dir,
				name: parsed.name,
				ext: '.json'
			});
		};
		
		const SaveJsonFile = () => {
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
			
			
			fs.writeFileSync(getJsonPath(), JSON.stringify({ 'libraries': processDirectory(librariesDir) }, null, 4));
		};
		
		
		try
		{
			const json = JSON.parse(fs.readFileSync(getJsonPath(), 'utf8'));
			
			for (const librarie of json.libraries) {
				fs.statSync(this.minecraft.getLibrariesDir(librarie)).isFile();
			}
		}
		catch
		{
			return task.start('html/task_install.html', (resolve, reject) => {
				
				task.sendEvent('operation', '安装forge中请稍等');
				
				
				const result = spawn(this.minecraft.java(), [ '-jar', this.getLoaderPath(), '--installClient', '.' ], {cwd: this.minecraft.getRootDir()});
				
				result.on('exit', (code) => {
					if (code === 0) {
						SaveJsonFile();
						resolve(code);
					} else {
						reject('安装失败');
					}
				});
				
				result.stdout.on('data', () => {});
				result.stderr.on('data', () => {});
				
				return function() {
					result.kill();
				}
			});
		}
	}
	
	
	async setup(task)
	{
		if (!fs.existsSync(this.getLoaderPath())) {
			await taskDownload(task, this.getLoaderUrl(), '下载forge安装程序', '下载失败', f => f.saveToFile(this.getLoaderPath()));
		}
		
		const admZip = new AdmZip(this.getLoaderPath());
		const installProfileEntry = admZip.getEntry('install_profile.json');
		const versionEntry = admZip.getEntry('version.json');
		
		let installProfileData;
		
		if (installProfileEntry) {
			installProfileData = JSON.parse(installProfileEntry.getData().toString());
		} else {
			throw('未找到 install_profile.json 文件！');
		}
		
		if (this.minecraft.version() !== (installProfileData.minecraft ?? installProfileData.install.minecraft)) {
			throw('我的世界版本与forge版本不匹配');
		}
		
		
		if (versionEntry)
		{
			const versionData = JSON.parse(versionEntry.getData().toString());
			const { downloads, libraries } = this.getLibrariesV2(installProfileData.libraries, versionData.libraries);
			
			
			this.setLibraries(libraries);
			
			this.setArguments(versionData.arguments ?? versionData.minecraftArguments);
			this.setMainClass(versionData.mainClass);
			
			
			await taskDownloads(task, downloads, '下载forge依赖库');
			await this.install(task);
		}
		else
		{
			const { downloads, libraries } = this.getLibrariesV1(installProfileData.versionInfo.libraries, installProfileData.install);
			
			
			this.setLibraries(libraries);
			
			this.setArguments(installProfileData.versionInfo.minecraftArguments);
			this.setMainClass(installProfileData.versionInfo.mainClass);
			
			
			await taskDownloads(task, downloads, '下载forge依赖库');
		}
	}
}