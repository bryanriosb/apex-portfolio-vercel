import { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  Cookie,
  Shield,
  Settings,
  Info,
  Mail,
  Phone,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Cookies | APEX - Plataforma para Negocios de Belleza',
  description:
    'Política de cookies y tecnologías similares de APEX, conforme a la normativa colombiana y europea.',
  robots: 'index, follow',
}

export default function PoliticaCookies() {
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
            <h1 className="text-3xl font-bold mb-2">Política de Cookies</h1>
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
              Esta Política de Cookies explica cómo BORLS SAS, propietaria de la
              plataforma APEX, utiliza cookies y tecnologías similares en
              nuestro sitio web y plataforma digital. Nuestro objetivo es ser
              transparentes sobre cómo recopilamos información para mejorar su
              experiencia.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Cookie className="h-6 w-6 text-secondary" />
              ¿Qué son las Cookies?
            </h2>
            <p className="text-muted-foreground mb-4">
              Las cookies son pequeños archivos de texto que se almacenan en su
              dispositivo (computadora, teléfono móvil, tablet) cuando visita
              nuestro sitio web. Contienen información que nos permite reconocer
              su dispositivo y recordar ciertas preferencias cuando navega por
              nuestra plataforma.
            </p>
            <p className="text-muted-foreground">
              Las cookies son ampliamente utilizadas en internet y facilitan una
              experiencia de usuario más eficiente y personalizada. En APEX,
              utilizamos cookies tanto propias como de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Tipos de Cookies que Utilizamos
            </h2>
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <h3 className="text-xl font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Cookies Esenciales (Necesarias)
                </h3>
                <p className="text-muted-foreground mb-3">
                  Estas cookies son fundamentales para el funcionamiento de
                  nuestro sitio web y no pueden ser desactivadas en nuestros
                  sistemas. Generalmente se configuran en respuesta a acciones
                  realizadas por usted, como configurar sus preferencias de
                  privacidad, iniciar sesión o completar formularios.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Autenticación de usuarios</li>
                  <li>Mantenimiento de la sesión de inicio de sesión</li>
                  <li>Procesamiento de carritos de compra</li>
                  <li>Seguridad del sitio web</li>
                  <li>Carga balanceada</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-xl font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Cookies de Rendimiento
                </h3>
                <p className="text-muted-foreground mb-3">
                  Estas cookies nos permiten contar las visitas y fuentes de
                  tráfico para poder medir y mejorar el rendimiento de nuestro
                  sitio. Nos ayudan a saber qué páginas son las más y menos
                  populares y ver cómo los visitantes se mueven por el sitio.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Google Analytics</li>
                  <li>Métricas de uso de la plataforma</li>
                  <li>Tiempo de permanencia en páginas</li>
                  <li>Tasa de rebote</li>
                  <li>Rutas de navegación de usuarios</li>
                </ul>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <h3 className="text-xl font-medium mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-purple-600" />
                  Cookies de Funcionalidad
                </h3>
                <p className="text-muted-foreground mb-3">
                  Estas cookies permiten que el sitio web recuerde las
                  elecciones que usted hace para proporcionar una funcionalidad
                  más personalizada. Almacenan sus preferencias para que su
                  experiencia sea más eficiente y cómoda.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Idioma preferido</li>
                  <li>Recordar nombre de usuario</li>
                  <li>Preferencias de visualización</li>
                  <li>Configuración regional</li>
                  <li>Personalización del dashboard</li>
                </ul>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                <h3 className="text-xl font-medium mb-3 flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-orange-600" />
                  Cookies de Marketing (con consentimiento)
                </h3>
                <p className="text-muted-foreground mb-3">
                  Estas cookies se utilizan para mostrarle anuncios relevantes
                  para usted y sus intereses. También se utilizan para limitar
                  el número de veces que ve un anuncio y ayudar a medir la
                  efectividad de las campañas publicitarias. Solo se utilizan
                  con su consentimiento explícito.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Facebook Pixel</li>
                  <li>Google Ads</li>
                  <li>LinkedIn Insight Tag</li>
                  <li>Remarketing personalizado</li>
                  <li>Análisis de conversión</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Cookies de Terceros Utilizados
            </h2>
            <div className="space-y-4">
              <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                <h3 className="font-medium mb-2">Google Analytics</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Propósito:</strong> Análisis de tráfico y
                  comportamiento del usuario
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Duración:</strong> 2 años (excepto _ga que dura 2 años
                  y _gid que dura 24 horas)
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Política de privacidad:</strong>
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline ml-1"
                  >
                    Google Privacy Policy
                  </a>
                </p>
              </div>

              <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                <h3 className="font-medium mb-2">Stripe</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Propósito:</strong> Procesamiento seguro de pagos en
                  línea
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Duración:</strong> Sesión y hasta 1 año para cookies
                  de seguimiento de fraude
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Política de privacidad:</strong>
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline ml-1"
                  >
                    Stripe Privacy Policy
                  </a>
                </p>
              </div>

              <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                <h3 className="font-medium mb-2">Mercado Pago</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Propósito:</strong> Procesamiento de pagos en
                  Latinoamérica
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Duración:</strong> Variable según configuración del
                  usuario
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Política de privacidad:</strong>
                  <a
                    href="https://www.mercadopago.com.co/ayuda/privacidad_2509"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline ml-1"
                  >
                    Mercado Pago Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Gestión de Cookies</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">Consentimiento</h3>
                <p className="text-muted-foreground">
                  Cuando visita nuestro sitio web por primera vez, mostraremos
                  un banner de cookies donde puede aceptar o rechazar las
                  cookies no esenciales. Las cookies esenciales siempre están
                  activadas ya que son necesarias para el funcionamiento del
                  sitio.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">
                  Configuración en su Navegador
                </h3>
                <p className="text-muted-foreground mb-2">
                  Puede configurar su navegador para rechazar o eliminar
                  cookies:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  <li>
                    <strong>Chrome:</strong> Configuración → Privacidad y
                    seguridad → Cookies y otros datos del sitio
                  </li>
                  <li>
                    <strong>Firefox:</strong> Opciones → Privacidad y seguridad
                    → Cookies y datos del sitio
                  </li>
                  <li>
                    <strong>Safari:</strong> Preferencias → Privacidad → Cookies
                    y datos del sitio web
                  </li>
                  <li>
                    <strong>Edge:</strong> Configuración → Privacidad, búsqueda
                    y servicios → Cookies
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <h3 className="font-medium mb-2 text-yellow-800 dark:text-yellow-200">
                  Nota Importante
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Si deshabilita todas las cookies, algunas funcionalidades de
                  nuestro sitio web podrían no estar disponibles, lo que podría
                  afectar su experiencia de uso de la plataforma APEX.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Actualizaciones de esta Política
            </h2>
            <p className="text-muted-foreground mb-4">
              Podemos actualizar esta Política de Cookies periódicamente para
              reflejar cambios en nuestras prácticas, tecnologías o requisitos
              legales. Las modificaciones se publicarán en esta página con una
              fecha de actualización.
            </p>
            <p className="text-muted-foreground">
              Los cambios significativos serán notificados a través de nuestros
              canales de comunicación habituales o mediante un aviso prominente
              en nuestro sitio web. Le recomendamos revisar esta política
              regularmente para estar informado sobre nuestras prácticas de
              cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Cumplimiento Normativo
            </h2>
            <p className="text-muted-foreground mb-4">
              Nuestra política de cookies cumple con:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
              <li>
                <strong>Ley 1581 de 2012 (Colombia):</strong> Protección de
                datos personales
              </li>
              <li>
                <strong>Decreto 1377 de 2013 (Colombia):</strong> Reglamentación
                de datos personales
              </li>
              <li>
                <strong>RGPD (UE):</strong> Reglamento General de Protección de
                Datos
              </li>
              <li>
                <strong>CCPA (California):</strong> California Consumer Privacy
                Act
              </li>
              <li>
                <strong>LGDPA (Brasil):</strong> Lei Geral de Proteção de Dados
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contacto</h2>
            <p className="text-muted-foreground mb-4">
              Si tiene alguna pregunta sobre nuestra Política de Cookies o sobre
              cómo utilizamos las cookies en APEX, no dude en contactarnos:
            </p>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-secondary" />
                <strong>Correo electrónico:</strong> admin@borls.com
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-secondary" />
                <strong>Correo alternativo:</strong> admin@borls.com
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-secondary" />
                <strong>Teléfono:</strong> +57 3245134148
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Cookie className="h-4 w-4 text-secondary" />
                <strong>Responsable de Protección de Datos:</strong>{' '}
                admin@borls.com
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Enlaces Relacionados
            </h2>
            <div className="space-y-2">
              <p>
                <Link
                  href="/privacidad"
                  className="text-secondary hover:underline"
                >
                  → Política de Privacidad
                </Link>
              </p>
              <p>
                <Link
                  href="/terminos"
                  className="text-secondary hover:underline"
                >
                  → Términos de Uso
                </Link>
              </p>
            </div>
          </section>

          <div className="bg-card/50 rounded-2xl p-6 border border-border/50 mt-8">
            <p className="text-sm text-muted-foreground text-center">
              Esta Política de Cookies constituye un acuerdo legal entre usted y
              BORLS SAS. Al continuar utilizando la plataforma APEX, usted
              acepta el uso de cookies conforme a esta política.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
