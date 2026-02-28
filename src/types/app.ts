export interface IconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

export interface GifProps{
  size?: number;
}

export interface APIResponse<T = null> {
  status: 'error' | 'success';
  message?: string;
  data: T;
  code: 409 | 200 | 404 | 400 | 500;
}
