import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core'; // 補上 inject
import { Observable } from 'rxjs';                   // 新增這行匯入 Observable

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {

  httpClient = inject(HttpClient);

  getApi(url: string): Observable<any> {
    return this.httpClient.get(url);
  }

  postApi(url: string, data: any): Observable<any> {
    return this.httpClient.post(url, data);
  }

  putApi(url: string, data: any): Observable<any> {
    return this.httpClient.put(url, data);
  }

  deleteApi(url: string): Observable<any> {
    return this.httpClient.delete(url);
  }




}
