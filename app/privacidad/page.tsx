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
    'Política de Privacidad | APEX (Adaptive Planning & Execution Platform)',
  description:
    'Política de privacidad y protección de datos personales de APEX, conforme a la Ley 1581 de 2012 de Colombia.',
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
            <p className="text-base text-muted-foreground">
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
          {/* Compromiso de Privacidad Destacado */}
          <div className="bg-secondary/10 p-8 border-2 border-secondary/30">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-secondary" />
              <h2 className="text-xl font-bold">
                Nuestro Compromiso de Privacidad Absoluta
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground mb-6">
              En BORLS SAS, propietaria de la plataforma APEX (Adaptive Planning
              & Execution Platform), su privacidad y la de sus clientes es
              nuestra prioridad fundamental. Operamos bajo los más altos
              estándares de protección de datos conforme a la legislación
              colombiana vigente.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-background/50 p-4 border border-border/50">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-secondary" />
                  Sus Datos son Suyos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Usted mantiene la propiedad exclusiva de toda la información
                  que almacena en APEX. Nosotros solo actuamos como encargados
                  del tratamiento, proporcionando infraestructura segura.
                </p>
              </div>
              <div className="bg-background/50 p-4 border border-border/50">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-secondary" />
                  NUNCA Compartimos
                </h3>
                <p className="text-sm text-muted-foreground">
                  No vendemos, comercializamos ni compartimos sus datos ni los
                  de sus clientes con terceros. Su información permanece
                  estrictamente confidencial.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/50 p-8 border border-border/50">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Esta Política de Privacidad describe de manera transparente cómo
              recopilamos, usamos, almacenamos y protegemos sus datos
              personales, en cumplimiento de la Ley 1581 de 2012, el Decreto
              1377 de 2013, el Decreto 886 de 2014 y demás normas concordantes
              de la República de Colombia.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              1. Identificación del Responsable del Tratamiento
            </h2>
            <div className="bg-card/30 p-6 border border-border/30">
              <p className="text-base text-muted-foreground mb-2">
                <strong>Razón Social:</strong> BORLS SAS
              </p>
              <p className="text-base text-muted-foreground mb-2">
                <strong>NIT:</strong> 901986258
              </p>
              <p className="text-base text-muted-foreground mb-2">
                <strong>Dirección:</strong> Cali, Valle del Cauca, Colombia
              </p>
              <p className="text-base text-muted-foreground mb-2">
                <strong>Correo electrónico:</strong> admin@borls.com
              </p>
              <p className="text-base text-muted-foreground">
                <strong>Teléfono:</strong> +57 3245134148
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. Datos Personales Recopilados
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-secondary" />
                  2.1. Datos del Usuario Titular (Responsable del Tratamiento)
                </h3>
                <p className="text-base text-muted-foreground mb-2 ml-6">
                  Datos personales que usted proporciona directamente al
                  registrarse y usar APEX:
                </p>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>Nombre completo y razón social</li>
                  <li>Número de identificación (cédula, NIT, pasaporte)</li>
                  <li>
                    Información de contacto (teléfono, correo electrónico)
                  </li>
                  <li>Dirección física y/o digital</li>
                  <li>Datos de facturación y pagos</li>
                  <li>Fotografía de perfil (opcional)</li>
                  <li>Credenciales de acceso (encriptadas)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-secondary" />
                  2.2. Datos de Terceros (Clientes de su Negocio)
                </h3>
                <p className="text-base text-muted-foreground mb-2 ml-6">
                  <strong>IMPORTANTE:</strong> Usted es el responsable del
                  tratamiento de los datos de sus clientes finales. BORLS actúa
                  únicamente como encargado del tratamiento, proporcionando
                  infraestructura tecnológica segura. Los datos que usted
                  almacena pueden incluir:
                </p>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>Nombres y datos de contacto de sus clientes</li>
                  <li>Historial de comunicaciones y transacciones</li>
                  <li>Documentos adjuntos relacionados con sus servicios</li>
                  <li>Información comercial y contractual</li>
                </ul>
                <p className="text-base text-muted-foreground mt-2 ml-6 italic">
                  Nota: BORLS no accede ni utiliza estos datos para ningún fin
                  comercial propio.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-secondary" />
                  2.3. Datos Técnicos y de Uso
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>Dirección IP y datos de conexión (seguridad)</li>
                  <li>Tipo de dispositivo, navegador y sistema operativo</li>
                  <li>Registros de uso de la plataforma (logs técnicos)</li>
                  <li>Cookies y tecnologías similares (ver sección 6)</li>
                  <li>Interacciones con soporte técnico</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Finalidades del Tratamiento
            </h2>
            <div className="space-y-4">
              <div className="bg-secondary/5 p-4 border border-secondary/20">
                <h3 className="text-base font-medium mb-2">
                  3.1. Finalidades Esenciales (Sin las cuales no podemos prestar
                  el servicio)
                </h3>
                <p className="text-base text-muted-foreground mb-2">
                  Necesarias para la ejecución del contrato de servicios:
                </p>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>Creación y gestión de su cuenta en la plataforma</li>
                  <li>Prestación de los servicios de software contratados</li>
                  <li>
                    Procesamiento de pagos y emisión de facturas electrónicas
                  </li>
                  <li>Soporte técnico y atención al cliente</li>
                  <li>Seguridad de la plataforma y prevención de fraudes</li>
                  <li>Cumplimiento de obligaciones legales y regulatorias</li>
                </ul>
              </div>

              <div className="bg-accent/5 p-4 border border-accent/20">
                <h3 className="text-base font-medium mb-2">
                  3.2. Finalidades Secundarias (Requieren su autorización
                  previa)
                </h3>
                <p className="text-base text-muted-foreground mb-2">
                  Podremos tratar sus datos para estas finalidades solo con su
                  consentimiento explícito:
                </p>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>
                    Envío de comunicaciones comerciales sobre nuevos productos o
                    servicios
                  </li>
                  <li>Invitaciones a eventos, webinars o capacitaciones</li>
                  <li>Encuestas de satisfacción y estudios de mercado</li>
                  <li>Investigación y desarrollo de nuevas funcionalidades</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2 ml-6">
                  <strong>Nota:</strong> Puede revocar su autorización en
                  cualquier momento contactando a admin@borls.com
                </p>
              </div>

              <div className="bg-card/30 p-4 border border-border/30">
                <h3 className="text-base font-medium mb-2">
                  3.3. Datos de Terceros (Sus Clientes)
                </h3>
                <p className="text-base text-muted-foreground">
                  Los datos de sus clientes finales son almacenados
                  exclusivamente para que usted pueda prestar sus propios
                  servicios. BORLS no utiliza estos datos para ningún fin
                  comercial, de marketing o analítico propio. Su función se
                  limita a proporcionar infraestructura tecnológica segura
                  conforme a lo dispuesto en el artículo 25 de la Ley 1581 de
                  2012 (encargados del tratamiento).
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              4. Derechos de los Titulares
            </h2>
            <p className="text-base text-muted-foreground mb-4">
              Conforme a los artículos 8 y 9 de la Ley 1581 de 2012, usted tiene
              los siguientes derechos sobre sus datos personales:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card/30 p-4 border border-border/30">
                <h3 className="text-base font-medium mb-2">
                  Derechos de Acceso y Control
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>Conocer sus datos personales objeto de tratamiento</li>
                  <li>
                    Acceder gratuitamente a sus datos al menos una vez por mes
                  </li>
                  <li>Solicitar prueba de la autorización otorgada</li>
                  <li>Ser informado sobre el uso de sus datos</li>
                  <li>
                    Revocar la autorización cuando no exista obligación legal
                  </li>
                </ul>
              </div>
              <div className="bg-card/30 p-4 border border-border/30">
                <h3 className="text-base font-medium mb-2">
                  Derechos de Corrección y Supresión
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>
                    Solicitar actualización o corrección de datos inexactos
                  </li>
                  <li>Solicitar supresión cuando no sean pertinentes</li>
                  <li>
                    Solicitar supresión cuando haya incumplido la política
                  </li>
                  <li>Oponerse al tratamiento para fines específicos</li>
                  <li>
                    Solicitar portabilidad de datos en formato estructurado
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Procedimiento:</strong> Para ejercer estos derechos,
                envíe su solicitud a admin@borls.com con su identificación
                completa y descripción clara de su petición. Responderemos en un
                término máximo de quince (15) días hábiles conforme al artículo
                16 del Decreto 1377 de 2013.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Medidas de Seguridad Implementadas
            </h2>
            <p className="text-base text-muted-foreground mb-4">
              Conforme a lo dispuesto en el artículo 17 de la Ley 1581 de 2012 y
              el Decreto 886 de 2014, hemos implementado las siguientes medidas
              de seguridad para garantizar la confidencialidad, integridad y
              disponibilidad de sus datos:
            </p>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-medium mb-2 text-green-800 dark:text-green-200">
                  Medidas Técnicas
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>
                    Cifrado AES-256 para datos en reposo y TLS 1.3 para datos en
                    tránsito
                  </li>
                  <li>
                    Aislamiento de datos por tenant (cada usuario en su propio
                    espacio seguro)
                  </li>
                  <li>
                    Firewalls de última generación y sistemas de detección de
                    intrusos (IDS/IPS)
                  </li>
                  <li>
                    Autenticación de múltiples factores (MFA) y control de
                    acceso basado en roles (RBAC)
                  </li>
                  <li>
                    Logs de auditoría inmutables para todas las operaciones
                    críticas
                  </li>
                  <li>
                    Copias de seguridad automatizadas con redundancia geográfica
                  </li>
                  <li>
                    Infraestructura en centros de datos certificados (ISO 27001,
                    SOC 2)
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
                  Medidas Administrativas
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>
                    Política de seguridad de la información documentada y
                    revisada anualmente
                  </li>
                  <li>
                    Programa de capacitación en protección de datos para todo el
                    personal
                  </li>
                  <li>
                    Acuerdos de confidencialidad y no divulgación con empleados
                    y contratistas
                  </li>
                  <li>
                    Procedimientos documentados de respuesta a incidentes de
                    seguridad
                  </li>
                  <li>
                    Auditorías internas y externas periódicas de seguridad
                  </li>
                  <li>Clasificación de datos según su nivel de sensibilidad</li>
                </ul>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 p-4 border border-purple-200 dark:border-purple-800">
                <h3 className="font-medium mb-2 text-purple-800 dark:text-purple-200">
                  Medidas Físicas
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>
                    Control de acceso físico a servidores mediante biometría
                  </li>
                  <li>Videovigilancia 24/7 en centros de datos</li>
                  <li>
                    Sistemas de extinción de incendios y protección contra
                    desastres naturales
                  </li>
                  <li>Suministro eléctrico redundante con UPS y generadores</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              6. Cookies y Tecnologías Similares
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">
                  ¿Qué son las Cookies?
                </h3>
                <p className="text-base text-muted-foreground">
                  Las cookies son pequeños archivos de texto que se almacenan en
                  su dispositivo cuando visita nuestro sitio web. Utilizamos
                  cookies para mejorar su experiencia y analizar el uso de
                  nuestra plataforma.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">
                  Tipos de Cookies Utilizadas
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
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
                <h3 className="text-base font-medium mb-2">
                  Gestión de Cookies
                </h3>
                <p className="text-base text-muted-foreground">
                  Puede configurar su navegador para rechazar cookies o eliminar
                  las cookies existentes. Sin embargo, algunas funcionalidades
                  de la plataforma podrían no estar disponibles sin cookies
                  esenciales.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Transferencia Internacional
            </h2>
            <p className="text-base text-muted-foreground mb-4">
              APEX utiliza proveedores de servicios tecnológicos que pueden
              tener servidores ubicados fuera de Colombia. Todas las
              transferencias internacionales de datos se realizan conforme a lo
              establecido en el Capítulo V de la Ley 1581 de 2012.
            </p>
            <p className="text-base text-muted-foreground">
              Nos aseguramos de que nuestros proveedores cumplan con estándares
              equivalentes o superiores a los requeridos por la legislación
              colombiana, incluido el cumplimiento del RGPD europeo cuando
              corresponda.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              8. Conservación y Eliminación de Datos
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">
                  8.1. Periodos de Conservación
                </h3>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6">
                  <li>
                    Datos de cuenta activa: Mientras el usuario mantenga la
                    relación comercial activa
                  </li>
                  <li>
                    Datos financieros y de facturación: 10 años (obligación
                    fiscal conforme al Código Tributario colombiano)
                  </li>
                  <li>
                    Datos de soporte técnico: 2 años desde la última interacción
                  </li>
                  <li>
                    Datos de marketing: Hasta la revocación del consentimiento o
                    por 5 años máximo
                  </li>
                  <li>
                    Datos analíticos agregados: 26 meses (sin identificación
                    personal)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">
                  8.2. Criterios para Conservación
                </h3>
                <p className="text-base text-muted-foreground">
                  Los datos personales se conservarán únicamente por el tiempo
                  necesario para cumplir con las finalidades para las cuales
                  fueron recopilados, respetando los plazos establecidos por ley
                  y las obligaciones contractuales. Una vez cumplida la
                  finalidad y los términos legales, los datos serán eliminados o
                  anonimizados.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-800">
                <h3 className="text-xl font-medium mb-2 text-red-800 dark:text-red-200">
                  8.3. Garantía de Eliminación Completa
                </h3>
                <p className="text-muted-foreground mb-3">
                  Al cancelar su cuenta, garantizamos la eliminación completa de
                  sus datos conforme al siguiente procedimiento:
                </p>
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground ml-6 mb-3">
                  <li>
                    Período de gracia de 30 días para exportar sus datos si lo
                    desea
                  </li>
                  <li>
                    Eliminación de datos de servidores activos dentro de los 30
                    días siguientes
                  </li>
                  <li>
                    Eliminación de copias de seguridad según ciclos de retención
                    (máximo 90 días adicionales)
                  </li>
                  <li>
                    Emisión de certificado de eliminación previa solicitud
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground italic">
                  Nota: Algunos datos podrían conservarse por obligación legal
                  (ej. facturación) durante el tiempo exigido por la normativa
                  colombiana.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Menores de Edad</h2>
            <p className="text-base text-muted-foreground mb-4">
              BORLS no recopila intencionalmente información personal de menores
              de 18 años. Nuestros servicios están dirigidos exclusivamente a
              personas mayores de edad con capacidad jurídica para contratar
              servicios conforme al Código Civil Colombiano.
            </p>
            <p className="text-base text-muted-foreground">
              Si tenemos conocimiento de que hemos recopilado información
              personal de un menor sin el consentimiento parental apropiado,
              tomaremos medidas inmediatas para eliminar dicha información y dar
              de baja la cuenta asociada. Si usted tiene conocimiento de que un
              menor ha proporcionado datos personales, por favor contáctenos en
              admin@borls.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              10. Cambios a esta Política
            </h2>
            <p className="text-base text-muted-foreground mb-4">
              BORLS podrá actualizar esta Política de Privacidad periódicamente
              para reflejar cambios en nuestras prácticas, tecnologías o
              requisitos legales, siempre en cumplimiento de la normativa
              colombiana vigente.
            </p>
            <p className="text-base text-muted-foreground mb-4">
              Las modificaciones significativas serán notificadas a los usuarios
              con al menos 15 días calendario de antelación mediante correo
              electrónico y notificación en la plataforma, conforme al artículo
              16 del Decreto 1377 de 2013.
            </p>
            <p className="text-base text-muted-foreground">
              El uso continuado de la plataforma después de dichas
              modificaciones constituirá aceptación de los cambios. Si no está
              de acuerdo con las modificaciones, podrá terminar su relación con
              nosotros según lo establecido en los Términos de Uso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              11. Contacto y Canales de Atención
            </h2>
            <p className="text-base text-muted-foreground mb-4">
              Para ejercer sus derechos de protección de datos, presentar
              reclamaciones, consultas o sugerencias relacionadas con esta
              política, puede contactarnos a través de los siguientes canales:
            </p>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-secondary" />
                <strong>Correo electrónico:</strong> admin@borls.com
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-secondary" />
                <strong>Teléfono:</strong> +57 3245134148
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 text-secondary" />
                <strong>Dirección:</strong> Cali, Valle del Cauca, Colombia
              </p>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Procedimiento de reclamación:</strong> Para presentar
                una queja relacionada con protección de datos personales ante
                BORLS, envíe su solicitud a admin@borls.com incluyendo: (1)
                Identificación completa del titular, (2) Descripción clara de
                los hechos, (3) Petición específica, y (4) Documentos soporte si
                los hay. Responderemos en un término máximo de quince (15) días
                hábiles conforme al artículo 16 del Decreto 1377 de 2013.
              </p>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Superintendencia de Industria y Comercio:</strong> Si
                considera que sus derechos han sido vulnerados, puede presentar
                una queja ante la autoridad de protección de datos de Colombia
                en www.sic.gov.co o en la Carrera 13 No. 27-00, Pisos 1, 3, 4, 5
                y 19, Bogotá D.C.
              </p>
            </div>
          </section>

          <div className="bg-card/50 p-6 border border-border/50 mt-8">
            <p className="text-sm text-muted-foreground text-center">
              Esta Política de Privacidad complementa nuestros Términos de Uso y
              constituye un acuerdo legal vinculante entre usted y BORLS SAS. Al
              utilizar la plataforma APEX, usted reconoce haber leído, entendido
              y aceptado estas políticas en conformidad con la Ley 1581 de 2012
              y normas concordantes de la República de Colombia.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
