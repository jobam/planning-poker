import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

const ACK_TIMEOUT = 10_000;

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit<T>(event: string, data?: T): void {
    this.socket?.emit(event, data);
  }

  emitWithAck<T, R>(event: string, data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, ACK_TIMEOUT);

      this.socket.emit(event, data, (response: R) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => {
        subscriber.next(data);
      };

      this.socket?.on(event, handler);

      return () => {
        this.socket?.off(event, handler);
      };
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
