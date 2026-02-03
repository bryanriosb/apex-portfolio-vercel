'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
} from 'lucide-react'

const footerLinks = {
  producto: [
    { name: 'Funcionalidades', href: '#features' },
    { name: 'Precios', href: '#pricing' },
  ],
  empresa: [{ name: 'Sobre nosotros', href: '#about' }],
  recursos: [
    { name: 'Centro de ayuda', href: '#' },
    { name: 'Tutoriales', href: '#' },
    { name: 'Webinars', href: '#' },
    { name: 'Comunidad', href: '#' },
  ],
  legal: [
    { name: 'Términos de uso', href: '/terminos' },
    { name: 'Privacidad', href: '/privacidad' },
    { name: 'Cookies', href: '/cookies' },
    // { name: 'Licencias', href: '#' },
  ],
}

const socialLinks = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
]

export function Footer() {
  return (
    <footer className="relative border-t bg-gradient-to-b from-card/50 to-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-6">
              <Image src="/logo.png" alt="Beluvio" width={140} height={40} />
            </Link>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
      La plataforma todo-en-uno para empresas en el sector de la belleza y
      salud, spas, clínicas, centros de estética, salones de belleza,
      entre otros.
            </p>

            {/* Contact info */}
            <div className="space-y-3 text-sm">
              <a
                href="mailto:hola@beluvio.com"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4 text-secondary" />
                beluvio@borls.com
              </a>
              <a
                href="tel:+1234567890"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4 text-secondary" />
                +57 3217278684
              </a>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-secondary" />
                Cali, Colombia
              </p>
            </div>

            {/* Social links */}
            {/* <div className="flex items-center gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/20 flex items-center justify-center transition-colors group"
                >
                  <social.icon className="h-5 w-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                </a>
              ))}
            </div> */}
          </div>

          {/* Link columns */}
          <div>
            <h4 className="font-semibold mb-4">Producto</h4>
            <ul className="space-y-3">
              {footerLinks.producto.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-3">
              {footerLinks.recursos.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        {/* <div className="py-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="font-semibold mb-1">
                Suscribete a nuestro newsletter
              </h4>
              <p className="text-sm text-muted-foreground">
                Tips y novedades para tu negocio
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 md:w-64 px-4 py-2.5 rounded-full bg-muted/50 border border-border/50 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button className="px-6 py-2.5 rounded-full bg-gradient-to-r from-secondary to-accent text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                Suscribirse
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div> */}

        {/* Bottom bar */}
        <div className="py-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Beluvio es solución de{' '}
            <a
              className="underline text-secondary"
              href="https://borls.com"
              target="_blank"
            >
              BORLS
            </a>
            . Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-1">
            <span>Hecho con</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-red-500"
            >
              ♥
            </motion.span>
            <span>en Latinoamérica</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
