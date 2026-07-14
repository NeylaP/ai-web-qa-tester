export interface HttpCall {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  urlPattern: string;
}

export interface AngularComponent {
  name: string;
  selector: string;
  filePath: string;
}

export interface AngularService {
  name: string;
  filePath: string;
  httpCalls: HttpCall[];
}

export interface NestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
}

export interface NestController {
  name: string;
  basePath: string;
  filePath: string;
  endpoints: NestEndpoint[];
}

export interface NestService {
  name: string;
  filePath: string;
}

export interface NestDto {
  name: string;
  filePath: string;
  fields: string[];
}

export interface ComponentInventory {
  analyzedAt: string;
  angular: {
    components: AngularComponent[];
    services: AngularService[];
    routes: string[];
  };
  nestjs: {
    controllers: NestController[];
    services: NestService[];
    dtos: NestDto[];
  };
}
