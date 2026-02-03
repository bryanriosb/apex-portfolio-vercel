import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import EchartsBarChart from '../echarts/EchartsBarChart'

export default function CardEchartBar({ ...props }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{props.description}</CardDescription>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <EchartsBarChart
          xAxisData={props.xAxisData}
          seriesData={props.seriesData}
        />
      </CardContent>
      <CardFooter>{props.footer}</CardFooter>
    </Card>
  )
}
