const {spawn,execFile} = require("child_process");
const https            = require('https');
const http             = require('http');
const fs               = require('fs');


module.exports = class
{
    constructor(root,java,versions,xmn,xmx)
    {
        this.root          = root;
        this.java          = java;
        this.versions      = versions;
        this.versions_jar  = `${root}\\.minecraft\\versions\\${versions}\\${versions}.jar`;
        this.versions_json = `${root}\\.minecraft\\versions\\${versions}\\${versions}.json`;
        this.cmd           = `-Xmn${xmn}m -Xmx${xmx}m`;
        this.cmd           += ' -XX:+UnlockExperimentalVMOptions';
        this.cmd           += ' -XX:G1NewSizePercent=20';
        this.cmd           += ' -XX:G1ReservePercent=20';
        this.cmd           += ' -XX:MaxGCPauseMillis=50';
        this.cmd           += ' -XX:G1HeapRegionSize=16m';
        this.cmd           += ' -XX:+UseG1GC';
        this.cmd           += ' -XX:-UseAdaptiveSizePolicy';
        this.cmd           += ' -XX:-OmitStackTraceInFastThrow';
        this.cmd           += ' -XX:-DontCompileHugeMethods';
        this.json          = JSON.parse(fs.readFileSync(this.versions_json,'utf-8'));


        this.username         = 'laozhi';
        this.uuid             = 'be2c077954673b69865a1633750d0eaa';
        this.token            = 'be2c077954673b69865a1633750d0eaa';
        this.width            = '854';
        this.height           = '480';
        this.launcher_name    = 'weiw-Launcher';
        this.launcher_version = '1.0.0';
        this.fullscreen       = false;
        this.server           = '';
        this.port             = '';
        this.auth_route       = '';
        this.auth_url         = '';


        this.auth = function (route,url,prefetched)
        {
            this.cmd += ' -javaagent:${root}\\'+route+'='+url;
            this.cmd += ' -Dauthlibinjector.yggdrasil.prefetched='+Buffer.from(prefetched).toString('base64');
        }
    
        this.game = function ()
        {
            if(typeof this.json['minecraftArguments'] != 'undefined')
            {
                this.cmd += ' -Djava.library.path=${natives_directory}';
                this.cmd += ' -Dminecraft.launcher.brand=${launcher_name}';
                this.cmd += ' -Dminecraft.launcher.version=${launcher_version}';
                this.cmd += ' -cp ${classpath}';
                this.cmd += ' '+this.json['mainClass'];
                this.cmd += ' '+this.json['minecraftArguments'];
            }
            else
            {
                for(var value of this.json['arguments']['jvm'])
                {
                    if(typeof value == 'object')
                    {
                        //??????
                    }
                    else
                    {
                        this.cmd += ' '+value;
                    }
                }
        
                this.cmd += ' '+this.json['mainClass'];
            }
    
            if(typeof this.json['arguments'] != 'undefined' && typeof this.json['arguments']['game'] != 'undefined')
            {
                for(var value of this.json['arguments']['game'])
                {
                    if(typeof value != 'object')
                    {
                        this.cmd += ' '+value;
                    }
                }
            }
    
            this.cmd += ' --width';
            this.cmd += ' ${resolution_width}';
            this.cmd += ' --height';
            this.cmd += ' ${resolution_height}';

            if(this.fullscreen)
            {
                this.cmd += ' --fullscreen';
            }

            if(this.server != "" && this.port != "")
            {
                this.cmd += ' --server';
                this.cmd += ' '+this.server;
                this.cmd += ' --port';
                this.cmd += ' '+this.port;
            }
        }

        this.libraries = function (library_directory,classpath_separator)
        {
            var libraries = '';
            for(var value of this.json['libraries'])
            {
                if(typeof value['downloads'] != 'undefined' && typeof value['downloads']['classifiers'] != 'undefined')
                {
                    //??????
    
    
                    
                }
                else if(typeof value['downloads'] != 'undefined' && typeof value['downloads']['artifact'] != 'undefined')
                {
                    if(typeof value['rules'] != 'undefined')
                    {
                        if(typeof value['downloads']['artifact']['path'] != 'undefined' && typeof value['rules'][0] != 'undefined' && typeof value['rules'][0]['os'] != 'undefined' && typeof value['rules'][0]['os']['name'] != 'undefined' && value['rules'][0]['os']['name'] == 'windows' || typeof value['rules'][1] != 'undefined')
                        {
                            libraries += library_directory+'\\'+value['downloads']['artifact']['path']+classpath_separator;
                        }
                    }
                    else
                    {
                        if(typeof value['downloads']['artifact']['path'] != 'undefined')
                        {
                            libraries += library_directory+'\\'+value['downloads']['artifact']['path']+classpath_separator;
                        }
                    }
                }
                else
                {
                    if(typeof value['name'] != 'undefined')
                    {
                        var n = value['name'].split(':');
                        if(typeof n[3] != 'undefined')
                        {
                            libraries += library_directory+'\\'+n[0].replace(/\./g,'\\')+'\\'+n[1]+'\\'+n[2]+'\\'+n[1]+'-'+n[2]+'-'+n[3]+'.jar'+classpath_separator;
                        }
                        else
                        {
                            libraries += library_directory+'\\'+n[0].replace(/\./g,'\\')+'\\'+n[1]+'\\'+n[2]+'\\'+n[1]+'-'+n[2]+'.jar'+classpath_separator;
                        }
                    }
                }
            }
    
            libraries += this.versions_jar;
            return libraries;
        }
    }

    start(output,success,exit)
    {
        var thiss = this;
        var th = {};
        th['auth_player_name']    = this.username;                                                                 //????????????
        th['auth_uuid']           = this.uuid;                                                                     //??????UUID
        th['auth_access_token']   = this.token;                                                                    //????????????
        th['auth_session']        = this.token;                                                                    //????????????
        th['root']                = this.root;                                                                     //?????????
        th['game_directory']      = this.root+'\\.minecraft';                                                      //????????????
        th['assets_root']         = this.root+'\\.minecraft\\assets';                                              //??????????????????
        th['version_name']        = this.versions;                                                                 //????????????
        th['assets_index_name']   = this.json['assetIndex']['id'];                                                 //??????????????????
        th['user_properties']     = '{}';                                                                          //????????????
        th['user_type']           = 'mojang';                                                                      //????????????
        th['version_type']        = this.launcher_name;                                                            //???????????????
        th['resolution_width']    = this.width;                                                                    //??????????????????
        th['resolution_height']   = this.height;                                                                   //??????????????????
        th['natives_directory']   = this.root+'\\.minecraft\\versions\\'+this.versions+'\\natives-windows-x86_64'; //natives????????????
        th['library_directory']   = this.root+'\\.minecraft\\libraries';                                           //library????????????
        th['launcher_name']       = this.launcher_name;                                                            //???????????????
        th['launcher_version']    = this.launcher_version;                                                         //??????????????????
        th['classpath_separator'] = ';';                                                                           //????????????????????????
        th['classpath']           = this.libraries(th['library_directory'],th['classpath_separator']);             //???????????????
        th['primary_jar_name']    = this.versions+'.jar';                                                          //????????????


        var cmd = function (res)
        {
            let rawData = "";
            res.on("data", (chunk) => {
                rawData += chunk;
            });
            res.on("end", () => {
                thiss.auth(thiss.auth_route,thiss.auth_url,rawData);
                thiss.game();
                
                var str = JSON.stringify(thiss.cmd.split(' '));
                for(var key in th)
                {
                    th[key] = th[key].replace(/\\/g,'\\\\');
                    th[key] = th[key].replace(/"/g,'\\"');
                    str = str.replace(new RegExp('\\${'+key+'}','g'),th[key]);
                }
                
                
                var c = spawn(thiss.java,JSON.parse(str));
                c.stdout.on('data', function (data) {
                    if(success && data.toString().indexOf("Setting user:") != -1)
                    {
                        success();
                    }
                    if(output) output('STDOUT',data.toString());
                });
                c.stderr.on('data', function (data) {
                    if(output) output('ERROR',data.toString());
                });
                c.on('exit', function (exitCode) {
                    if(exit) exit(exitCode);
                });
            });
        }

        var error = function (e){
            if(output) output('ERROR',e.message);            
        }

        if(thiss.auth_url.search('https') === 0)
        {
            https.get(thiss.auth_url, cmd).on('error', error);
        }
        else
        {
            http.get(thiss.auth_url, cmd).on('error', error);
        }
    }
}