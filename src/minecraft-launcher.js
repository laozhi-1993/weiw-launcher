const { spawn } = require("child_process");
const path = require("path");
const fs   = require("fs");


module.exports = class
{
    constructor(minecraft) {
		this.minecraft = minecraft;
		this.process = null;
		this.error = [];
    }
	
	addError(...value) {
		this.error.push(...value);
		return this;
	}
	
	getError() {
		return this.error.join('');
	}
	
	generateRunFile() {
		const text = [];
		
		text.push('@echo off');
		text.push('');
		text.push('chcp 65001 > nul');
		text.push('cd '+this.minecraft.getRootDir());
		text.push('');
		text.push('');
		text.push(this.minecraft.launchArgs().getCommand());
		text.push('');
		text.push('');
		text.push('echo 游戏已退出。');
		text.push('pause');
		
		fs.writeFileSync('run.bat', text.join('\r\n'));
		return this;
	}
	
	kill() {
		this.process && this.process.kill();
		return this;
	}
	
    start(onOutput)
    {
		this.minecraft.natives.extract();
		this.process = spawn(this.minecraft.java(), this.minecraft.launchArgs().get(), {cwd: this.minecraft.getRootDir()});
		
		
		this.process.stdout.on('data', (data) => {
			if (data.toString().includes("Setting user:")) {
				onOutput('show');
			}
			
			onOutput(data.toString());
		});
		
		this.process.stderr.on('data', (data) => {
			this.addError(data.toString());
			onOutput(data.toString());
		});
		
		this.process.on('exit', (code) => {
			if (code !== 0 && code !== null) {
				fs.writeFileSync('error.log', this.getError());
				onOutput('exitError');
			}
			
			onOutput('exit');
		});
		
		return this;
    }
}