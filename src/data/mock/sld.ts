/**
 * Mock SLD graph — mirrors the final backend response schema verbatim so the
 * renderer is built against production shape. Swap `sldGraphMock` for the API
 * payload and `sldMockValues` for a live-data resolver when the endpoint lands
 * (see `makeLiveResolver` in `src/utils/sld`).
 */

import { SLDGraph } from 'src/types';

export const sldGraphMock: SLDGraph = {
  nodes: [
    {
      id: '1',
      type: 'custom',
      position: { x: 479.20271453600856, y: 498.18518184281436 },
      data: {
        heading: 'LCL Plant',
        keys: [{ unit: 'kW', param: 'live.p30.value', label: 'P' }],
        edgesConnect: 'target',
        icon: { color: '#ff64ff', name: 'industry' },
        fixed: true,
        type: 'logo',
      },
    },
    {
      id: '2',
      type: 'custom',
      position: { x: 654.0614434550164, y: 659.3101060810963 },
      data: {
        heading: 'GW-WTG-01',
        keys: [
          { unit: 'kW', param: 'live.p10326.value', label: 'P' },
          { unit: 'kW', param: 'live.p10370.value', label: 'Q' },
          { unit: '%', param: 'live.p10124.value', label: 'SOC' },
        ],
        edgesConnect: 'source',
        icon: { color: '#ff7d00', name: 'wind' },
        fixed: false,
        type: null,
        animation: { animationParams: 'live.p10326.value', value: 0, operator: '!=' },
      },
    },
    {
      id: '3',
      type: 'custom',
      position: { x: 643.5461430648834, y: 83.06231870989357 },
      data: {
        heading: 'PV-SG-CI-01',
        keys: [
          { unit: 'kW', param: 'live.p42.value', label: 'P' },
          { unit: 'kVar', param: 'live.p74.value', label: 'Q' },
        ],
        edgesConnect: 'source',
        icon: { color: '#00ff00', name: 'solarLg' },
        fixed: false,
        type: null,
        animation: { animationParams: 'live.p42.value', value: 0, operator: '!=' },
      },
    },
    {
      id: '4',
      type: 'custom',
      position: { x: 1368.8933387699803, y: 770.2699055322454 },
      data: {
        heading: 'GW-WTG-06',
        keys: [
          { unit: 'kW', param: 'live.p10331.value', label: 'P' },
          { unit: 'kVar', param: 'live.p10375.value', label: 'Q' },
        ],
        edgesConnect: 'source',
        icon: { color: '#ff7d00', name: 'wind' },
        fixed: false,
        type: null,
        animation: { animationParams: 'live.p10331.value', value: 0, operator: '!=' },
      },
    },
    {
      id: '5',
      type: 'custom',
      position: { x: 272.2871602762649, y: 326.58409668046994 },
      data: {
        heading: 'Captive Plant',
        keys: [
          { unit: 'kW', param: 'live.p1000005.value', label: 'P' },
          { unit: 'kVar', param: 'live.p1000006.value', label: 'Q' },
          { param: 'live.p1000007.value', label: 'PF' },
        ],
        edgesConnect: 'source',
        icon: { color: '#ff0000', name: 'genset' },
        fixed: false,
        type: null,
        animation: { animationParams: 'live.p1000005.value', value: 0, operator: '!=' },
      },
    },
    {
      id: '6',
      type: 'custom',
      position: { x: 754.9519095396172, y: 189.74898524047381 },
      data: {
        heading: 'PV-SG-CI-02',
        keys: [
          { unit: 'kW', param: 'live.p43.value', label: 'P' },
          { unit: 'kVar', param: 'live.p75.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p43.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '9',
      type: 'custom',
      position: { x: 796.8549851162863, y: 781.577739872236 },
      data: {
        heading: 'GW-WTG-02',
        keys: [
          { unit: 'kW', param: 'live.p10327.value', label: 'P' },
          { unit: 'kVar', param: 'live.p10371.value', label: 'Q' },
        ],
        icon: { color: '#ff7d00', name: 'wind' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p10327.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '7',
      type: 'custom',
      position: { x: 918.6251798683681, y: 681.639273451389 },
      data: {
        heading: 'GW-WTG-03',
        keys: [
          { unit: 'kW', param: 'live.p10328.value', label: 'P' },
          { unit: 'kVar', param: 'live.p10372.value', label: 'Q' },
        ],
        icon: { color: '#ff7d00', name: 'wind' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p10328.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '10',
      type: 'custom',
      position: { x: 1089.0506569268791, y: 779.3563480583086 },
      data: {
        heading: 'GW-WTG-04',
        keys: [
          { unit: 'kW', param: 'live.p10329.value', label: 'P' },
          { unit: 'kVar', param: 'live.p10373.value', label: 'Q' },
        ],
        icon: { color: '#ff7d00', name: 'wind' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p10329.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '11',
      type: 'custom',
      position: { x: 1212.2156934457616, y: 686.398508988761 },
      data: {
        heading: 'GW-WTG-05',
        keys: [
          { unit: 'kW', param: 'live.p10330.value', label: 'P' },
          { unit: 'kVar', param: 'live.p10374.value', label: 'Q' },
        ],
        icon: { color: '#ff7d00', name: 'wind' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p10330.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '8',
      type: 'custom',
      position: { x: 885.0007464100579, y: 84.70027589298756 },
      data: {
        heading: 'PV-SG-CI-03',
        keys: [
          { unit: 'kW', param: 'live.p44.value', label: 'P' },
          { unit: 'kVar', param: 'live.p76.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p44.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '15',
      type: 'custom',
      position: { x: 1014.9661199749612, y: 187.86052553287354 },
      data: {
        heading: 'PV-SG-CI-04',
        keys: [
          { unit: 'kW', param: 'live.p45.value', label: 'P' },
          { unit: 'kVar', param: 'live.p77.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p45.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '17',
      type: 'custom',
      position: { x: 1153.937790783373, y: 90.03669730769283 },
      data: {
        heading: 'PV-SG-CI-05',
        keys: [
          { unit: 'kW', param: 'live.p46.value', label: 'P' },
          { unit: 'kVar', param: 'live.p78.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p46.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '19',
      type: 'custom',
      position: { x: 1268.9331312957322, y: 194.2189264164457 },
      data: {
        heading: 'SG-CI-PV-06',
        keys: [
          { unit: 'kW', param: 'live.p47.value', label: 'P' },
          { unit: 'kVar', param: 'live.p79.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p47.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '18',
      type: 'custom',
      position: { x: 1408.2653797314558, y: 103.41726880635483 },
      data: {
        heading: 'PV-SG-CI-07',
        keys: [
          { unit: 'kW', param: 'live.p48.value', label: 'P' },
          { unit: 'kVar', param: 'live.p80.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p48.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '13',
      type: 'custom',
      position: { x: 1518.2653797314558, y: 206.75060213968814 },
      data: {
        heading: 'PV-SG-CI-08',
        keys: [
          { unit: 'kW', param: 'live.p49.value', label: 'P' },
          { unit: 'kVar', param: 'live.p81.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p49.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '20',
      type: 'custom',
      position: { x: 1686.5987130647893, y: 110.08393547302148 },
      data: {
        heading: 'PV-SG-CI-09',
        keys: [
          { unit: 'kW', param: 'live.p50.value', label: 'P' },
          { unit: 'kVar', param: 'live.p82.value', label: 'Q' },
        ],
        icon: { color: '#00ff00', name: 'solarLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p50.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '14',
      type: 'custom',
      position: { x: 278.16622768615275, y: 665.8200292910648 },
      data: {
        heading: 'BESS',
        keys: [
          { unit: 'kW', param: 'live.p10385.value', label: 'P' },
          { unit: 'kVar', param: 'live.p10388.value', label: 'Q' },
          { unit: '%', param: 'live.p10389.value', label: 'PF' },
        ],
        icon: { color: '#084baf', name: 'battery' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p10385.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '12',
      type: 'custom',
      position: { x: 144.66776405686903, y: 509.82807994226914 },
      data: {
        heading: 'WHR Plant',
        keys: [
          { unit: 'kW', param: 'live.p1000009.value', label: 'P' },
          { unit: 'kVar', param: 'live.p1000010.value', label: 'Q' },
          { unit: '%', param: 'live.p1000011.value', label: 'PF' },
        ],
        icon: { color: '#1fcee5', name: 'genset' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p1000009.value', value: '0', operator: '!=' },
      },
    },
    {
      id: '16',
      type: 'custom',
      position: { x: 1739.452443036058, y: 395.13488162517854 },
      data: {
        heading: 'SVG',
        keys: [
          { unit: 'kW', param: 'live.p10497.value', label: 'P' },
          { unit: 'kVar', param: 'live.p10498.value', label: 'Q' },
        ],
        icon: { color: '#0463f1', name: 'switchLg' },
        edgesConnect: 'source',
        animation: { animationParams: 'live.p10498.value', value: '0', operator: '!=' },
      },
    },
  ],
  edges: [
    { id: 'e2-1', source: '2', target: '1', sourceHandle: 't', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#ff7d00' }, markerEnd: { color: '#ff7d00', type: 'arrowclosed' }, selected: false },
    { id: 'e3-1', source: '3', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00e004' }, markerEnd: { color: '#00e004', type: 'arrowclosed' }, selected: false },
    { id: 'e4-1', source: '4', target: '1', sourceHandle: 't', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#ff7d00' }, markerEnd: { color: '#ff7d00', type: 'arrowclosed' }, selected: false },
    { id: 'e5-1', source: '5', target: '1', sourceHandle: 'b', targetHandle: 'l', type: 'buttonedge', style: { stroke: '#cd0a61' }, markerEnd: { color: '#cd0a61', type: 'arrowclosed' }, selected: false },
    { id: 'e6-1', source: '6', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e9-1', source: '9', target: '1', sourceHandle: 't', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#ff7d00' }, markerEnd: { color: '#ff7d00', type: 'arrowclosed' }, selected: false },
    { id: 'e7-1', source: '7', target: '1', sourceHandle: 't', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#ff7d00' }, markerEnd: { color: '#ff7d00', type: 'arrowclosed' }, selected: false },
    { id: 'e10-1', source: '10', target: '1', sourceHandle: 't', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#ff7d00' }, markerEnd: { color: '#ff7d00', type: 'arrowclosed' }, selected: false },
    { id: 'e11-1', source: '11', target: '1', sourceHandle: 't', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#ff7d00' }, markerEnd: { color: '#ff7d00', type: 'arrowclosed' }, selected: false },
    { id: 'e8-1', source: '8', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e15-1', source: '15', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e17-1', source: '17', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e19-1', source: '19', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e18-1', source: '18', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e13-1', source: '13', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e20-1', source: '20', target: '1', sourceHandle: 'b', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#00ff00' }, markerEnd: { color: '#00ff00', type: 'arrowclosed' }, selected: false },
    { id: 'e14-1', source: '14', target: '1', sourceHandle: 't', targetHandle: 'l', type: 'buttonedge', style: { stroke: '#61656b' }, markerEnd: { color: '#61656b', type: 'arrowclosed' } },
    { id: 'e12-1', source: '12', target: '1', sourceHandle: 'r', targetHandle: 'l', type: 'buttonedge', style: { stroke: '#09dcd9' }, markerEnd: { color: '#09dcd9', type: 'arrowclosed' }, selected: false },
    { id: 'e16-1', source: '16', target: '1', sourceHandle: 'l', targetHandle: 'r', type: 'buttonedge', style: { stroke: '#0b60e0' }, markerEnd: { color: '#0b60e0', type: 'arrowclosed' }, selected: false },
  ],
};

/**
 * Deterministic stand-in for live telemetry. Keys are the node `param` paths;
 * values are the resolved readings. Tuned so a realistic mix of sources flow
 * (animated) while a few sit idle (solid): Captive Plant, WTG-04/06 and
 * PV-06 are off.
 */
export const sldMockValues: Record<string, number> = {
  // LCL Plant (total load)
  'live.p30.value': 218.1,
  // GW-WTG-01..06 (P, Q, [SOC])
  'live.p10326.value': 1240.5,
  'live.p10370.value': 85.2,
  'live.p10124.value': 99.0,
  'live.p10327.value': 980.0,
  'live.p10371.value': 60.5,
  'live.p10328.value': 1100.3,
  'live.p10372.value': 70.1,
  'live.p10329.value': 0,
  'live.p10373.value': 0,
  'live.p10330.value': 1320.8,
  'live.p10374.value': 88.0,
  'live.p10331.value': 0,
  'live.p10375.value': 0,
  // PV-SG-CI-01..09
  'live.p42.value': 86.5,
  'live.p74.value': 12.3,
  'live.p43.value': 78.2,
  'live.p75.value': 10.1,
  'live.p44.value': 91.0,
  'live.p76.value': 14.0,
  'live.p45.value': 64.4,
  'live.p77.value': 9.2,
  'live.p46.value': 88.7,
  'live.p78.value': 13.1,
  'live.p47.value': 0,
  'live.p79.value': 0,
  'live.p48.value': 72.9,
  'live.p80.value': 11.5,
  'live.p49.value': 83.3,
  'live.p81.value': 12.0,
  'live.p50.value': 69.5,
  'live.p82.value': 10.4,
  // Captive Plant (idle)
  'live.p1000005.value': 0,
  'live.p1000006.value': 0,
  'live.p1000007.value': 1.0,
  // WHR Plant
  'live.p1000009.value': 540.0,
  'live.p1000010.value': 45.0,
  'live.p1000011.value': 0.98,
  // BESS (discharging)
  'live.p10385.value': -120.5,
  'live.p10388.value': 8.4,
  'live.p10389.value': 96.0,
  // SVG
  'live.p10497.value': 12.0,
  'live.p10498.value': 210.6,
};
