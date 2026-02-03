'use client'

import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'

import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  ToolboxComponent,
} from 'echarts/components'
import { color } from 'echarts'

echarts.use([
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  GridComponent,
  BarChart,
  CanvasRenderer,
])

export default function EchartsBarChart({
  xAxisType = 'category',
  xAxisLabel,
  xAxisData,
  yAxisType = 'value',
  yAxisLabel,
  seriesData,
}: {
  xAxisType?: 'category' | 'time'
  xAxisLabel?: string
  xAxisData: string[] | number[]
  yAxisType?: 'value' | 'log'
  yAxisLabel?: string
  seriesData: number[]
}) {
  const options = {
    color: ['#4ECCA3'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#c9e2dd',
        },
        lineStyle: {
          color: '#c9e2dd',
        },
      },
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          title: {
            zoom: 'Seleccionar área para zoom',
            back: 'Quitar zoom',
          },
          yAxisIndex: 'none',
          iconStyle: {
            borderColor: '#a1a1a1',
          },
          emphasis: {
            iconStyle: {
              borderColor: '#838383',
            },
          },
        },
        restore: {
          title: 'Restaurar',
          iconStyle: {
            borderColor: '#a1a1a1',
          },
          emphasis: {
            iconStyle: {
              borderColor: '#838383',
            },
          },
        },
        saveAsImage: {
          title: 'Descargar',
          iconStyle: {
            borderColor: '#a1a1a1',
          },
          emphasis: {
            iconStyle: {
              borderColor: '#838383',
            },
          },
        },
      },
    },
    xAxis: {
      name: xAxisLabel,
      type: xAxisType,
      data: xAxisData,
      axisLine: {
        lineStyle: {
          color: 'transparent',
        },
      },
      axisLabel: {
        color: '#a1a1a1',
      },
      axisPointer: {
        label: {
          backgroundColor: '#e5e5e5',
          color: '#666',
        },
      },
    },
    yAxis: {
      name: yAxisLabel,
      type: yAxisType,
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.04)',
        },
      },
      axisLabel: {
        color: '#a1a1a1',
      },
      axisPointer: {
        label: {
          backgroundColor: '#e5e5e5',
          color: '#666',
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: seriesData,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={options}
      notMerge={true}
      lazyUpdate={true}
    />
  )
}
