'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { sendMessageToSQS, SQSMessage } from '@/lib/actions/sqs'
import { toast } from 'sonner'
import Loading from './ui/loading'
import { Textarea } from './ui/textarea'

const formSchema = z.object({
  targetDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: 'La fecha debe tener el formato AÑO/MES/DIA',
  }),
  emails: z
    .string()
    .regex(
      /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(,[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})*$/,
      {
        message:
          'Debe ser una lista de correos válidos separados por coma sin espacios. Ejemplo: usuario1@correo.com,usuario2@correo.com',
      }
    ),
})

export default function CreateExecutionQueue() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetDate: '',
    },
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      console.log(values)
      const queueUrl =
        'https://sqs.us-west-1.amazonaws.com/399699578521/CreditNotes.fifo'
      const message: SQSMessage = {
        messageBody: JSON.stringify(values),
        messageGroupId: 'execution-queue',
        messageDeduplicationId: `exec-${values.targetDate}-${Date.now()}`,
      }
      const response = await sendMessageToSQS(queueUrl, message)
      toast.success(`Ejecución programada correctamente: ${response.messageId}`)
      form.reset({
        emails: '',
      })
    } catch (error) {
      console.error('Error creating execution queue:', error)
      toast.error('Error programando la ejecución')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4 grid place-items-center">
      <div className="grid gap-1">
        <h2 className="subtitle">Programar Ejecución</h2>
        <span className="text-gray-600 text-sm">
          Aquí puedes crear una nueva cola de ejecución para procesar los
          portales segun fecha objetivo.
        </span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Encolar ejecuciones</CardTitle>
          <CardDescription>
            Defina la fecha para programar la descarga.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha objetivo</FormLabel>
                    <FormControl>
                      <Input placeholder="AAAA/MM/DD" {...field} />
                    </FormControl>
                    <FormDescription>
                      Esta es la fecha que se usara para buscar todos los
                      documentos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correos</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="usuario1@correo.com,usuario2@correo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Los correos separados por comas a los que se enviarán las
                      notificaciones
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full flex items-center gap-3"
                disabled={loading}
              >
                {loading ? <Loading /> : <FileDown />}
                Programar descarga
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
