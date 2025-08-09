const path   = require('path');
const fs     = require('fs');
const AdmZip = require("adm-zip");


module.exports = class
{
    constructor(rootDir)
	{
        this._rootDir = rootDir;
		
		
		this.jvm       = new module.exports.Jvm(this);
		this.game      = new module.exports.Game(this);
		this.libraries = new module.exports.Libraries(this);
		this.natives   = new module.exports.natives(this);
		
		
		this._launcherName    = null;
		this._launcherVersion = null;
		this._java            = null;
        this._version         = null;
        this._uuid            = null;
        this._userName        = null;
        this._accessToken     = null;
		this._assetIndex      = null;
		this._mainClass       = null;
		
		
		this._versionsDir  = this.getRootDir('versions');
		this._assetsDir    = this.getRootDir('assets');
		this._librariesDir = this.getRootDir('libraries');
	}
	
	
	
	static Jvm = class
	{
		constructor(parent) {
			this._parent = parent;
			this._data = [];
		}
		
		parent() {
			return this._parent;
		}
		
		get() {
			return this._data;
		}
		
		set(value) {
			this._data = value;
			return this;
		}
		
		add(value) {
			this._data.push(value);
			return this;
		}
		
		
		auth(route,url,prefetched)
		{
			this.add('-javaagent:'+route+'='+url);
			if(prefetched) {
				this.add('-Dauthlibinjector.yggdrasil.prefetched='+Buffer.from(prefetched).toString('base64'));
			}
			
			return this;
		}
	}
	
	static Game = class
	{
		constructor(parent) {
			this._parent = parent;
			this._data = [];
		}
		
		parent() {
			return this._parent;
		}
		
		get() {
			return this._data;
		}
		
		set(value) {
			this._data = value;
			return this;
		}
		
		add(value) {
			this._data.push(value);
			return this;
		}
		
		
		fullscreen() {
			this.add('--fullscreen');
			return this;
		}
		
		size(width, height)
		{
			this.add('--width');
			this.add(width);
			this.add('--height');
			this.add(height);
			
			return this;
		}
		
		address(address)
		{
			if (this.parent().versionCompare('1.20', '>=')) {
				this.add('--quickPlayMultiplayer');
				this.add(address);
			} else {
				const [server, port] = address.split(':');
				
				
				this.add('--server');
				this.add(server);
				this.add('--port');
				this.add(port ?? 25565);
			}
			
			return this;
		}
	}
	
	static Libraries = class
	{
		constructor(parent) {
			this._parent = parent;
			this._data = [];
		}
		
		parent() {
			return this._parent;
		}
		
		get() {
			return this._data;
		}
		
		set(value) {
			this._data = value;
			return this;
		}
		
		add(value) {
			this._data.push(value);
			return this;
		}
		
		
		getString() {
			const newArror = this.get().map(item => {
				return this.parent().resolvePath('${library_directory}', item);
			});
			
			return newArror.concat(this.parent().getVersionJarPath()).join('${classpath_separator}');
		}
		
		addPath(mavenPath)
		{
			const DirectoryA = path.dirname(path.dirname(mavenPath));
			const DirectoryB = path.dirname(mavenPath);
			
			
			const newArror = this.get().filter((item) => {
				const A = path.dirname(path.dirname(item));
				const B = path.dirname(item);
				
				if (item === mavenPath) {
					return false;
				}
				
				if (DirectoryB === B) {
					return true;
				}
				
				if (DirectoryA === A) {
					return false;
				}
				
				return true;
			});
			
			
			return this.set([...newArror, mavenPath]);
		}
	}
	
	static natives = class
	{
		constructor(parent) {
			this._parent = parent;
			this._data = [];
		}
		
		parent() {
			return this._parent;
		}
		
		get() {
			return this._data;
		}
		
		set(value) {
			this._data = value;
			return this;
		}
		
		add(value) {
			this._data.push(value);
			return this;
		}
		
		
		extract() {
			for (const native of this.get()) {
				const nativePath = this.parent().getLibrariesDir(native);
				
				if (fs.existsSync(nativePath)) {
					const zip = new AdmZip(nativePath);
					zip.extractAllTo(this.parent().getNativesDir(), false);
				}
			}
			
			return this;
		}
	}
	
	static Args = class
	{
		constructor(parent) {
			this._parent = parent;
			this._data = [];
		}
		
		parent() {
			return this._parent;
		}
		
		get() {
			return this._data;
		}
		
		set(value) {
			this._data = value;
			return this;
		}
		
		add(value) {
			this._data.push(value);
			return this;
		}
		
		
		interpolate(search,replace) {
			this.get().forEach((item, index, Arror) => {
				Arror[index] = String(item).split(search).join(replace);
			});
			
			return this;
		}
		
		getCommand() {
			const args = [this.parent().java(), ...this.get()];
			
			args.forEach((item, index, Arror) => {
				if (item.includes(' ')) {
					Arror[index] = '"'+item+'"';
				}
			});
			
			return args.join(' ');
		}
	}
	
	
	
	mavenToPath(name)
	{
		const [gav, extension] = name.split('@');
		const [groupId, ...tail] = gav.split(':');
		
		const filename = tail.join('-')+'.'+(extension ?? 'jar');
		const paths = groupId.split('.');
		
		paths.push(tail[0]);
		paths.push(tail[1]);
		paths.push(filename);
		
		
		return paths.join('/');
	}
	
	resolvePath() {
		return path.join(...arguments).replace(/\\/g, '/');
	}
	
	
	
	versionCompare(version, operator = '==')
	{
		// 辅助函数：将版本号字符串解析为数组，每部分转换为数字
		const parseVersion = (version) => {
			return version.split('.').map((v) => parseInt(v, 10) || 0);
		};

		const v1Parts = parseVersion(this.version());
		const v2Parts = parseVersion(version);

		const maxLength = Math.max(v1Parts.length, v2Parts.length);

		for (let i = 0; i < maxLength; i++) {
			const part1 = v1Parts[i] || 0;
			const part2 = v2Parts[i] || 0;

			if (part1 > part2) {
				return operator === '>' || operator === '>=' || operator === '!=';
			}

			if (part1 < part2) {
				return operator === '<' || operator === '<=' || operator === '!=';
			}
		}

		// 如果所有部分都相等，版本号相等
		if (operator === '==' || operator === '<=' || operator === '>=') {
			return true;
		}

		if (operator === '!=' || operator === '<' || operator === '>') {
			return false;
		}

		throw new Error(`无效的操作符: ${operator}`);
	}
	
	launchArgs()
	{
		const args = new module.exports.Args(this);
		
		for(const value of this.jvm.get()) {
			args.add(value);
		}
		
		args.add(this.mainClass());
		
		for(const value of this.game.get()) {
			args.add(value);
		}
		
		
		args.interpolate('${classpath}',           this.libraries.getString()); //依赖库
		args.interpolate('${classpath_separator}', this.getSeparator());        //依赖库分隔符
		args.interpolate('${primary_jar_name}',    this.getMainJarName());      //主程序名
		args.interpolate('${version_name}',        this.version());             //游戏版本
		args.interpolate('${game_directory}',      this.getRootDir());          //游戏目录
		args.interpolate('${library_directory}',   this.getLibrariesDir());     //libraries目录路径
		args.interpolate('${natives_directory}',   this.getNativesDir());       //natives目录路径
		args.interpolate('${game_assets}',         this.getAssetsDir());        //游戏资源目录
		args.interpolate('${assets_root}',         this.getAssetsDir());        //游戏资源目录
		args.interpolate('${assets_index_name}',   this.assetIndex());          //游戏资源版本
		
		args.interpolate('${version_type}',     this.launcherName());    //启动器名字
		args.interpolate('${launcher_name}',    this.launcherName());    //启动器名字
		args.interpolate('${launcher_version}', this.launcherVersion()); //启动器版本号
		
		args.interpolate('${auth_player_name}',  this.userName());    //玩家名字
		args.interpolate('${auth_uuid}',         this.uuid());        //玩家UUID
		args.interpolate('${auth_access_token}', this.accessToken()); //玩家令牌
		args.interpolate('${auth_session}',      this.accessToken()); //玩家令牌
		
		args.interpolate('${user_properties}', '{}'); //用户属性
		args.interpolate('${user_type}', 'msa');      //用户类型
		
		return args;
	}
	
	
	
	launcherName(value) {
		if (value) {
			this._launcherName = value;
			return this;
		}
		
		return this._launcherName;
	}
	
	launcherVersion(value) {
		if (value) {
			this._launcherVersion = value;
			return this;
		}
		
		return this._launcherVersion;
	}
	
	java(value) {
		if (value) {
			this._java = value;
			return this;
		}
		
		return this._java;
	}
	
	version(value) {
		if (value) {
			this._version = value;
			return this;
		}
		
		return this._version;
	}
	
	uuid(value) {
		if (value) {
			this._uuid = value;
			return this;
		}
		
		return this._uuid;
	}
	
	userName(value) {
		if (value) {
			this._userName = value;
			return this;
		}
		
		return this._userName;
	}
	
	accessToken(value) {
		if (value) {
			this._accessToken = value;
			return this;
		}
		
		return this._accessToken;
	}
	
	mainClass(value) {
		if (value) {
			this._mainClass = value;
			return this;
		}
		
		return this._mainClass;
	}
	
	assetIndex(value) {
		if (value) {
			this._assetIndex = value;
			return this;
		}
		
		return this._assetIndex;
	}
	
	
	
	setVersionsDir(value) {
		this._versionsDir = value;
		return this;
	}
	setAssetsDir(value) {
		this._assetsDir = value;
		return this;
	}
	setLibrariesDir(value) {
		this._librariesDir = value;
		return this;
	}
	
	getSeparator() {
		return path.delimiter;
	}
	getMainJarName() {
		return path.basename(this.getVersionJarPath());
	}
	getNativesDir() {
		return this.getVersionsDir(this.version(), 'natives', ...arguments);
	}
	getVersionJarPath() {
		return this.getVersionsDir(this.version(), `${this.version()}.jar`);
	}
	getVersionJsonPath() {
		return this.getVersionsDir(this.version(), `${this.version()}.json`);
	}
	
	getRootDir()      { return this.resolvePath(this._rootDir,      ...arguments) }
	getVersionsDir()  { return this.resolvePath(this._versionsDir,  ...arguments) }
	getAssetsDir()    { return this.resolvePath(this._assetsDir,    ...arguments) }
	getLibrariesDir() { return this.resolvePath(this._librariesDir, ...arguments) }
}