const { spawn } = require("child_process");
const path   = require("path");
const fs     = require("fs");
const AdmZip = require("adm-zip");


module.exports = class
{
    constructor(minecraft)
    {
		this.minecraft        = minecraft;
        this.width            = '854';
        this.height           = '480';
        this.launcher_name    = 'weiw-Launcher';
        this.launcher_version = '1.1.0';
		
		
        this.cmd = [];
        this.cmd.push('-XX:+UnlockExperimentalVMOptions');
        this.cmd.push('-XX:G1NewSizePercent=20');
        this.cmd.push('-XX:G1ReservePercent=20');
        this.cmd.push('-XX:MaxGCPauseMillis=50');
        this.cmd.push('-XX:G1HeapRegionSize=16m');
        this.cmd.push('-XX:+UseG1GC');
        this.cmd.push('-XX:-UseAdaptiveSizePolicy');
        this.cmd.push('-XX:-OmitStackTraceInFastThrow');
        this.cmd.push('-XX:-DontCompileHugeMethods');
    }
	
	setJVM(jvm) {
		this.cmd.push(...jvm.split(' '));
	}
	
	setAddress(server) {
		this.server = server;
	}
	
	setSize(width, height) {
        this.width  = width;
        this.height = height;
	}
	
	setAuth(route,url,prefetched)
	{
		this.cmd.push('-javaagent:'+route+'='+url);
		if(prefetched) {
			this.cmd.push('-Dauthlibinjector.yggdrasil.prefetched='+Buffer.from(prefetched).toString('base64'));
		}
	}
	
	arguments()
	{
		const args      = this.minecraft.getArguments();
		const mainClass = this.minecraft.getMainClass();
		
		if(typeof args === 'string')
		{
			this.cmd.push('-Djava.library.path=${natives_directory}');
			this.cmd.push('-Dminecraft.launcher.brand=${launcher_name}');
			this.cmd.push('-Dminecraft.launcher.version=${launcher_version}');
			this.cmd.push('-cp');
			this.cmd.push('${classpath}');
			this.cmd.push(mainClass);
			this.cmd.push(...args.split(' '));
		}
		else
		{
			for(const jvm of args.jvm)
			{
				if(typeof jvm === 'string')
				{
					this.cmd.push(jvm);
				}
				else
				{
					if (this.minecraft.isActionAllowed(jvm.rules, 'windows')) {
						if (typeof jvm.value === 'string') {
							this.cmd.push(jvm.value);
						} else {
							this.cmd.push(...jvm.value);
						}
					}
				}
			}
			
			this.cmd.push(mainClass);
			for(const game of args.game)
			{
				if(typeof game === 'string')
				{
					this.cmd.push(game);
				}
			}
		}
		
		this.cmd.push('--width');
		this.cmd.push('${resolution_width}');
		this.cmd.push('--height');
		this.cmd.push('${resolution_height}');
		
		if(this.server)
		{
			if (this.minecraft.versionCompare('1.20', '>=')) {
				this.cmd.push('--quickPlayMultiplayer');
				this.cmd.push(this.server);
			} else {
				const [address, port] = this.server.split(':');
				
				
				this.cmd.push('--server');
				this.cmd.push(address);
				this.cmd.push('--port');
				this.cmd.push(port ?? 25565);
			}
		}
	}
	
	replacePlaceholders()
	{
		const th = {};
		
        th['classpath']           = this.minecraft.classPathsToString(); //依赖库
        th['classpath_separator'] = this.minecraft.getSeparator();       //依赖库分隔符
        th['version_name']        = this.minecraft.getVersion();         //版本
        th['primary_jar_name']    = this.minecraft.getVersion()+'.jar';  //主程序名
        th['game_directory']      = this.minecraft.getRootDir();         //游戏目录
        th['assets_root']         = this.minecraft.getAssetsDir();       //游戏资源目录
        th['library_directory']   = this.minecraft.getLibrariesDir();    //library目录路径
        th['natives_directory']   = this.minecraft.getNativesDir();      //natives目录路径
        th['assets_index_name']   = this.minecraft.getAssetIndex();      //游戏资源版本
		
        th['version_type']        = this.launcher_name;              //启动器名字
        th['launcher_name']       = this.launcher_name;              //启动器名字
        th['launcher_version']    = this.launcher_version;           //启动器版本号
        th['resolution_width']    = this.width;                      //窗口宽度
        th['resolution_height']   = this.height;                     //窗口高度
        th['auth_player_name']    = this.minecraft.getUserName();    //玩家名字
        th['auth_uuid']           = this.minecraft.getUuid();        //玩家UUID
        th['auth_access_token']   = this.minecraft.getAccessToken(); //玩家令牌
        th['auth_session']        = this.minecraft.getAccessToken(); //玩家令牌
        th['user_properties']     = '{}';                            //用户属性
        th['user_type']           = 'mojang';                        //用户类型
		
		for(let index = 0; index < this.cmd.length; index++)
		{
			for(const key in th)
			{
				this.cmd[index] = this.cmd[index].split('${'+key+'}').join(th[key]);
			}
		}
	}
	
	kill()
	{
		this.process && this.process.kill()
	}
	
	
	extractNatives() {
		for (const native of this.minecraft.getNatives()) {
			if (fs.existsSync(native))
			{
				const zip = new AdmZip(native);
				zip.extractAllTo(this.minecraft.getNativesDir(), false);
			}
		}
	}
	
	
    start(onOutput)
    {
		this.arguments();
		this.replacePlaceholders();
		this.extractNatives();
		
		this.error = `"${this.minecraft.getJava()}" ${this.cmd.join(' ')}\n`;
		this.process = spawn(this.minecraft.getJava(), this.cmd);
		
		
		this.process.stdout.on('data', (data) => {
			if (data.toString().includes("Setting user:")) {
				onOutput('show');
			}
			
			onOutput(data.toString());
		});
		this.process.stderr.on('data', (data) => {
			this.error += data.toString();
			onOutput(data.toString());
		});
		
		this.process.on('exit', (code) => {
			if (code !== 0 && code !== null) {
				fs.writeFileSync('error.log', this.error);
				onOutput('exitError');
			}
			
			onOutput('exit');
		});
    }
}