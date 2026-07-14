import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get('/api/products');
  }

  create(data: unknown) {
    return this.http.post('/api/products', data);
  }

  update(id: string, data: unknown) {
    return this.http.put('/api/products', data);
  }

  delete(id: string) {
    return this.http.delete('/api/products/' + id);
  }
}
