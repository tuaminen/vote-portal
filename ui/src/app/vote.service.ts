import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type Vote = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;

export interface TopicOut { title: string; }
export interface ItemMeta { id: number; description: string; }
export interface VoteIn { item_id: number; score: Vote; }
export interface ResultItem { item_id: number; voters: number; score: number; average: number; pos: number; neg: number; rank: number; }

export const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:8080';

@Injectable({
  providedIn: 'root'
})
export class VoteService {
  private http = inject(HttpClient);

  getTopic(): Observable<string> {
    return this.http.get<{ title: string }>(`${API_BASE}/topic`).pipe(
      map(t => t.title),
      catchError(() => of('TestiOtsikko 24.10.2025'))
    );
  }

  getItems(): Observable<ItemMeta[]> {
    return this.http.get<ItemMeta[]>(`${API_BASE}/items`);
  }

  imageUrl(id: number): string {
    return `${API_BASE}/items/${id}/image`;
  }

  sendVotes(nickname: string, votes: Record<number, Vote>): Observable<any> {
    const payload = {
      user_id: nickname,
      votes: Object.entries(votes).map(([item_id, score]) => ({ item_id: Number(item_id), score })) as VoteIn[],
    };
    return this.http.post(`${API_BASE}/votes`, payload, { observe: 'response' });
  }

  getResults(): Observable<ResultItem[]> {
    return this.http.get<ResultItem[]>(`${API_BASE}/results`);
  }
}
