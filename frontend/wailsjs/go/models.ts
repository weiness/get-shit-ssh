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
	    ID: string;
	    Name: string;
	    GroupName: string;
	    Host: string;
	    Port: number;
	    Username: string;
	    AuthType: string;
	    Secret: number[];
	    KeyID: string;
	    CreatedAt: number;
	    UpdatedAt: number;

	    static createFrom(source: any = {}) {
	        return new Host(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Name = source["Name"];
	        this.GroupName = source["GroupName"];
	        this.Host = source["Host"];
	        this.Port = source["Port"];
	        this.Username = source["Username"];
	        this.AuthType = source["AuthType"];
	        this.Secret = source["Secret"];
	        this.KeyID = source["KeyID"];
	        this.CreatedAt = source["CreatedAt"];
	        this.UpdatedAt = source["UpdatedAt"];
	    }
	}

}
