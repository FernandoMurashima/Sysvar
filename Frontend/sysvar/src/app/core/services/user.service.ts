import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = '/api';

  constructor(private http: HttpClient) {}

  me(): Observable<any> {
    return this.http.get<any>(`${this.base}/me/`);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/users/${id}/`, data);
  }
}
