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
          <div className="bg-card/50 rounded-2xl p-8 border border-border/50">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Estos Términos de Uso (en adelante, los "Términos") regulan el
              acceso y uso de la plataforma Beluvio (en adelante, la
              "Plataforma"), propiedad de BORLS, una empresa especializada en
              soluciones tecnológicas para el sector de belleza y salud.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Aceptación de los Términos
            </h2>
            <p className="text-muted-foreground mb-4">
              El acceso y uso de la plataforma Beluvio implica la aceptación
              completa e incondicional de estos Términos. Si no está de acuerdo
              con estos términos, no deberá utilizar la plataforma.
            </p>
            <p className="text-muted-foreground">
              Beluvio se reserva el derecho de modificar estos Términos en
              cualquier momento. Las modificaciones serán efectivas desde su
              publicación en la plataforma y se notificarán a los usuarios
              mediante los mecanismos que Beluvio considere apropiados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Descripción del Servicio
            </h2>
            <p className="text-muted-foreground mb-4">
              Beluvio es una plataforma tecnológica diseñada específicamente
              para la gestión integral de negocios en el sector de belleza y
              salud, incluyendo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-6">
              <li>Gestión de citas y agenda inteligente</li>
              <li>Administración de clientes y base de datos</li>
              <li>Control de inventario y productos</li>
              <li>Gestión de especialistas y comisiones</li>
              <li>Reportes y análisis de negocio</li>
              <li>Integración con WhatsApp y herramientas de comunicación</li>
              <li>
                Asistente inteligente con capacidades de gestión telefónica
              </li>
              <li>Facturación y gestión financiera</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Responsabilidades del Usuario
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">
                  3.1. Información Veraz
                </h3>
                <p className="text-muted-foreground">
                  El usuario se compromete a proporcionar información veraz,
                  completa y actualizada en todo momento. Beluvio no se
                  responsabiliza por la veracidad de la información
                  proporcionada por los usuarios.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">3.2. Uso Apropiado</h3>
                <p className="text-muted-foreground">
                  El usuario se obliga a utilizar la plataforma de manera
                  lícita, respetuosa y conforme a la normativa vigente,
                  incluyendo la Ley 1581 de 2012 (Habeas Data) y la Ley 1273 de
                  2009 (Delitos informáticos).
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">
                  3.3. Seguridad de la Cuenta
                </h3>
                <p className="text-muted-foreground">
                  El usuario es responsable de mantener la confidencialidad de
                  sus credenciales de acceso y de cualquier actividad que ocurra
                  bajo su cuenta. Beluvio no se hace responsable por el acceso
                  no autorizado resultante de negligencia del usuario.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Propiedad Intelectual
            </h2>
            <p className="text-muted-foreground mb-4">
              Todos los derechos de propiedad intelectual sobre la plataforma
              Beluvio, incluyendo software, diseño, contenido, bases de datos y
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
            <h2 className="text-2xl font-semibold mb-4">
              5. Protección de Datos Personales
            </h2>
            <p className="text-muted-foreground mb-4">
              Beluvio se compromete a proteger los datos personales de sus
              usuarios conforme a la Ley 1581 de 2012 y sus decretos
              reglamentarios. El tratamiento de datos personales se regirá por
              nuestra Política de Privacidad, que forma parte integrante de
              estos Términos.
            </p>
            <p className="text-muted-foreground">
              El usuario autoriza expresamente el tratamiento de sus datos
              personales para las finalidades descritas en la Política de
              Privacidad, incluyendo la prestación del servicio, mejoramiento
              continuo y comunicación comercial.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Pagos y Suscripciones
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">
                  6.1. Planes y Precios
                </h3>
                <p className="text-muted-foreground">
                  Los planes de suscripción y precios están disponibles en la
                  sección de precios de la plataforma. Beluvio se reserva el
                  derecho de modificar los precios en cualquier momento, previa
                  notificación a los usuarios con al menos 30 días de
                  antelación.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">6.2. Facturación</h3>
                <p className="text-muted-foreground">
                  Los pagos se procesarán a través de pasarelas de pago seguras
                  y debidamente certificadas. Beluvio emitirá facturas
                  electrónicas conforme a la normativa colombiana (Resolución
                  00042 de 2020).
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">6.3. Cancelación</h3>
                <p className="text-muted-foreground">
                  El usuario puede cancelar su suscripción en cualquier momento.
                  La cancelación surtirá efecto al finalizar el período de
                  facturación actual y no generará reembolsos proporcionales.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Limitación de Responsabilidad
            </h2>
            <p className="text-muted-foreground mb-4">
              En la máxima medida permitida por la ley colombiana, Beluvio no
              será responsable por ningún daño indirecto, incidental, especial o
              consecuente que surja del uso o la imposibilidad de uso de la
              plataforma.
            </p>
            <p className="text-muted-foreground mb-4">
              La responsabilidad total de Beluvio, en cualquier caso, no
              excederá el monto pagado por el usuario en los últimos tres (3)
              meses de servicio.
            </p>
            <p className="text-muted-foreground">
              Beluvio no garantiza la disponibilidad ininterrumpida de la
              plataforma, aunque se compromete a mantener los más altos
              estándares de calidad y disponibilidad técnica.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Propiedad de los Datos
            </h2>
            <p className="text-muted-foreground mb-4">
              El usuario mantiene la propiedad de todos los datos que ingresa en
              la plataforma. Beluvio solo obtiene los derechos necesarios para
              prestar el servicio conforme a estos Términos y la Política de
              Privacidad.
            </p>
            <p className="text-muted-foreground">
              En caso de terminación del servicio, Beluvio proporcionará al
              usuario un plazo de 30 días para exportar sus datos. Transcurrido
              este período, los datos serán eliminados permanentemente, salvo
              obligación legal de conservación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Terminación</h2>
            <p className="text-muted-foreground mb-4">
              Beluvio podrá suspender o terminar el acceso a la plataforma en
              caso de incumplimiento de estos Términos, uso fraudulento,
              violación de derechos de propiedad intelectual, o cualquier
              actividad que pueda dañar la plataforma o a otros usuarios.
            </p>
            <p className="text-muted-foreground">
              El usuario puede terminar su relación con Beluvio en cualquier
              momento mediante la cancelación de su suscripción y la eliminación
              de su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Ley Aplicable y Jurisdicción
            </h2>
            <p className="text-muted-foreground mb-4">
              Estos Términos se rigen por las leyes de la República de Colombia.
              Cualquier controversia que surja de estos Términos se resolverá
              mediante los tribunales competentes de Cali, Colombia, salvo que
              las partes acuerden un mecanismo alternativo de solución de
              controversias.
            </p>
            <p className="text-muted-foreground">
              Para efectos interpretationes, se entenderá que cualquier
              referencia a legislación específica corresponde a la normativa
              colombiana vigente al momento de la interpretación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contacto</h2>
            <p className="text-muted-foreground mb-4">
              Para cualquier pregunta, comentario o inquietud sobre estos
              Términos de Uso, puede contactarnos a través de:
            </p>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-secondary" />
                beluvio@borls.com
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-secondary" />
                +57 321 727 8684
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 text-secondary" />
                BORLS SAS - Cali, Colombia
              </p>
            </div>
          </section>

          <div className="bg-card/50 rounded-2xl p-6 border border-border/50 mt-8">
            <p className="text-sm text-muted-foreground text-center">
              Estos Términos de Uso constituyen un acuerdo legal vinculante
              entre usted y BORLS SAS. Al utilizar la plataforma Beluvio, usted
              acepta estar sujeto a estos términos y condiciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
