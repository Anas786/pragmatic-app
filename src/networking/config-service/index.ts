import {
  AlarmsMapping,
  ParamsHierarchy,
  ParamsMapping,
  ReportMapping,
} from 'src/types';
import { display, inspectError } from 'src/utils';
import { appAxios } from '../config';

/**
 * GET /public/config/params-mapping
 *
 * Public endpoint (no Bearer token required). Returns the UI parameter
 * mapping configuration (display names, units, data types, validation
 * rules) used to render IoT telemetry across the app.
 *
 * The axios request interceptor recognises `/public/*` URLs and skips
 * Authorization-header attachment, so this can be called before sign-in.
 *
 * Spec: openapi.yaml#/paths/public/config/params-mapping/get
 */
export const getParamsMapping = async (): Promise<ParamsMapping> => {
  try {
    const { data } = await appAxios.get<ParamsMapping>(
      '/public/config/params-mapping',
    );
    return data ?? {};
  } catch (err) {
    display('config.getParamsMapping FAILED', inspectError(err));
    throw err;
  }
};

/** GET /public/config/params-hierarchy */
export const getParamsHierarchy = async (): Promise<ParamsHierarchy> => {
  try {
    const { data } = await appAxios.get<ParamsHierarchy>(
      '/public/config/params-hierarchy',
    );
    return data ?? {};
  } catch (err) {
    display('config.getParamsHierarchy FAILED', inspectError(err));
    throw err;
  }
};

/** GET /public/config/alarms */
export const getAlarmsMapping = async (): Promise<AlarmsMapping> => {
  try {
    const { data } = await appAxios.get<AlarmsMapping>(
      '/public/config/alarms',
    );
    return data ?? {};
  } catch (err) {
    display('config.getAlarmsMapping FAILED', inspectError(err));
    throw err;
  }
};

/** GET /public/config/report-mapping */
export const getReportMapping = async (): Promise<ReportMapping> => {
  try {
    const { data } = await appAxios.get<ReportMapping>(
      '/public/config/report-mapping',
    );
    return data ?? {};
  } catch (err) {
    display('config.getReportMapping FAILED', inspectError(err));
    throw err;
  }
};
