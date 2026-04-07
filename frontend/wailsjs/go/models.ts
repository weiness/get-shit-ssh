export namespace ssh {

	export class FileInfo {
		name: string;
		path: string;
		size: number;
		mode: string;
		isDir: boolean;
		modTime: number;

		static createFrom(source: any = {}) {
			return new FileInfo(source);
		}

		constructor(source: any = {}) {
			if ('string' === typeof source) source = JSON.parse(source);
			this.name = source["name"];
			this.path = source["path"];
			this.size = source["size"];
			this.mode = source["mode"];
			this.isDir = source["isDir"];
			this.modTime = source["modTime"];
		}
	}

}

export namespace store {

	export class KeyInfo {
		id: string;
		name: string;
		publicKey: string;
		createdAt: number;

		static createFrom(source: any = {}) {
			return new KeyInfo(source);
		}

		constructor(source: any = {}) {
			if ('string' === typeof source) source = JSON.parse(source);
			this.id = source["id"];
			this.name = source["name"];
			this.publicKey = source["publicKey"];
			this.createdAt = source["createdAt"];
		}
	}

	export class Host {
	    id: string;
	    name: string;
	    groupName: string;
	    host: string;
	    port: number;
	    username: string;
	    authType: string;
	    secret: number[];
	    keyId: string;
	    createdAt: number;
	    updatedAt: number;

	    static createFrom(source: any = {}) {
	        return new Host(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.groupName = source["groupName"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.username = source["username"];
	        this.authType = source["authType"];
	        this.secret = source["secret"];
	        this.keyId = source["keyId"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}
