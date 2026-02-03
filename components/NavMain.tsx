'use client'

import * as React from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/const/roles'

export interface NavSubItem {
  title: string
  url: string
  allowedRoles?: UserRole[]
  targetTutorialStep?: string
}

export interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  badge?: React.ReactNode
  items?: NavSubItem[]
  targetTutorialStep?: string
}

function CollapsedMenuItem({
  item,
  pathname,
  isMobile,
  userRole,
}: {
  item: NavItem
  pathname: string
  isMobile: boolean
  userRole?: UserRole | null
}) {
  const filteredItems = item.items?.filter(
    (subItem) => !subItem.allowedRoles || (userRole && subItem.allowedRoles.includes(userRole))
  )
  const [dropdownOpen, setDropdownOpen] = React.useState(false)

  const hasActiveSubItem =
    item.items?.some(
      (subItem) =>
        pathname === subItem.url ||
        (subItem.url !== '/admin' && pathname.startsWith(subItem.url + '/'))
    ) ?? false

  if (isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu
          modal={false}
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
        >
          <DropdownMenuTrigger
            className={cn(
              'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 h-8',
              hasActiveSubItem &&
              'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            )}
            data-active={hasActiveSubItem}
            data-tutorial={item.targetTutorialStep}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="end"
            sideOffset={4}
            className="min-w-56 rounded-lg"
          >
            {filteredItems?.map((subItem) => (
              <DropdownMenuItem key={subItem.title} asChild>
                <Link href={subItem.url}>{subItem.title}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu
        modal={false}
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
      >
        <TooltipPrimitive.Root
          delayDuration={0}
          open={dropdownOpen ? false : undefined}
        >
          <DropdownMenuTrigger asChild>
            <TooltipPrimitive.Trigger asChild>
              <button
                className={cn(
                  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 h-8',
                  hasActiveSubItem &&
                  'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                )}
                data-active={hasActiveSubItem}
                data-tutorial={item.targetTutorialStep}
              >
                {item.icon && <item.icon />}
                <span className="group-data-[collapsible=icon]:hidden">
                  {item.title}
                </span>
              </button>
            </TooltipPrimitive.Trigger>
          </DropdownMenuTrigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side="right"
              align="center"
              sideOffset={4}
              className={cn(
                'bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance'
              )}
            >
              {item.title}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={4}
          className="min-w-56 rounded-lg"
        >
          {filteredItems?.map((subItem) => (
            <DropdownMenuItem key={subItem.title} asChild>
              <Link href={subItem.url}>{subItem.title}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export function NavMain({
  items,
  label,
  userRole,
}: {
  items: NavItem[]
  label?: string
  userRole?: UserRole | null
}) {
  const pathname = usePathname()
  const { isMobile, open } = useSidebar()
  const isCollapsed = !open

  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className="text-black dark:text-white font-bold">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0

          // Para items con subítems, es activo si alguno de sus subítems está activo
          // Para items sin subítems, es activo si coincide exactamente o es una sub-ruta
          const hasActiveSubItem = item.items?.some(
            (subItem) =>
              pathname === subItem.url ||
              (subItem.url !== '/admin' && pathname.startsWith(subItem.url + '/'))
          )

          const isActive = hasSubItems
            ? hasActiveSubItem // Los items con subítems son activos si algún sub-item lo está
            : pathname === item.url ||
            (item.url === '/admin' && (pathname === '/admin/dashboard' || pathname === '/admin')) ||
            (item.url !== '/admin' && pathname.startsWith(item.url + '/'))

          // Sin subítems: renderizar link simple
          if (!hasSubItems) {
            return (
              <SidebarMenuItem
                key={item.title}
                className="text-muted-foreground"
              >
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  data-tutorial={item.targetTutorialStep}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item.badge}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }



          // Con subítems y sidebar colapsado: usar DropdownMenu
          if (isCollapsed) {
            return (
              <CollapsedMenuItem
                key={item.title}
                item={item}
                pathname={pathname}
                isMobile={isMobile}
                userRole={userRole}
              />
            )
          }

          // Con subítems y sidebar expandido: usar Collapsible
          const filteredSubItems = item.items?.filter(
            (subItem) => !subItem.allowedRoles || (userRole && subItem.allowedRoles.includes(userRole))
          )

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive || hasActiveSubItem}
              className="group/collapsible"
            >
              <SidebarMenuItem className="text-muted-foreground">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    data-tutorial={item.targetTutorialStep}
                    isActive={isActive}
                    className="text-muted-foreground data-[active=true]:text-sidebar-accent-foreground"
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {filteredSubItems?.map((subItem) => {
                      const isSubItemActive = pathname === subItem.url
                      return (
                        <SidebarMenuSubItem
                          key={subItem.title}
                          className="!text-muted-foreground"
                        >
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubItemActive}
                            data-tutorial={subItem.targetTutorialStep}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
