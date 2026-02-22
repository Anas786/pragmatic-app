import {
  APIResponse,
  ILogin,
} from 'src/types';
import { appAxios, callAPI } from '../config';

export const login = (data: ILogin) =>
  callAPI(appAxios.post<APIResponse>('/login', data));
