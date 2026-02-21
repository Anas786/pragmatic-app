import React, { useMemo} from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import RNEChartsPro from 'react-native-echarts-pro';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import { useUIStore } from '../../../store/utilstore';
import Themestore from '../../../store/themestore';
import Svg, { Rect, Defs, Pattern, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NodeChartProps {
  isFullScreen?: boolean;
  zoom: number;
  roamType: boolean | 'move';
  onZoomChange: (newZoom: number) => void;
}

const Nodechart: React.FC<NodeChartProps> = ({
  isFullScreen = false,
  zoom,
  roamType,
  onZoomChange,
}) => {
 
  const setScrollEnabled = useUIStore(state => state.setScrollEnabled);
  const theme = Themestore(state => state.theme);
  const cardlayout = useMemo(() => {
    const label = {
      show: true,
      position: 'outside',
      backgroundColor: theme.colors.overlaybackground,
      borderColor: theme.colors.inputborder,
      borderWidth: 1,
      borderRadius: 19.21,
      width: 52,
      padding: 9.6,

      formatter: [
        '{spacer|}',
        '{divider|}',
        '{spacing|}',
        `{subheading|P:}{subvalue| 58.95}`,
        `{subheading|Q:}{subvalue| 58.95}`,
        `{subheading|PF:}{subvalue| 58.95}`,
      ].join('\n'),

      rich: {
        solarIcon: {
          backgroundColor: {
            image:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAc9JREFUSIntVM1OE1EYPefO0Bpw04X2HTqmGDdGaiRGpDEpbnkHNWx8AVi6YGPUZzCuTXVhjKhgQqLQAOMrQExkI5IO03tcTMHO3NuQLggbzure737n5343M8AFzhvM7QQ2Oq3HgiYGy6X9g+WkcnkB0FifdlTa//M8qUw8zYvxYHXy7UsQ8ho0NuciwW4XQuyVUnMtCe2vnGlqriSh3QZQHawH1kZfbryLj/dm8NDK3vfcMu4aRMViUurVAMTFehoEOY2cAcl7RQLBmLSOAcSIoGNAYcYT8uxw8ga3fsxN09hPTgNxR8ISgLuFk48wdgmWK46q0fRavf0ZGBgRA+/8MXZkfgJ0RwRF6WF5xxvbmhOt/28gzTrpgd2/vVCArnpkquNBSgB7HnNH68xAAGhstuYFvXZyAC9IxBBeDWE/klAj8MQ90vzq9fYbkwnZpo9vwB3KN/9+AKFGut9CpslmppH5eWcmY2NBtWEGBCJQ/ocGmgAQZo1aFlgtdnSTpFMOLr0Htd4XvJ2lw9csAX93k26nHJafeW63OyzYUExttBanNlqLo3B4egtwc+thPej1HpDZb0DCBxm1v9XbW6dxwxHCVCR8P16PwLvAOeMfLFybD3nAl0wAAAAASUVORK5CYII=',
          },
          width: 16,
          height: 18,
          align: 'right',
        },
        windIcon: {
          backgroundColor: {
            image:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAA55JREFUSIndVU1oXFUU/s59903SjEkogtpBEynYjQnNNCnJ/GijrYsas1ERNHTm2UoFKQgioiIkgmAXLgR/FsGfSUrR0lYXLYJQzLTJTBOczLxJEVtKIR111C5Mf8gkmffuPS7GSSeZSRNwpWd3zzv3fOf7znnnAv91o40Gdg9MNkmjPgKBNs38lyBM+OYvf3/8+HPqTvfERpKHX5jZbMj6MU3MWuMLgphmiL5fvdsSgX3pXf+aQSiSfZuFzidj/tgK4EiqRZOMEeHjRKzjmw0z6DyYagb4Njhxlwbiq+MmRrtyyjSe14wPSnc2ABCMZp+pW5LpQDQ7VPZpQBqCiyviDqRbg1H7K8NRpwAcmR7uvFkLQFYewlamV2t+BUwBEnwawCAACEKeXbQCyAPATuun++A6JzX41ckRf6JW4ioGvb1jUoEOS8Owkke2XwNwJRyxwwDAoDhI7L5dlXsY4MH1kgMVTQ5GM30E2psY6ThUlgCuOAnwoKfgOVtscMY9V+d2ui2NPkVypK5g9i81uP2CeJdm+ATggillCv1pPOa/XsWAgRCDxsrn5Oc7rirT6APo2aUG5xQAp9i6+YImc5wAb7HBGSforQDFpHJfVsSvsdD5ItOZ0P6LjTV6QI0s9O+V9KY+a/8TwIulcTTHlbvQ7nol1S3KKU9uri0ef8xdpUgsFLHv0mohAuCTFQwE4xI0/LV0lLlbeYALrleWJCXa5LY0+tbQ3CbQtioGrlocNWT9D0ErMy+VOAspXAfuA6TEE0XifibcqFsyZ8C8AMI1LczRgJWddSHf/DH28B/lPErwFmJxq6oHU0d7bnqI94DpflfoD5VWw6SEBYFLzU3eEDEKUoiwJzfXBrD0zMunoPmEyc7pcCTVskyB6XFiWp6uFf/BP91/bzXtkJV5EqDZc1+2/wIAoaj9rbPJ6Ts/2nEsHLGvM8z3AQz0WJkHAfh9hYuHqhisZeGIHWYW7yrTeKvs04LPaEIvAEyMdkww8UPdL124V0DEiMUblRtW1sgJgCkQzQ4RsJeZLkshnk6WJqoEUBQ5w8SW5XDi74SjzhPh9cTI9nPrFY3Og6nmYNS+EtyXvacmq/0zW4NR+0Slr3tgsqlWbE2Jpoe7bjDoHRZ8LHgg3br6u9bqUWJKV/qmjvbUXHZ3fA9CVvYR1vwRiJNMGAPhN6FoBxMsD/GeypWwlq3/4AyxCM3au5mpm0B3M/hn5S5+vVbF/z/7G4Lnh0RQTROGAAAAAElFTkSuQmCC',
          },
          width: 16,
          height: 16,
          align: 'right',
          verticalAlign: 'middle',
        },
        boltIcon: {
          backgroundColor: {
            image:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAexJREFUSImtk0FrE1EQx3+z2WQvGvELqBXEnkzC3owHQQ96qAieFLSNQqAWFTyIevKm9/YqdtNc+gFE8CA56AYlQkEFrSLSiyiItipm1ex4KRjX93a30Tm9ndn5/WfezBNymt/sFb2++wRht/EHRw6Etyr3km43r4AXuQ0bXIWH3e17OkbdPHC/2SsqXLaEvzvKGa5JbArm6sCL3AYwZoop3AiD6jNbbmYHGdUve7Llelp+poAXuQ0xV684Mt2ZH+uPLJBevd40bU3SUmeQcvfvnB+FS1lwALEF/Gav6EXuMrAjDwhoh0H1ZNJpvaL16vPC3w5+yhVTwNiB3+wVS5H7wjLcpH1TZX+3VX1kCho7SNmcpKkoDRscLENWGBd4POTaCuz8m87VMKguplVgHfKw1SeX5hRm/kzU1oOgNpmVm/nQ6qefb1ZIbsf9cnlTM09xmQIa96eA8pDrDbEcuzO7K/oPAiooZ4cca8QyES5U3ueBZwrUp5YOAuPrnwPQE+FC5WleeKaA4sz8PuuFMKjd3ggcUrZo36netljc10ABZTZsVc9vFA4pHSjuNFAA7pZWPl4cBQ6WDg6fe+mtrn1dAflQknhvZ772aVQB40te/fzlOFDQweBIp+2PDAfrFckhR+Vot+2/+hc4wC9Ty5W3UZSdrwAAAABJRU5ErkJggg==',
          },
          width: 16,
          height: 16,
          align: 'right',
          verticalAlign: 'middle',
        },
        chartIcon: {
          backgroundColor: {
            image:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAlZJREFUSIm1k01IVGEUhp9z7wyDiWCLrBYFLYxqQBsUcmYk3Do/1qYfCltlLYLIlVRgilpSgRlBCK3CFlGLkmaqReTCRop07kRGQatWBZH9KaMz955WFy2tVK5n+fLd5/nOe/kIW/GJaDZxmFUan8AOhUqvwfXjiWrbcDb5vAYD1L+Kr3UcTQvyblUEjiP9oBWGQZPhNTxsxRKgzQJdI1WpMU8FDdm95YJcB3L54scLACuqKGLFmhE5bQjRkarUpJsXmO0HWY9qcqx2rACw7A1qXtb4QTpQtjsOvW4etmIJFTki0J0JpS03X/YGAXNDC7AZ4T7K0bps402fabxxHAYAy61mRYJwZl8JMn0WGJSAeVJn7NcGxoCq5EDXoRp3q3HnrxVFrcSB3bnklt/C0ukTQIXaZs+zbUM/FD0OBFX1EKI986v5p2BXNlGp6GBR7dsNTxt8ANG3TWWitKlwa7Rm6D3AaHX6ESo3gBczhU/nF2MtWpEp2g4UQWoL5WtagUtO3j4lUE7R7J5/NhN60PK3FhYV1FuxrQ4cBOlVdCMiXZHxxAhoKzDo3n6ps0DgIJ3AlPoLfYHZEmdWCo0Y+gTwq232LAcOf/yDqJUMAvtRuTIafPxlOHTvK8oxoGQlt18gUHU6gG8zdr7PzTKhVApoNovFM8uFA0jEiisqnRh6FyUHei6zM939/0+XNnMbqHahTNp5veoVfJ5AQyB7VPTy87qH370XCEngc8Bfes1L+JwARIWLw8E7P70WuO9AUcoiVrzNS7iKfvApTAmUCrR7CQcQlYlf1pDrwLAaM7MAAAAASUVORK5CYII=',
          },
          width: 16,
          height: 16,
          align: 'right',
          verticalAlign: 'middle',
        },
        title: {
          color: theme.colors.title,
          fontSize: 9.6,
          fontFamily: getFontFamily('true', 'regular'),
          align: 'left',
          padding: [10, 0, 0, 0],
          verticalAlign: 'middle',
        },
        spacer: {
          padding: [0, 0, 0, 0],
        },
        divider: {
          borderWidth: 1.2,
          borderColor: theme.colors.inputborder,
          width: '100%',
          height: 0,
        },
        spacing: {
          padding: [0, 0, 0, 0],
        },
        subheading: {
          color: theme.colors.title,
          fontSize: 9.6,
          fontFamily: getFontFamily('true', 'semibold'),
          align: 'left',
          padding: [0, 0, 5, 0],
        },
        subvalue: {
          color: theme.colors.text,
          fontSize: 9.6,
          align: 'left',
          fontFamily: getFontFamily('true', 'regular'),
          padding: [0, 0, 5, 0],
        },
      },
    };
    return label;
  }, [
    theme.colors.overlaybackground,
    theme.colors.inputborder,
    theme.colors.title,
    theme.colors.text,
  ]);

  const getRoute = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) => {
    const midY = (startY + endY) / 2;

    return [
      [startX, startY],
      [startX, midY],
      [endX, midY],
      [endX, endY],
    ];
  };

  const chartOption = useMemo(() => {
    const scaleNodeStyle = (base: number) => {
      const effectiveZoom = Math.min(Math.max(zoom, 0.8), 1.5);
      return base * effectiveZoom;
    };
    const MIN_ZOOM = 0.8;
    const MAX_ZOOM = 2.0;
    const cX = 600;
    const cY = 450;
    const rowY = 150;

    const graphData = [
      {
        name: 'background-anchor',
        x: 500,
        y: 350,
        symbol: 'rect',
        symbolSize: [2000, 2000],
        itemStyle: {
          color: 'transparent',
          opacity: 0,
        },
        silent: false,
        label: { show: false },
      },
      {
        name: 'Lucky Cement',
        x: 600,
        y: 500,
        symbol: 'rect',
        symbolSize: [scaleNodeStyle(0), scaleNodeStyle(0)],
        itemStyle: { opacity: 1 },
        label: {
          show: true,
          position: 'inside',
          backgroundColor: theme.colors.overlaybackground,
          borderColor: theme.colors.cardscolorred,
          borderWidth: 1,
          borderRadius: 19.21,
          padding: 9.6,

          formatter: [
            '{icon| }',
            '{title|Lucky Cement}',
            '{sub|Load: 315.44}',
          ].join('\n'),
          rich: {
            icon: {
              fontSize: scaleNodeStyle(12),
              align: 'center',
              backgroundColor: {
                image:
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABFBJREFUSImVVU1sVFUU/s59b2ZSaLFVSioDiQpEEToztYXpvZeWqTREjIkbMWkUTESMQQkx/i6IxogudGHYAMqCBERJmhB0AfGXscy8CcJ03gNLIBBYGMUA2kEM7cy8d48LHdKWZkbP7tzvnu8738m5uYQ6UdD6GWJex8xlIjIMbO1wHLdeXTWoFugp9QQzrxyNRF7uS6f9k6nUbLtcPgDmLIjmE/ArAzYDuYTjfEkA1xU4mkrZd5ZKLzJRCszxmc3NixcdOVKq4qeVWmCEmA1jLhnmtUT0OICvGOguhsMDfem0X1PAlXIniH4MMX9RIdqbcJzHarl0ldpnBcGrvm33C2Nmx3O57RNxMWkksdhMAHMSjrOnZNttzPx+LXIAIObLLMSccLE4yEDvVHySQCUUspmoBADC9xtBVKlFXujuvoeJHmrP5UbKra0zQDRWU6Arn79OALla9wH4hYB3z69ZE5mO/JSUDxDRHrLtjQQYKpXeYqLPbnM49eCs1k3jxrzDRAsEYDPzDCI6w8xtRojNkWLxmt/cvN4wv0lADkABQB+Ivk9ksx9N5bNv62zu3JutV6++Xt2Go6mUfUe5HBVEr4CotdTS0iqMSY0xtzcQLRXMs8iy9sQymdHpnE5yMLJsWZsfCh0EAJ95fWcud6GKeUptC4QYBADLmLVxx9k6HWFNB2Xbvo+YzxDwhy3EgwAuAAAD5DEvFsZs+TefxQBN97BqOgAAT+sNDDTEs9kdBBgAKGj9qDAmRZa1CwA4CF4wQqQ7stnD1brTyWQsEOJtEB1KOM6+/+LuVrhKHTi+fPld1fzUihUtntb7pzS239P6flfrzMTzSWs6LbmUUQZuRCxLulJGXSmjgTHKMN8c1npu9R4bs5eN2cXM306snzQiT+seZm5IOM7XEwR2gmgegL8A/EkAMdBERJZhvtbhOJtqNXjLwelkMsbGvAbg6eHu7n4AyEu5EESrCDiccJwBZv4dwJWE4wyA+SgB/YVkclEtgVtbZCKRG/D9FiJqsG17lAHyiD4UQjwSy2QuAoAIhXYDwEgq1TgWBIfI978hIaIAztd1EB8auhSqVNYKy3o2lsnkTym1GUTfxTKZiyd7eu4GAFOpSFOpyLEgaAoZs70zl7tARI2e1s/VFQCAJSdO/NY+NPTzsFKSgd54NrvDk3KV7fuTCLqOHbvMzKMFKVXCcQ4DWF1QalldAeCfD0UA2/xSaQMBhoEtRPTx1HscDr9BwHs/JZNzKuPjG4n5g7yUC+sKGGC1IVrXlc9fd5V6noTIxR3nCgAwUZaJsgDQkU4XA+ZNgWV9bofDjUaIpyxgt6fU0mln5Sq12tX6YDX3pBxwlfqU67wVr7f3XlfrJQDgJZPzPKXSw1KurOJ0srMzZIfDW0E03y+VXurK528CgKfUw+ei0R+eHBwMaglMjbNaN40zf8LAuWI4vI1cpY6DeQkJkfs/RPWCmTUA729eXdys1JQp3gAAAABJRU5ErkJggg==',
              },
              width: scaleNodeStyle(16),
              height: scaleNodeStyle(16),
            },
            title: {
              color: theme.colors.title,
              fontSize: scaleNodeStyle(9.6),
              fontFamily: getFontFamily('true', 'regular'),
              align: 'center',
              padding: [10, 0, 2, 0],
            },
            sub: {
              color: theme.colors.text,
              fontSize: scaleNodeStyle(7.2),
              align: 'center',
            },
          },
        },
      },
      {
        name: 'Solar',
        x: 0,
        y: rowY,
        symbol: 'rect',
        symbolSize: [scaleNodeStyle(0), scaleNodeStyle(0)],
        itemStyle: { opacity: 1 },
        category: 'Solar',
        label: {
          ...cardlayout,
          formatter: [`{title|Solar} {solarIcon|}`, cardlayout.formatter].join(
            '\n',
          ),
          width: Math.max(50, 52 * zoom),
          rich: {
            ...cardlayout.rich,
            title: { ...cardlayout.rich.title, fontSize: scaleNodeStyle(9.6) },
            subheading: {
              ...cardlayout.rich.subheading,
              fontSize: scaleNodeStyle(9.6),
            },
            subvalue: {
              ...cardlayout.rich.subvalue,
              fontSize: scaleNodeStyle(9.6),
            },
            solarIcon: {
              ...cardlayout.rich.solarIcon,
              width: Math.max(16, 14 * zoom),
              height: Math.max(16, 14 * zoom),
            },
          },
        },
      },
      {
        name: 'Wind',
        x: 400,
        y: rowY,
        symbol: 'rect',
        symbolSize: [scaleNodeStyle(0), scaleNodeStyle(0)],
        itemStyle: { opacity: 1 },
        category: 'Wind',
        label: {
          ...cardlayout,
          formatter: [`{title|Wind} {windIcon|}`, cardlayout.formatter].join(
            '\n',
          ),
          width: Math.max(50, 52 * zoom),
          rich: {
            ...cardlayout.rich,
            title: { ...cardlayout.rich.title, fontSize: scaleNodeStyle(9.6) },
            subheading: {
              ...cardlayout.rich.subheading,
              fontSize: scaleNodeStyle(9.6),
            },
            subvalue: {
              ...cardlayout.rich.subvalue,
              fontSize: scaleNodeStyle(9.6),
            },
            windIcon: {
              ...cardlayout.rich.windIcon,
              width: scaleNodeStyle(16),
              height: scaleNodeStyle(18),
            },
          },
        },
      },
      {
        name: 'PCS',
        x: 800,
        y: rowY,
        symbol: 'rect',
        symbolSize: [scaleNodeStyle(0), scaleNodeStyle(0)],
        itemStyle: { opacity: 1 },
        category: 'PCS',
        label: {
          ...cardlayout,
          formatter: [`{title|PCS} {boltIcon|}`, cardlayout.formatter].join(
            '\n',
          ),
          width: Math.max(50, 52 * zoom),
          rich: {
            ...cardlayout.rich,
            title: { ...cardlayout.rich.title, fontSize: scaleNodeStyle(9.6) },
            subheading: {
              ...cardlayout.rich.subheading,
              fontSize: scaleNodeStyle(9.6),
            },
            subvalue: {
              ...cardlayout.rich.subvalue,
              fontSize: scaleNodeStyle(9.6),
            },
            boltIcon: {
              ...cardlayout.rich.boltIcon,
              width: scaleNodeStyle(16),
              height: scaleNodeStyle(18),
            },
          },
        },
      },
      {
        name: 'DG',
        x: 1200,
        y: rowY,
        symbol: 'rect',
        symbolSize: [scaleNodeStyle(0), scaleNodeStyle(0)],
        itemStyle: { opacity: 1 },
        category: 'DG',
        label: {
          ...cardlayout,
          formatter: [`{title|DG} {chartIcon|}`, cardlayout.formatter].join(
            '\n',
          ),
          width: Math.max(50, 52 * zoom),
          rich: {
            ...cardlayout.rich,
            title: { ...cardlayout.rich.title, fontSize: scaleNodeStyle(9.6) },
            subheading: {
              ...cardlayout.rich.subheading,
              fontSize: scaleNodeStyle(9.6),
            },
            subvalue: {
              ...cardlayout.rich.subvalue,
              fontSize: scaleNodeStyle(9.6),
            },
            chartIcon: {
              ...cardlayout.rich.chartIcon,
              width: scaleNodeStyle(16),
              height: scaleNodeStyle(18),
            },
          },
        },
      },
    ];

    const graphLinks = [
      {
        source: 'Lucky Cement',
        target: 'Solar',
        coords: getRoute(cX, cY, 250, rowY),
        lineStyle: { color: '#4caf50', type: 'dashed', width: 2 },
      },
      {
        source: 'Lucky Cement',
        target: 'Wind',
        coords: getRoute(cX, cY, 400, rowY),
        lineStyle: { color: '#3a5fd0', type: 'solid', width: 2 },
      },
      {
        source: 'Lucky Cement',
        target: 'PCS',
        coords: getRoute(cX, cY, 600, rowY),
        lineStyle: { color: '#3a5fd0', type: 'solid', width: 2 },
      },
      {
        source: 'Lucky Cement',
        target: 'DG',
        coords: getRoute(cX, cY, 750, rowY),
        lineStyle: { color: '#4caf50', type: 'dashed', width: 2 },
      },
    ];

    return {
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut',
      animationDurationUpdate: 500,
      animationEasingUpdate: 'cubicOut',
      onChange: `(params) => {
        if (params.type === 'graphRoam' && params.zoom) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'zoom',
            value: params.zoom
          }));
        }
      }`,
      series: [
        {
          id: 'main-graph',
          type: 'graph',
          layout: 'none',
          edgeShape: 'polyline',
          center: [cX, cY],
          z: 2,
          lineStyle: {
            curveness: 0,
            width: 2,
            opacity: 0.5,
          },
          silent: false,
          triggerEvent: true,
          symbol: 'rect',
          symbolSize: [90, 50],
          zoom: zoom,
          roam: roamType,
          nodeScaleRatio: 1,
          scaleLimit: {
            min: MIN_ZOOM,
            max: MAX_ZOOM,
          },
          label: { show: true, fontSize: 10, color: '#000' },
          edgeSymbol: ['none', 'none'],
          edgeSymbolSize: [1, 10],
          data: graphData,
          links: graphLinks,
        },
      ],
    };
  }, [zoom, roamType, theme, cardlayout]);

  return (
    <View
      style={[
        styles.container,
        isFullScreen && styles.fullScreenContainer,
        isFullScreen && { backgroundColor: theme.colors.background },
      ]}
      onTouchStart={() => setScrollEnabled(false)}
      onTouchEnd={() => setScrollEnabled(true)}
      onTouchCancel={() => setScrollEnabled(true)}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">

        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id="dotGrid"
              x="0"
              y="0"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <Circle
                cx="1"
                cy="1"
                r="1"
                fill={theme.colors.text}
                opacity={0.3}
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dotGrid)" />
        </Svg>
      </View>
      <RNEChartsPro
        height={isFullScreen ? SCREEN_HEIGHT - 50 : 280}
        width={SCREEN_WIDTH}
        fontFamilies={getFontFamily('true', 'regular')}
        option={chartOption}
        backgroundColor={'transparent'}
        onDataZoom={(result: any) => {
          try {
            const data =
              typeof result === 'string' ? JSON.parse(result) : result;
            if (data && data.zoom) {
              onZoomChange(data.zoom);
            }
          } catch (e) {
            if (!isNaN(result)) {
              onZoomChange(Number(result));
            }
            console.log(e);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  fullScreenContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export default Nodechart;
