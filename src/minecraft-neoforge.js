const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');
const { spawn }  = require('child_process');
const { taskDownloads, taskDownload } = load('httpSeries');


module.exports = class
{
    constructor(minecraft, version) {
		this.minecraft = minecraft;
		this.version = version;
    }
	
	
	setArguments(args) {
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
	
	
    getLibraries(librariesA, librariesB)
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
		return `https://maven.neoforged.net/releases/net/neoforged/neoforge/${this.version}/neoforge-${this.version}-installer.jar`;
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
				
				task.addEvent('operation', '安装neoforge中请稍等');
				
				
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
			await taskDownload(task, this.getLoaderUrl(), '下载neoforge安装程序', '安装程序下载失败', f => f.saveToFile(this.getLoaderPath()));
		}
		
		const admZip = new AdmZip(this.getLoaderPath());
		const installProfileEntry = admZip.getEntry('install_profile.json');
		const versionEntry = admZip.getEntry('version.json');
		
		let installProfileData;
		let versionData;
		
		if (installProfileEntry) {
			installProfileData = JSON.parse(installProfileEntry.getData().toString());
		} else {
			throw('未找到 install_profile.json 文件！');
		}
		
		if (versionEntry) {
			versionData = JSON.parse(versionEntry.getData().toString());
		} else {
			throw('未找到 version.json 文件！');
		}
		
		if (this.minecraft.version() !== installProfileData.minecraft) {
			throw('我的世界版本与neoForge版本不匹配');
		}
		
		
		const { downloads, libraries } = this.getLibraries(installProfileData.libraries, versionData.libraries);
		
		
		this.setLibraries(libraries);
		
		this.setArguments(versionData.arguments);
		this.setMainClass(versionData.mainClass);
		
		
		await taskDownloads(task, downloads, '下载neoforge依赖库');
		await this.install(task);
	}
}