import CardEchartBar from './charts/cards/CardEchartBar'
import DashboardFilter from './dashboard/DashboardFilter'

export default function Dashboard() {
  return (
    <section className="grid gap-6">
      <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
        <h1 className="text-2xl font-bold">Tablero</h1>
        <DashboardFilter />
      </div>
      <article className="grid sm:grid-cols-2 gap-6 w-full">
        <CardEchartBar
          title="Pacientes atendidos"
          description="Pacientes atendidos en la última semana"
          footer="Actualizado hace 2 horas"
          xAxisData={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
          seriesData={[3450, 7200, 13600, 31000, 22000, 15000]}
        />
        <CardEchartBar
          title="Pacientes por ciudad"
          description="Distribución de pacientes por ciudad"
          footer="Actualizado hace 2 horas"
          xAxisData={['Cali', 'Medellin', 'Bogotá', 'Barranquilla', 'Pereira']}
          seriesData={[345, 720, 136, 310, 220]}
        />
      </article>
    </section>
  )
}
