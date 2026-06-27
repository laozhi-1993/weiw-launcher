const path = require('path');
const fs   = require('fs');
const { decode, encode } = require('nbt-ts');
const { taskDownloads, taskDownloadAssets, taskDownload } = load('httpSeries');


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
							'cachePath': path.posix.join("libraries", native.path),
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
						'cachePath': path.posix.join("libraries", artifact.path),
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
			let Url = `https://resources.download.minecraft.net/${hashPrefix}/${value.hash}`;
			let Path = this.minecraft.getAssetsDir('objects', hashPrefix, value.hash);
			let cachePath = path.posix.join('assets', 'objects', hashPrefix, value.hash);
			
			
			if (this.minecraft.versionCompare('1.7.2', '<=')) {
				assetsPath = this.minecraft.getAssetsDir(key);
			}
			
			data.push({
				'url': Url,
				'path': Path,
				'cachePath': cachePath,
			});
		}
		
		return data;
	}
	
	readFileJson(FilePath) {
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
	
	
	cleanMods(mods)
	{
		if (!mods) return;
		
		// 把白名单全部转小写，便于忽略大小写比较
		const allowedSet = new Set(
			mods.map(name => name.toLowerCase())
		);

		const currentDir = this.minecraft.getRootDir("mods");

		try {
			const entries = fs.readdirSync(currentDir, { withFileTypes: true });
			
			try {
				for (const entry of entries) {
					if (!entry.isFile()) continue;

					const filename = entry.name;
					const lowerName = filename.toLowerCase();

					// 只处理 .jar 文件
					if (!lowerName.endsWith('.jar')) continue;

					if (!allowedSet.has(lowerName)) {
						fs.unlinkSync(path.join(currentDir, filename));
					}
				}
			} catch (err) {
				throw('检查模组失败：' + err.message);
			}
		} catch {}
	}
	
	
	async setup(task)
	{
		const versionJsonPath = path.posix.join('versions', this.minecraft.version(), this.minecraft.version() + '.json');
		const versionJsonJar  = path.posix.join('versions', this.minecraft.version(), this.minecraft.version() + '.jar' );
		
		if (!fs.existsSync(this.minecraft.getRootDir(versionJsonPath)))
		{
			const versionsUrl = {
				'url': 'https://launchermeta.mojang.com/mc/game/version_manifest.json',
				'title': '获取版本清单',
				'failure': '获取版本清单失败',
			};
			const versionList = await taskDownload(task, versionsUrl);
			const version = versionList.versions.find(v => v.id === this.minecraft.version());
			
			if (!version) {
				throw('未找到指定版本的元数据');
			}
			
			const versionUrl = {
				'url': version.url,
				'path': this.minecraft.getRootDir(versionJsonPath),
				'cachePath': versionJsonPath,
				'title': '获取版本元数据',
				'failure': '获取版本元数据失败',
			};
			await taskDownload(task, versionUrl);
		}
		
		const versionData = this.readFileJson(this.minecraft.getRootDir(versionJsonPath));
		const assetsJsonPath = this.minecraft.getAssetsDir('indexes', versionData.assetIndex.id + '.json');
		const assetsCachePath = path.posix.join('assets', 'indexes', versionData.assetIndex.id + '.json');
		const assetsUrl = {
			'url': versionData.assetIndex.url,
			'path': assetsJsonPath,
			'cachePath': assetsCachePath,
			'title': '获取资源清单文件',
			'failure': '获取资源清单文件失败',
		};
		await taskDownload(task, assetsUrl);
		
		const assetsData = this.readFileJson(assetsJsonPath);
		const assets = this.getAssets(assetsData.objects);
		const { downloads, libraries, natives } = this.getLibraries(versionData.libraries);		
		
		
		this.setNatives(natives);
		this.setLibraries(libraries);
		
		this.setMainClass(versionData.mainClass);
		this.setAssetIndex(versionData.assetIndex.id);
		this.setArguments(versionData.arguments ?? versionData.minecraftArguments);
		
		
		const mainUrl = {
			'url': versionData.downloads.client.url,
			'path': this.minecraft.getRootDir(versionJsonJar),
			'cachePath': versionJsonJar,
			'title': '下载我的世界主程序',
			'failure': '下载我的世界主程序失败',
		};
		await taskDownload(task, mainUrl);
		await taskDownloads(task, assets, '下载资源文件', 'html/task_download_assets.html');
		await taskDownloads(task, downloads, '下载依赖库');
    }
}