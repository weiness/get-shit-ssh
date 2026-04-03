export namespace store {
	
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

