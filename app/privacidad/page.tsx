import { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  Database,
  Eye,
  Lock,
  Mail,
  Phone,
} from 'lucide-react'

export const metadata: Metadata = {
  title:
    'Política de Privacidad | Beluvio - Plataforma para Negocios de Belleza',
  description:
    'Política de privacidad y protección de datos personales de Beluvio, conforme a la Ley 1581 de 2012 de Colombia.',
  robots: 'index, follow',
}

export default function PoliticaPrivacidad() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
            <p className="text-muted-foreground">
              Última actualización:{' '}
              {new Date().toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-gray max-w-none space-y-8">
          <div className="bg-card/50 rounded-2xl p-8 border border-border/50">
            <p className="text-lg leading-relaxed text-muted-foreground">
              En BORLS SAS, propietaria de la plataforma Beluvio, nos
              comprometemos a proteger y respetar su privacidad. Esta Política
              de Privacidad describe cómo recopilamos, usamos, almacenamos y
              protegemos sus datos personales, en cumplimiento de la Ley 1581 de
              2012 de Colombia y sus decretos reglamentarios.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Identificación del Responsable
            </h2>
            <div className="bg-card/30 rounded-xl p-6 border border-border/30">
              <p className="text-muted-foreground mb-2">
                <strong>Responsable del Tratamiento:</strong> BORLS SAS
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>NIT:</strong> 901986258
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>Dirección:</strong> Cali, Colombia
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>Correo electrónico:</strong> beluvio@borls.com
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>Teléfono:</strong> +57 321 727 8684
              </p>
              <p className="text-muted-foreground">
                <strong>Área responsable:</strong> Delegado de Protección de
                Datos Personales
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Datos Personales Recopilados
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-secondary" />
                  Datos de Identificación
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  <li>Nombre completo</li>
                  <li>Número de identificación (cédula, NIT, pasaporte)</li>
                  <li>
                    Información de contacto (teléfono, correo electrónico)
                  </li>
                  <li>Dirección</li>
                  <li>Fecha de nacimiento</li>
                  <li>Fotografía de perfil (opcional)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-secondary" />
                  Datos de Negocio
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  <li>Nombre del negocio o establecimiento</li>
                  <li>Información fiscal y de facturación</li>
                  <li>Datos bancarios para procesamiento de pagos</li>
                  <li>Información de servicios y precios</li>
                  <li>Datos de clientes y citas (si aplica)</li>
                  <li>Información de empleados y especialistas</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-secondary" />
                  Datos de Uso y Comportamiento
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  <li>Dirección IP y datos de conexión</li>
                  <li>Tipo de dispositivo y navegador</li>
                  <li>Información de uso de la plataforma</li>
                  <li>Cookies y tecnologías similares</li>
                  <li>Interacciones con el servicio de atención al cliente</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Finalidades del Tratamiento
            </h2>
            <div className="space-y-4">
              <div className="bg-secondary/5 rounded-xl p-4 border border-secondary/20">
                <h3 className="font-medium mb-2">Finalidades Esenciales</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Necesarias para la prestación del servicio:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Gestión de cuenta y acceso a la plataforma</li>
                  <li>Prestación de servicios de gestión de negocio</li>
                  <li>Procesamiento de pagos y facturación</li>
                  <li>Soporte técnico y atención al cliente</li>
                  <li>Mejora continua de nuestros servicios</li>
                </ul>
              </div>

              <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
                <h3 className="font-medium mb-2">Finalidades Secundarias</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Con su autorización previa y explícita:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Envío de comunicaciones comerciales y marketing</li>
                  <li>Personalización de contenido y recomendaciones</li>
                  <li>Análisis de comportamiento para mejorar servicios</li>
                  <li>Investigación y desarrollo de nuevas funcionalidades</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Derechos de los Titulares
            </h2>
            <p className="text-muted-foreground mb-4">
              Conforme a la Ley 1581 de 2012, usted tiene los siguientes
              derechos sobre sus datos personales:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                <h3 className="font-medium mb-2">
                  Derechos de Acceso y Control
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Conocer sus datos personales tratados</li>
                  <li>Actualizar o corregir información inexacta</li>
                  <li>Solicitar prueba de autorización</li>
                  <li>Revocar autorización cuando sea procedente</li>
                </ul>
              </div>
              <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                <h3 className="font-medium mb-2">
                  Derechos de Supresión y Portabilidad
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Solicitar supresión de datos cuando proceda</li>
                  <li>Obtener copia de sus datos en formato estándar</li>
                  <li>Limitar el tratamiento de sus datos</li>
                  <li>Oponerse a tratamientos específicos</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Medidas de Seguridad
            </h2>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-medium mb-2 text-green-800 dark:text-green-200">
                  Medidas Técnicas
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Encriptación de datos en tránsito y en reposo</li>
                  <li>Firewalls y sistemas de detección de intrusos</li>
                  <li>Control de acceso basado en roles</li>
                  <li>Copiado de seguridad automatizado</li>
                  <li>Monitoreo constante de seguridad</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
                  Medidas Administrativas
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Políticas internas de protección de datos</li>
                  <li>Capacitación regular del personal</li>
                  <li>Contratos de confidencialidad con empleados</li>
                  <li>Procedimientos de respuesta a incidentes</li>
                  <li>Auditorías de seguridad periódicas</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Cookies y Tecnologías Similares
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">
                  ¿Qué son las Cookies?
                </h3>
                <p className="text-muted-foreground">
                  Las cookies son pequeños archivos de texto que se almacenan en
                  su dispositivo cuando visita nuestro sitio web. Utilizamos
                  cookies para mejorar su experiencia y analizar el uso de
                  nuestra plataforma.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">
                  Tipos de Cookies Utilizadas
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  <li>
                    <strong>Cookies Esenciales:</strong> Necesarias para el
                    funcionamiento básico del sitio
                  </li>
                  <li>
                    <strong>Cookies de Rendimiento:</strong> Recopilan
                    información sobre el uso del sitio
                  </li>
                  <li>
                    <strong>Cookies de Funcionalidad:</strong> Recuerdan sus
                    preferencias
                  </li>
                  <li>
                    <strong>Cookies de Marketing:</strong> Utilizadas para
                    personalizar anuncios (con su consentimiento)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Gestión de Cookies</h3>
                <p className="text-muted-foreground">
                  Puede configurar su navegador para rechazar cookies o eliminar
                  las cookies existentes. Sin embargo, algunas funcionalidades
                  de la plataforma podrían no estar disponibles sin cookies
                  esenciales.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Transferencia Internacional
            </h2>
            <p className="text-muted-foreground mb-4">
              Beluvio utiliza proveedores de servicios tecnológicos que pueden
              tener servidores ubicados fuera de Colombia. Todas las
              transferencias internacionales de datos se realizan conforme a lo
              establecido en el Capítulo V de la Ley 1581 de 2012.
            </p>
            <p className="text-muted-foreground">
              Nos aseguramos de que nuestros proveedores cumplan con estándares
              equivalentes o superiores a los requeridos por la legislación
              colombiana, incluido el cumplimiento del RGPD europeo cuando
              corresponda.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Conservación de Datos
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">
                  Periodos de Conservación
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  <li>
                    Datos de cuenta: Mientras el usuario mantenga la relación
                    comercial
                  </li>
                  <li>Datos financieros: 10 años (obligación fiscal)</li>
                  <li>Datos de soporte: 2 años desde la última interacción</li>
                  <li>
                    Datos de marketing: Hasta la revocación del consentimiento
                  </li>
                  <li>Datos analíticos: 26 meses (estándar de la industria)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">
                  Criterios para Conservación
                </h3>
                <p className="text-muted-foreground">
                  Los datos personales se conservarán por el tiempo necesario
                  para cumplir con las finalidades para las cuales fueron
                  recopilados, respetando los plazos establecidos por ley y las
                  obligaciones contractuales.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Menores de Edad</h2>
            <p className="text-muted-foreground mb-4">
              Beluvio no recopila intencionalmente información personal de
              menores de 18 años. Nuestros servicios están dirigidos a personas
              mayores de edad con capacidad jurídica para contratar servicios.
            </p>
            <p className="text-muted-foreground">
              Si descubrimos que hemos recopilado información personal de un
              menor sin consentimiento parental apropiado, tomaremos medidas
              para eliminar dicha información inmediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Cambios a esta Política
            </h2>
            <p className="text-muted-foreground mb-4">
              Podemos actualizar esta Política de Privacidad periódicamente para
              reflejar cambios en nuestras prácticas, tecnologías o requisitos
              legales.
            </p>
            <p className="text-muted-foreground">
              Las modificaciones significativas serán notificadas a los usuarios
              con al menos 30 días de antelación mediante los canales de
              comunicación disponibles en la plataforma. El uso continuado de la
              plataforma después de dichas modificaciones constituirá aceptación
              de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              11. Contacto y Canales de Atención
            </h2>
            <p className="text-muted-foreground mb-4">
              Para ejercer sus derechos de protección de datos o realizar
              cualquier consulta relacionada con esta política, puede
              contactarnos a través de:
            </p>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-secondary" />
                <strong>Correo electrónico:</strong> privacy@borls.com
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-secondary" />
                <strong>Correo alternativo:</strong> beluvio@borls.com
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-secondary" />
                <strong>Teléfono:</strong> +57 321 727 8684
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 text-secondary" />
                <strong>Delegado de Protección de Datos:</strong>{' '}
                privacy@borls.com
              </p>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Importante:</strong> Cualquier solicitud relacionada con
                derechos de protección de datos debe incluir su identificación
                completa y una descripción clara de su petición. Responderemos
                en un término máximo de quince (15) días hábiles.
              </p>
            </div>
          </section>

          <div className="bg-card/50 rounded-2xl p-6 border border-border/50 mt-8">
            <p className="text-sm text-muted-foreground text-center">
              Esta Política de Privacidad complementa nuestros Términos de Uso y
              constituye un acuerdo legal vinculante entre usted y BORLS SAS. Al
              utilizar la plataforma Beluvio, usted reconoce haber leído,
              entendido y aceptado estas políticas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
