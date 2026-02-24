'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Phone } from 'lucide-react'

export default function TerminosUso() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Términos de Uso</h1>
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
          <div className="bg-card/50 p-8 border border-border/50">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Estos Términos de Uso (en adelante, los "Términos") regulan el
              acceso y uso de la plataforma APEX (Adaptive Planning & Execution Platform) (en adelante, la
              "Plataforma"), propiedad de BORLS SAS, una empresa especializada en
              el desarrollo de soluciones tecnológicas y software empresarial.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              1. Aceptación de los Términos
            </h2>
            <p className="text-muted-foreground mb-4">
              El acceso y uso de la plataforma APEX implica la aceptación
              completa e incondicional de estos Términos. Si no está de acuerdo
              con estos términos, no deberá utilizar la plataforma.
            </p>
            <p className="text-muted-foreground">
              BORLS se reserva el derecho de modificar estos Términos en
              cualquier momento. Las modificaciones serán efectivas desde su
              publicación en la plataforma y se notificarán a los usuarios
              mediante los mecanismos que BORLS considere apropiados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. Descripción del Servicio
            </h2>
            <p className="text-muted-foreground mb-4">
              APEX es una plataforma tecnológica de software como servicio (SaaS)
              diseñada para la gestión integral de procesos empresariales, incluyendo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-6">
              <li>Gestión de clientes y base de datos empresarial</li>
              <li>Automatización de procesos y flujos de trabajo</li>
              <li>Gestión documental y de archivos adjuntos</li>
              <li>Integración con servicios de comunicación (WhatsApp, email)</li>
              <li>Reportes y análisis de datos empresariales</li>
              <li>Facturación y gestión financiera</li>
              <li>Administración de usuarios y permisos</li>
              <li>Herramientas de inteligencia artificial y automatización</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Responsabilidades del Usuario
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">
                  3.1. Información Veraz
                </h3>
                <p className="text-muted-foreground">
                  El usuario se compromete a proporcionar información veraz,
                  completa y actualizada en todo momento. BORLS no se
                  responsabiliza por la veracidad de la información
                  proporcionada por los usuarios.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">3.2. Uso Apropiado</h3>
                <p className="text-muted-foreground">
                  El usuario se obliga a utilizar la plataforma de manera
                  lícita, respetuosa y conforme a la normativa vigente,
                  incluyendo la Ley 1581 de 2012 (Habeas Data) y la Ley 1273 de
                  2009 (Delitos informáticos).
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">
                  3.3. Seguridad de la Cuenta
                </h3>
                <p className="text-muted-foreground">
                  El usuario es responsable de mantener la confidencialidad de
                  sus credenciales de acceso y de cualquier actividad que ocurra
                  bajo su cuenta. BORLS no se hace responsable por el acceso
                  no autorizado resultante de negligencia del usuario.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">
                  3.4. Confidencialidad de Datos de Terceros
                </h3>
                <p className="text-muted-foreground">
                  El usuario es el único responsable de obtener el consentimiento
                  informado y previo de sus clientes finales para el tratamiento
                  de sus datos personales en la plataforma. Los datos de clientes
                  finales ingresados por el usuario son de su exclusiva propiedad
                  y responsabilidad. BORLS actúa únicamente como encargado del
                  tratamiento, proporcionando infraestructura tecnológica segura,
                  sin adquirir derechos de propiedad sobre dichos datos.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              4. Propiedad Intelectual
            </h2>
            <p className="text-muted-foreground mb-4">
              Todos los derechos de propiedad intelectual sobre la plataforma
              APEX, incluyendo software, diseño, contenido, bases de datos y
              tecnología, son propiedad exclusiva de BORLS.
            </p>
            <p className="text-muted-foreground">
              El usuario obtiene una licencia limitada, no exclusiva,
              intransferible y revocable para utilizar la plataforma conforme a
              estos Términos. Queda prohibida la reproducción, modificación,
              distribución o creación de obras derivadas sin autorización
              expresa y por escrito de BORLS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Protección de Datos Personales
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">
                  5.1. Compromiso de Confidencialidad Total
                </h3>
                <p className="text-muted-foreground mb-4">
                  BORLS SAS garantiza expresamente que:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-6 mb-4">
                  <li><strong>NUNCA</strong> venderemos ni comercializaremos los datos de sus clientes finales</li>
                  <li><strong>NUNCA</strong> utilizaremos la información de terceros para fines de marketing propio</li>
                  <li><strong>NUNCA</strong> compartiremos datos con terceros sin su autorización expresa, salvo requerimiento legal con orden judicial</li>
                  <li><strong>NUNCA</strong> accederemos a sus datos para propósitos distintos a la prestación del servicio contratado</li>
                </ul>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">
                  5.2. Tratamiento conforme a la Ley 1581 de 2012
                </h3>
                <p className="text-muted-foreground mb-4">
                  BORLS se compromete a proteger los datos personales de sus
                  usuarios conforme a la Ley 1581 de 2012 y sus decretos
                  reglamentarios. El tratamiento de datos personales se regirá por
                  nuestra Política de Privacidad, que forma parte integrante de
                  estos Términos.
                </p>
                <p className="text-muted-foreground">
                  El usuario autoriza expresamente el tratamiento de sus datos
                  personales para las finalidades descritas en la Política de
                  Privacidad, incluyendo la prestación del servicio, mejoramiento
                  continuo y comunicación comercial relacionada con APEX.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              6. Pagos y Suscripciones
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">
                  6.1. Planes y Precios
                </h3>
                <p className="text-muted-foreground">
                  Los planes de suscripción y precios están disponibles en la
                  sección de precios de la plataforma. APEX se reserva el
                  derecho de modificar los precios en cualquier momento, previa
                  notificación a los usuarios con al menos 30 días de
                  antelación.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">6.2. Facturación</h3>
                <p className="text-muted-foreground">
                  Los pagos se procesarán a través de pasarelas de pago seguras
                  y debidamente certificadas. APEX emitirá facturas
                  electrónicas conforme a la normativa colombiana (Resolución
                  00042 de 2020).
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">6.3. Cancelación</h3>
                <p className="text-muted-foreground">
                  El usuario puede cancelar su suscripción en cualquier momento.
                  La cancelación surtirá efecto al finalizar el período de
                  facturación actual y no generará reembolsos proporcionales.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Limitación de Responsabilidad
            </h2>
            <p className="text-muted-foreground mb-4">
              En la máxima medida permitida por la ley colombiana, BORLS no
              será responsable por ningún daño indirecto, incidental, especial o
              consecuente que surja del uso o la imposibilidad de uso de la
              plataforma.
            </p>
            <p className="text-muted-foreground mb-4">
              La responsabilidad total de BORLS, en cualquier caso, no
              excederá el monto pagado por el usuario en los últimos tres (3)
              meses de servicio.
            </p>
            <p className="text-muted-foreground mb-4">
              BORLS no garantiza la disponibilidad ininterrumpida de la
              plataforma, aunque se compromete a mantener los más altos
              estándares de calidad y disponibilidad técnica.
            </p>
            <p className="text-muted-foreground">
              El usuario reconoce que es responsable de cumplir con la Ley 1581 de 2012 
              respecto a los datos de sus propios clientes finales, incluyendo la obtención 
              de autorización para su tratamiento. BORLS no será responsable por el 
              incumplimiento por parte del usuario de sus obligaciones como responsable 
              del tratamiento de datos de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              8. Propiedad de los Datos
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">
                  8.1. Propiedad de Datos del Usuario
                </h3>
                <p className="text-muted-foreground mb-4">
                  El usuario mantiene la propiedad exclusiva de todos los datos que ingresa en
                  la plataforma, incluyendo pero no limitado a: información de sus clientes finales,
                  registros de transacciones, documentos adjuntos y cualquier contenido generado.
                  BORLS solo obtiene los derechos necesarios para
                  prestar el servicio conforme a estos Términos y la Política de
                  Privacidad.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">
                  8.2. Derechos de BORLS
                </h3>
                <p className="text-muted-foreground mb-4">
                  BORLS se reserva el derecho de utilizar datos agregados y anonimizados 
                  para fines estadísticos y de mejora del servicio, garantizando que dicha 
                  información no permita la identificación de usuarios individuales ni de 
                  sus clientes finales, conforme al artículo 2 de la Ley 1581 de 2012.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">
                  8.3. Eliminación de Datos
                </h3>
                <p className="text-muted-foreground">
                  En caso de terminación del servicio, BORLS proporcionará al
                  usuario un plazo de 30 días para exportar sus datos. Transcurrido
                  este período, los datos serán eliminados permanentemente de nuestros 
                  servidores activos dentro de los siguientes 30 días. Las copias de 
                  seguridad serán eliminadas conforme a los ciclos de retención establecidos 
                  (máximo 90 días adicionales), salvo obligación legal de conservación 
                  superior. El usuario podrá solicitar un certificado de eliminación de datos.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Terminación</h2>
            <p className="text-muted-foreground mb-4">
              BORLS podrá suspender o terminar el acceso a la plataforma en
              caso de incumplimiento de estos Términos, uso fraudulento,
              violación de derechos de propiedad intelectual, o cualquier
              actividad que pueda dañar la plataforma o a otros usuarios.
            </p>
            <p className="text-muted-foreground">
              El usuario puede terminar su relación con BORLS en cualquier
              momento mediante la cancelación de su suscripción y la eliminación
              de su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              10. Ley Aplicable y Jurisdicción
            </h2>
            <p className="text-muted-foreground mb-4">
              Estos Términos se rigen por las leyes de la República de Colombia,
              particularmente la Ley 1581 de 2012 (Protección de Datos Personales),
              la Ley 1273 de 2009 (Delitos Informáticos), el Decreto 1377 de 2013,
              el Decreto 886 de 2014 y demás normas concordantes.
            </p>
            <p className="text-muted-foreground mb-4">
              Cualquier controversia que surja de estos Términos se resolverá
              mediante los tribunales competentes de Cali, Colombia, salvo que
              las partes acuerden un mecanismo alternativo de solución de
              controversias.
            </p>
            <p className="text-muted-foreground">
              Para efectos de interpretación, se entenderá que cualquier
              referencia a legislación específica corresponde a la normativa
              colombiana vigente al momento de la interpretación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Contacto</h2>
            <p className="text-muted-foreground mb-4">
              Para cualquier pregunta, comentario o inquietud sobre estos
              Términos de Uso, puede contactarnos a través de:
            </p>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-secondary" />
                admin@borls.com
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-secondary" />
                +57 3245134148
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 text-secondary" />
                BORLS SAS - Cali, Colombia
              </p>
            </div>
          </section>

          <div className="bg-card/50 p-6 border border-border/50 mt-8">
            <p className="text-sm text-muted-foreground text-center">
              Estos Términos de Uso constituyen un acuerdo legal vinculante
              entre usted y BORLS SAS. Al utilizar la plataforma APEX, usted
              acepta estar sujeto a estos términos y condiciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
