import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PackDTO, GradeDTO, TamanhoDTO } from '../models/pack';

@Injectable({ providedIn: 'root' })
export class PackService {
  private base = '/api/packs/'; // DRF ViewSet de Pack
  private gradesUrl = '/api/grades/';
  private tamanhosUrl = '/api/tamanhos/';

  constructor(private http: HttpClient) {}

  list(params: {
    page?: number; page_size?: number; search?: string;
    ordering?: string;
  }): Observable<{count:number; results:PackDTO[]}> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', params.page);
    if (params.page_size) p = p.set('page_size', params.page_size);
    if (params.search) p = p.set('search', params.search);
    if (params.ordering) p = p.set('ordering', params.ordering);
    return this.http.get<{count:number; results:PackDTO[]}>(this.base, { params: p });
  }

  retrieve(id: number): Observable<PackDTO> {
    return this.http.get<PackDTO>(`${this.base}${id}/`);
  }

  create(data: PackDTO): Observable<PackDTO> {
    return this.http.post<PackDTO>(this.base, data);
  }

  update(id: number, data: PackDTO): Observable<PackDTO> {
    return this.http.put<PackDTO>(`${this.base}${id}/`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}${id}/`);
  }

  // auxiliares
  listGrades(): Observable<{count:number; results:GradeDTO[]}|GradeDTO[]> {
    // aceita ambos formatos (com/sem paginação)
    return this.http.get<{count:number; results:GradeDTO[]}|GradeDTO[]>(this.gradesUrl, {
      params: new HttpParams().set('page_size', 1000)
    });
  }

  listTamanhosByGrade(idgrade: number): Observable<{count:number; results:TamanhoDTO[]}|TamanhoDTO[]> {
    return this.http.get<{count:number; results:TamanhoDTO[]}|TamanhoDTO[]>(this.tamanhosUrl, {
      params: new HttpParams().set('idgrade', idgrade).set('page_size', 1000)
    });
  }
}
