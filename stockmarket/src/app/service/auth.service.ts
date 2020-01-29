import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { BehaviorSubject, throwError } from 'rxjs';
import { AuthToken } from '../model/authtoken';
import { Router } from '@angular/router';

export interface AuthResponseData {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  jti: string;
}

export interface AuthRegisterData {
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  token = new BehaviorSubject<AuthToken>(null);
  private tokenExpirationTime: any;

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa('fooClientIdPassword:secret')
    });

    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('username', username)
      .set('password', password);

    return this.http.post<AuthResponseData>(
      'http://localhost:8080/oauth/token',
      body,
      { headers }
    )
    .pipe(
      catchError(this.handleError),
      tap(resData => this.getToken(resData))
    );
  }

  public signUp(username: string, password: string) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      username,
      password,
      role: 'USER'
    };
    return this.http
      .post<AuthRegisterData>('http://localhost:8080/api/users', body, {
        headers
      })
      .pipe(catchError(this.handleError));
  }

  autoLogin() {
    const tokenData: AuthToken = JSON.parse(localStorage.getItem('tokenData'));
    if (!tokenData) {
      return;
    }
    const loadedData = new AuthToken(
      tokenData.access_token, tokenData.token_type,
      tokenData.refresh_token, tokenData.expires_in,
      tokenData.scope, tokenData.jti);
    if (loadedData.token) {
      const expritationDuration = new Date().getTime() + loadedData.expires_in - new Date().getTime();
      this.token.next(loadedData);
      this.autoLogout(expritationDuration);
      }
  }

  logout() {
    this.token.next(null);
    this.router.navigate(['/login']);
    localStorage.removeItem('tokenData');
    if (this.tokenExpirationTime) {
      clearTimeout(this.tokenExpirationTime);
    }
    this.tokenExpirationTime = null;
  }

  autoLogout(expirationDuration: number) {
    console.log(expirationDuration);
    this.tokenExpirationTime = setTimeout (
      () => {
        this.logout();
      }, expirationDuration
    );
  }

  private getToken(authResponse: AuthResponseData) {
    const token = new AuthToken(
      authResponse.access_token, authResponse.token_type,
      authResponse.refresh_token, authResponse.expires_in,
      authResponse.scope, authResponse.jti);
    this.token.next(token);
    this.autoLogout(authResponse.expires_in * 1000);
    localStorage.setItem('tokenData', JSON.stringify(token));
  }

  private handleError(errorResponse: HttpErrorResponse) {
    const errorMessage = 'An error occured';
    console.log(errorResponse);
    return throwError(errorMessage);
  }
}
