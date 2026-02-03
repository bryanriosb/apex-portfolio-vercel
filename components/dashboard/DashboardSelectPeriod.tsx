import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function DashboardPeriodSelector() {
  return (
    <Select>
      <SelectTrigger className="border-0 bg-transparent shadow-none w-[100px]">
        <SelectValue placeholder="Periodo" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectLabel>Periodos</SelectLabel>
          <SelectItem value="month">Mensual</SelectItem>
          <SelectItem value="three-months">3 Meses</SelectItem>
          <SelectItem value="six-months">6 Meses</SelectItem>
          <SelectItem value="year">Anual</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
