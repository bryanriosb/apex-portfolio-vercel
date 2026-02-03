# Sistema de Roles y Permisos

Este documento describe el sistema de roles y permisos implementado en la aplicación.

## Roles Disponibles

### 1. Company Admin (`company_admin`)
**Usuario administrador de la empresa**

- Tiene acceso completo a todas las funcionalidades
- Puede crear, editar y eliminar negocios/salones
- Puede gestionar usuarios de la empresa
- Tiene acceso a configuración global
- **Acceso exclusivo a:**
  - Módulo de Negocios (`/admin/businesses`)

**Enlaces del sidebar:**
- Dashboard
- Citas
- **Negocios** (exclusivo)
- Servicios
- Especialistas
- Clientes
- Reportes
- Configuración

### 2. Business Admin (`business_admin`)
**Administrador de un negocio/salón específico**

- Gestiona un negocio específico
- Puede gestionar empleados de su negocio
- Puede gestionar servicios y citas
- **NO puede:**
  - Ver o gestionar otros negocios
  - Crear nuevos negocios
  - Acceder a configuración global

**Enlaces del sidebar:**
- Dashboard
- Citas
- Servicios
- Especialistas
- Clientes
- Reportes
- Configuración (de su negocio)

### 3. Employee (`employee`)
**Empleado/Especialista**

- Solo puede ver sus propias citas
- Puede gestionar su perfil personal
- Acceso limitado a la información

### 4. Customer (`customer`)
**Cliente**

- Puede reservar citas
- Puede ver sus propias reservas
- Acceso solo a funcionalidades de cliente

## Configuración en Base de Datos

La tabla `users_profile` debe tener los siguientes campos:

```sql
CREATE TABLE users_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'customer',
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos importantes:**
- `role`: El rol del usuario (`company_admin`, `business_admin`, `employee`, `customer`)
- `business_id`: Para `business_admin`, el ID del negocio que administra

## Uso en el Código

### 1. Obtener el usuario actual

```typescript
import { useCurrentUser } from '@/hooks/use-current-user'

function MyComponent() {
  const { user, role, businessId, isLoading, isAuthenticated } = useCurrentUser()

  // user contiene: id, email, name, role, business_id
  // role contiene: el rol del usuario
  // businessId contiene: el ID del negocio (si aplica)
}
```

### 2. Verificar permisos

```typescript
import { hasPermission, USER_ROLES } from '@/const/roles'

// Verificar si el usuario tiene un permiso específico
if (hasPermission(user.role, 'canManageBusinesses')) {
  // Usuario puede gestionar negocios
}
```

### 3. Controlar acceso a rutas

```typescript
import { canAccessRoute, USER_ROLES } from '@/const/roles'

// Verificar si el usuario puede acceder a una ruta
if (canAccessRoute(user.role, 'businesses')) {
  // Usuario puede acceder al módulo de negocios
}
```

### 4. Agregar nuevos enlaces al sidebar

Edita `/const/sidebar-menu.ts`:

```typescript
export const SIDE_APP_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Nuevo Módulo',
    url: '/admin/nuevo-modulo',
    icon: MiIcono,
    allowedRoles: [USER_ROLES.COMPANY_ADMIN], // Solo para company admin
  },
]
```

## Crear un Usuario Company Admin

Para crear un usuario administrador de empresa en Supabase:

```sql
-- 1. Crear el usuario en auth.users (a través de Supabase Auth)
-- 2. Insertar el perfil con rol company_admin
INSERT INTO users_profile (user_id, role)
VALUES ('user-uuid-aqui', 'company_admin');
```

O usando la función `createAdminAccount`:

```typescript
import { createAdminAccount } from '@/lib/services/auth/supabase-auth'

const result = await createAdminAccount(
  'admin@example.com',
  'password123',
  'Admin Name'
)

// Luego actualizar el rol en users_profile
```

## Seguridad

- Los roles se verifican en el servidor durante la autenticación
- El sidebar solo muestra enlaces permitidos según el rol
- **Importante**: Implementar middleware o verificación en las rutas del servidor para proteger endpoints sensibles
