const path = require('path');
const fs   = require('fs');

const Fabric    = require(path.join(__dirname, "extension-fabric.js"));
const NeoForge  = require(path.join(__dirname, "extension-neoForge.js"));
const Forge     = require(path.join(__dirname, "extension-forge.js"));
const Forge1121 = require(path.join(__dirname, "extension-forge-1.12.1.js"));

module.exports = class
{
    constructor( taskManager, minecraft )
	{
		this.downloads   = [];
		this.taskManager = taskManager;
		this.minecraft   = minecraft;
		
		this.ensureConfigExists();
	}
	
	getLibraries()
	{
		for(const librarie of this.versionJson.libraries)
		{
			if (librarie.downloads && (librarie.downloads.classifiers || librarie.downloads.artifact))
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
							this.downloads.push({
								'url': native.url,
								'path': this.minecraft.getLibrariesDir(native.path)
							});
							
							this.minecraft.setNative(this.minecraft.getLibrariesDir(native.path));
						}
					}
				}
				else
				{
					if(!librarie.rules || this.minecraft.isActionAllowed(librarie.rules, 'windows'))
					{
						this.downloads.push({
							'url': artifact.url,
							'path': this.minecraft.getLibrariesDir(artifact.path)
						});
						
						this.minecraft.setClassPath(this.minecraft.getLibrariesDir(artifact.path));
					}
				}
			}
			else
			{
				if(librarie.name) {
					this.minecraft.setClassPath(this.minecraft.getLibrariesDir(this.minecraft.generateJarPath(librarie.name)));
				}
			}
		}
	}

	getAssets()
	{
		for (const { hash } of Object.values(this.assetsJson.objects))
		{
			const hashPrefix = hash.slice(0, 2);
			const url  = `https://resources.download.minecraft.net/${hashPrefix}/${hash}`;
			const path = `${this.minecraft.getAssetsDir()}/objects/${hashPrefix}/${hash}`;
			
			
			this.downloads.push({
				'url': url,
				'path': path
			});
		}
	}
	
	
	ensureConfigExists() {
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
	
	async loadExtension(extensionType, extensionValue) {
		if (extensionType === 'fabric') {
			const fabric = new Fabric(this.taskManager, this.minecraft, extensionValue);
			await fabric.setup();
			return;
		}
		
		if (extensionType === 'forge') {
			if (this.minecraft.versionCompare('1.12.2', '>=')) {
				const forge = new Forge(this.taskManager, this.minecraft, extensionValue);
				await forge.setup();
			} else {
				const forge = new Forge1121(this.taskManager, this.minecraft, extensionValue);
				await forge.setup();
			}
			
			return;
		}
		
		if (extensionType === 'neoforge') {
			const neoForge = new NeoForge(this.taskManager, this.minecraft, extensionValue);
			await neoForge.setup();
			return;
		}
	}
	
	
	async setup() {
		const readJsonFile = async (url, path) => {
			if (!fs.existsSync(path)) {
				this.taskManager.start();
				this.taskManager.operation('正在补全我的世界');
				
				await this.taskManager.fileDownloads.add(url, path).catch((error) => {
					this.taskManager.operation('获取配置文件失败');
					this.taskManager.stop();
				});
			}
			
			return JSON.parse(fs.readFileSync(path, 'utf8'));
		};
		
		
		if (!fs.existsSync(this.minecraft.getVersionJsonPath())) {
			this.taskManager.start();
			this.taskManager.operation('正在补全我的世界');
			
			const versionManifestData = await this.taskManager.fileDownloads.add('https://launchermeta.mojang.com/mc/game/version_manifest.json').catch((error) => {
				this.taskManager.operation('获取配置文件失败');
				this.taskManager.stop();
			});
			
			const versionList = JSON.parse(versionManifestData);
			const version = versionList.versions.find(v => v.id === this.minecraft.getVersion());
			
			if (version) {
				this.versionUrl = version.url;
			} else {
				this.taskManager.operation('未找到指定版本信息');
				this.taskManager.stop();
			}
		}
		
		this.versionJson = await readJsonFile(this.versionUrl, this.minecraft.getVersionJsonPath());
		this.assetsJson  = await readJsonFile(this.versionJson.assetIndex.url, this.minecraft.getAssetsDir('indexes', `${this.versionJson.assetIndex.id}.json`));
		
		if (this.versionJson.minecraftArguments) {
			this.minecraft.setAssetIndex(this.versionJson.assetIndex.id);
			this.minecraft.setMainClass (this.versionJson.mainClass);
			this.minecraft.setArguments (this.versionJson.minecraftArguments);
		} else {
			this.minecraft.setAssetIndex(this.versionJson.assetIndex.id);
			this.minecraft.setMainClass (this.versionJson.mainClass);
			this.minecraft.setArguments (this.versionJson.arguments);
		}
		
		
		this.getLibraries();
		this.getAssets();
		
		this.downloads.unshift({
			'url': this.versionJson.downloads.client.url,
			'path': this.minecraft.getVersionJarPath(),
		});
		
		let success = 0;
		let failure = 0;
		
		for (const download of this.downloads) {
			if (!fs.existsSync(download.path)) {
				this.taskManager.start();
				this.taskManager.operation('正在补全我的世界');
				
				this.taskManager.fileDownloads.add(download.url, download.path).then(() => success++).catch(() => failure++);
			}
		}
		
		await this.taskManager.fileDownloads.waitDone();
		if (failure) {
			this.taskManager.operation(`有 ${failure} 个文件下载失败请重新尝试补全`);
			this.taskManager.stop();
		}
    }
}