import Loading from '@/components/ui/loading'

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loading className="w-8! h-8! text-primary" />
    </div>
  )
}
