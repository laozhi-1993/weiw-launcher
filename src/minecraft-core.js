const path = require('path');
const fs   = require('fs');
const { decode, encode } = require('nbt-ts');
const { taskDownloads, taskDownload } = load('httpSeries');


module.exports = class
{
    constructor(minecraft) {
		this.minecraft = minecraft;
	}
	
	
	setArguments(args)
	{
		if (typeof args === 'string')
		{
			this.minecraft.game.set(args.split(' '));
			
			
			this.minecraft.jvm.add('-Djava.library.path=${natives_directory}');
			this.minecraft.jvm.add('-Dminecraft.launcher.brand=${launcher_name}');
			this.minecraft.jvm.add('-Dminecraft.launcher.version=${launcher_version}');
			this.minecraft.jvm.add('-cp');
			this.minecraft.jvm.add('${classpath}');
			
			return;
		}
		
		
		for(const value of args.game) {
			if(typeof value === 'string') {
				this.minecraft.game.add(value);
			}
		}
		
		for(const value of args.jvm)
		{
			if(typeof value === 'string') {
				this.minecraft.jvm.add(value);
				continue;
			}
			
			if (this.isActionAllowed(value.rules)) {
				if (typeof value.value === 'string') {
					this.minecraft.jvm.add(value.value);
				} else {
					this.minecraft.jvm.add(...value.value);
				}
				
				continue;
			}
		}
	}
	
	setAssetIndex(id) {
		this.minecraft.assetIndex(id);
	}
	
	setMainClass(mainClass) {
		this.minecraft.mainClass(mainClass);
	}
	
	setNatives(natives) {
		for(const value of natives) {
			this.minecraft.natives.add(value);
		}
	}
	
	setLibraries(libraries) {
		for(const value of libraries) {
			this.minecraft.libraries.addPath(value);
		}
	}
	
	
	getLibraries(librariesData)
	{
		const downloads = [];
		const libraries = [];
		const natives = [];
		
		
		for(const librarie of librariesData)
		{
			const classifiers = librarie.downloads.classifiers;
			const artifact    = librarie.downloads.artifact;
			
			if (classifiers)
			{
				const os = [
					'natives-windows',
					'natives-windows-64'
				];
				
				for (const classifier of os)
				{
					const native = classifiers[classifier];
					
					if (native)
					{
						downloads.push({
							'url': native.url,
							'path': this.minecraft.getLibrariesDir(native.path),
						});
						
						natives.push(native.path);
					}
				}
				
				continue;
			}
			
			if (artifact)
			{
				if(this.isActionAllowed(librarie.rules))
				{
					downloads.push({
						'url': artifact.url,
						'path': this.minecraft.getLibrariesDir(artifact.path),
					});
					
					libraries.push(artifact.path);
				}
				
				continue;
			}
		}
		
		return { downloads, libraries, natives };
	}
	
	getAssets(objects)
	{
		const data = [];
		
		for (const [key, value] of Object.entries(objects))
		{
			const hashPrefix = value.hash.slice(0, 2);
			let assetsUrl = `https://resources.download.minecraft.net/${hashPrefix}/${value.hash}`;
			let assetsPath = this.minecraft.getAssetsDir('objects', path.posix.join(hashPrefix, value.hash));
			
			
			if (this.minecraft.versionCompare('1.6.4', '<=')) {
				assetsPath = this.minecraft.getAssetsDir(key);
			}
			
			data.push({
				'url': assetsUrl,
				'path': assetsPath,
			});
		}
		
		return data;
	}
	
	getFileJson(FilePath) {
		return JSON.parse(fs.readFileSync(FilePath, 'utf8'));
	}
	
	
	isActionAllowed(rules)
	{
		if (!rules) {
			return true;
		}
		
		let osName = 'windows';
		let allowed = false;
		
		for (const rule of rules)
		{
			if (rule.os)
			{
				if (rule.os.name === osName)
				{
					if (rule.action === "allow")    return true;
					if (rule.action === "disallow") return false;
				}
				
				continue;
			}
			
			if (rule.action === "allow")
			{
				allowed = true;
				continue;
			}
			
			if (rule.action === "disallow")
			{
				allowed = false;
				continue;
			}
		}
		
		return allowed;
	}
	
	
	generateServers(servers) {
		const rootDir = this.minecraft.getRootDir();
		const serversPath = this.minecraft.getRootDir('servers.dat');
		const data = {
			'servers': []
		};
		
		if (servers) {
			for(const server of servers) {
				data.servers.push({
					'name': server.name,
					'ip': server.address+':'+server.port,
				});
			}
			
			if (!fs.existsSync(rootDir)) {
				fs.mkdirSync(rootDir, { recursive: true });
			}
			
			fs.writeFileSync(serversPath, encode('root', data));
			return this;
		}
		
		if (fs.existsSync(serversPath)) {
			const buffer = fs.readFileSync(serversPath);
			const nbtData = decode(buffer);
			
			return nbtData.value;
		} else {
			return data;
		}
	}
	
	
	generateConfig()
	{
		const optionsPath          = this.minecraft.getRootDir('options.txt');
		const launcherProfilesPath = this.minecraft.getRootDir('launcher_profiles.json');


		const writeFileIfNotExists = (filePath, content) => {
			if (!fs.existsSync(filePath)) {
				fs.writeFileSync(filePath, content);
			}
		};

		if(!fs.existsSync(this.minecraft.getRootDir())) {
			fs.mkdirSync(this.minecraft.getRootDir(), { recursive: true });
		}
		
		writeFileIfNotExists(optionsPath, 'lang:zh_CN');
		writeFileIfNotExists(launcherProfilesPath, JSON.stringify({
			selectedProfile: "(Default)",
			profiles: {
				"(Default)": { name: "(Default)" }
			},
			clientToken: "88888888-8888-8888-8888-888888888888"
		}));
	}
	
	
	async setup(task)
	{
		if (!fs.existsSync(this.minecraft.getVersionJsonPath()))
		{
			let versionList;
			let version;
			
			await taskDownload(task, 'https://launchermeta.mojang.com/mc/game/version_manifest.json', '获取版本清单', '获取版本清单失败', async (f) => {
				versionList = f.dataToJson();
				version = versionList.versions.find(v => v.id === this.minecraft.version());
			});
			
			if (version) {
				await taskDownload(task, version.url, '获取版本元数据', '获取版本元数据失败', f => f.saveToFile(this.minecraft.getVersionJsonPath()));
			}
			else throw('未找到指定版本的元数据');
		}
		
		const versionData = this.getFileJson(this.minecraft.getVersionJsonPath());
		const assetsJsonPath = this.minecraft.getAssetsDir('indexes', versionData.assetIndex.id + '.json');
		
		if (!fs.existsSync(assetsJsonPath)) {
			await taskDownload(task, versionData.assetIndex.url, '获取资源清单文件', '获取资源清单文件失败', f => f.saveToFile(assetsJsonPath));
		}
		
		const assetsData = this.getFileJson(assetsJsonPath);
		const assets = this.getAssets(assetsData.objects);
		
		
		const { downloads, libraries, natives } = this.getLibraries(versionData.libraries);		
		
		
		this.setNatives(natives);
		this.setLibraries(libraries);
		
		this.setMainClass(versionData.mainClass);
		this.setAssetIndex(versionData.assetIndex.id);
		this.setArguments(versionData.arguments ?? versionData.minecraftArguments);
		
		if (!fs.existsSync(this.minecraft.getVersionJarPath())) {
			await taskDownload(task, versionData.downloads.client.url, '下载我的世界主程序', '下载我的世界主程序失败', f => f.saveToFile(this.minecraft.getVersionJarPath()));
		}
		
		
		await taskDownloads(task, assets, '下载资源文件');
		await taskDownloads(task, downloads, '下载依赖库');
    }
}